// controllers/DeviceController.js
const pool = require('../config/pool');
const crypto = require('crypto');

// Realtime socket (Socket.IO) will be injected via setRealtime
let realtime = null;
let pendingDeviceClaims = null;
exports.setRealtime = (io) => { realtime = io; };
exports.setPendingDeviceClaims = (claims) => { pendingDeviceClaims = claims; };

// Rule-based Inference Engine for Urticaria
function classifyHumidity(humid) {
  if (humid <= 20) return 'Rất khô';
  if (humid <= 40) return 'Khô';
  if (humid <= 60) return 'Bình thường';
  if (humid <= 80) return 'Ẩm';
  return 'Rất ẩm';
}

function diagnose(temp, humid) {
  if (temp < 25 || temp > 40) {
    return {
      status: 'urgent',
      text: `Thiết bị đang đo sai / hỏng cảm biến. Nhiệt độ ${temp}°C nằm ngoài khoảng 25-40°C.`
    };
  }

  const humidityLabel = classifyHumidity(humid);
  const message = `Độ ẩm da: ${humidityLabel} (${humid}%).`;

  if (humid > 80) {
    return {
      status: 'warning',
      text: `${message} Hãy kiểm tra tình trạng da và tình trạng kích ứng.`
    };
  }

  return {
    status: 'normal',
    text: `${message} Tình trạng da ổn định.`
  };
}

exports.nhanDuLieuESP = async (req, res) => {
  let conn = null;
  try {
    conn = await pool.getConnection();
    const { device_tag, deviceTag, device_mac, mac_address, temperature, humidity, mac, temp, hum, t, h, id } = req.body;
    const deviceTagValue = device_tag || deviceTag;
    const macAddress = device_mac || mac_address || mac || id;
    const temperatureRaw = temperature ?? temp ?? t;
    const humidityRaw = humidity ?? hum ?? h;

    if ((!deviceTagValue && !macAddress) || temperatureRaw == null || humidityRaw == null) {
      if (conn) conn.release();
      return res.status(400).json({ error: 'Thiếu deviceTag hoặc mac_address, và thiếu dữ liệu cảm biến.' });
    }

    // 1. Find device by tag or MAC address
    const [[device]] = await conn.query(
      `SELECT id, patient_id, status, mac_address, device_tag FROM devices WHERE device_tag = ? OR mac_address = ? LIMIT 1`,
      [deviceTagValue || '', macAddress || '']
    );

    if (!device) {
      // Nếu chưa có device và có patient đang online đợi tag này, tạo auto-claim
      if (deviceTagValue && pendingDeviceClaims?.has(deviceTagValue)) {
        const { userId } = pendingDeviceClaims.get(deviceTagValue);
        const [[profile]] = await conn.query('SELECT id FROM patient_profiles WHERE user_id = ? LIMIT 1', [userId]);
        if (profile) {
          const newDeviceId = crypto.randomUUID ? crypto.randomUUID() : require('crypto').randomUUID();
          await conn.query(
            'INSERT INTO devices (id, mac_address, device_tag, status, location, patient_id, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
            [newDeviceId, macAddress || deviceTagValue, deviceTagValue, 'active', 'Auto-claimed device', profile.id]
          );
          device = { id: newDeviceId, patient_id: profile.id, status: 'active', mac_address: macAddress || deviceTagValue, device_tag: deviceTagValue };
        }
      }

      if (!device) {
        return res.status(404).json({ error: `Không tìm thấy thiết bị: ${deviceTagValue || macAddress}` });
      }
    }

    if (!device.patient_id && pendingDeviceClaims?.has(deviceTagValue || macAddress)) {
      const claimKey = deviceTagValue || macAddress;
      const { userId } = pendingDeviceClaims.get(claimKey);
      const [[profile]] = await conn.query('SELECT id FROM patient_profiles WHERE user_id = ? LIMIT 1', [userId]);
      if (profile) {
        await conn.query('UPDATE devices SET patient_id = ?, status = ?, device_tag = ?, mac_address = ? WHERE id = ?', [profile.id, 'active', deviceTagValue || device.device_tag, macAddress || device.mac_address, device.id]);
        device.patient_id = profile.id;
        device.mac_address = macAddress || device.mac_address;
        device.device_tag = deviceTagValue || device.device_tag;
      }
    }

    if (!device.patient_id) {
      return res.status(409).json({ error: 'Thiết bị chưa được gán cho bệnh nhân. Vui lòng claim thiết bị trước.' });
    }

    if (deviceTagValue && !device.device_tag) {
      await conn.query('UPDATE devices SET device_tag = ? WHERE id = ?', [deviceTagValue, device.id]);
    }

    const tempVal = parseFloat(temperatureRaw);
    const humidVal = parseFloat(humidityRaw);

    // 2. Perform diagnosis
    const diagnosis = diagnose(tempVal, humidVal);

    // Always insert sensor_logs (patient_id may be null)
    await conn.query(
      `INSERT INTO sensor_logs (device_id, patient_id, temperature, humidity, recorded_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [device.id, device.patient_id || null, tempVal, humidVal]
    );

    // If device assigned to a patient, insert clinical diagnosis and update device status on urgent
    if (device.patient_id) {
      await conn.query(
        `INSERT INTO clinical_diagnoses (id, patient_id, device_id, temperature, humidity, diagnosis_text, status, created_at)
         VALUES (UUID(), ?, ?, ?, ?, ?, ?, NOW())`,
        [device.patient_id, device.id, tempVal, humidVal, diagnosis.text, diagnosis.status]
      );

      if (diagnosis.status === 'urgent') {
        await conn.query("UPDATE devices SET status = 'error' WHERE id = ?", [device.id]);
      }
    }

    // Emit realtime event to connected clients (scoped):
    try {
      const payload = {
        deviceId: device.id,
        macAddress: macAddress,
        temperature: tempVal,
        humidity: humidVal,
        patientId: device.patient_id || null,
        diagnosis: diagnosis,
        saved: !!device.patient_id
      };

      // If device is assigned to a patient, emit only to that patient's user room
      if (device.patient_id) {
        const [[profile]] = await conn.query('SELECT user_id FROM patient_profiles WHERE id = ? LIMIT 1', [device.patient_id]);
        if (profile && profile.user_id) {
          realtime && realtime.to(`user:${profile.user_id}`).emit('sensor-data', payload);
        }
      }

      // Also emit to monitoring room for clinicians/engineers/admins
      realtime && realtime.to('monitor').emit('sensor-data', payload);
    } catch (e) { console.error('[Realtime emit error]', e && e.message ? e.message : e) }

    res.status(200).json({
      status: 'success',
      diagnosis: diagnosis.text,
      clinical_status: diagnosis.status,
      saved: !!device.patient_id
    });

  } catch (err) {
    console.error('[DeviceController]', err && err.message ? err.message : err);
    if (!res.headersSent) res.status(500).json({ error: 'Lỗi server' });
  } finally {
    if (conn) try { conn.release(); } catch(e){}
  }
};
