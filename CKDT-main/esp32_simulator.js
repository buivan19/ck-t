// ============================================================
// esp32_simulator.js — Giả lập thiết bị đeo ESP32
// ============================================================
// Mỗi ESP32 ảo sẽ gửi dữ liệu nhiệt độ và độ ẩm da mỗi 3 giây.
// ============================================================

const API_URL  = 'http://localhost:8000/api';
const DEVICE_KEY = process.env.DEVICE_KEY || 'DEV_KEY_123';
const INTERVAL = 3000; // ms

// Giả lập 1 thiết bị gửi dữ liệu
function simulateDevice(macAddress, patientName) {
  console.log(`[ESP-${macAddress}] Bắt đầu gửi dữ liệu cho bệnh nhân: ${patientName}`);

  let baseTemp = 36.5;
  let baseRoomTemp = 26.0;
  let baseHumid = 65.0;

  const timer = setInterval(async () => {
    // Biến động nhiệt độ từ 36.0°C - 39.0°C (nhiệt độ da)
    baseTemp += (Math.random() * 0.4 - 0.2);
    if (baseTemp < 36.0) baseTemp = 36.0;
    if (baseTemp > 39.0) baseTemp = 39.0;

    // Biến động nhiệt độ phòng từ 22.0°C - 33.0°C
    baseRoomTemp += (Math.random() * 0.6 - 0.3);
    if (baseRoomTemp < 22.0) baseRoomTemp = 22.0;
    if (baseRoomTemp > 33.0) baseRoomTemp = 33.0;

    // Biến động độ ẩm từ 35% - 85%
    baseHumid += (Math.random() * 4 - 2);
    if (baseHumid < 35.0) baseHumid = 35.0;
    if (baseHumid > 85.0) baseHumid = 85.0;

    const payload = {
      device_mac:  macAddress,
      device_tag: macAddress,
      temperature: parseFloat(baseTemp.toFixed(2)),
      room_temperature: parseFloat(baseRoomTemp.toFixed(2)),
      humidity:    parseFloat(baseHumid.toFixed(2)),
    };

    try {
      const res = await fetch(`${API_URL}/du-lieu-esp`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'x-device-key': DEVICE_KEY },
        body:    JSON.stringify(payload),
      });
      const data = await res.json(); 
      console.log(
        `[ESP-${macAddress}] Nhiệt độ da: ${payload.temperature}°C | ` +
        `Nhiệt độ phòng: ${payload.room_temperature}°C | Độ ẩm: ${payload.humidity}% | ` +
        `Chẩn đoán: ${data.diagnosis || 'Không rõ'}`
      );
    } catch (err) {
      console.error(`[ESP-${macAddress}] ❌ Không kết nối được server!`);
    }
  }, INTERVAL);

  return timer;
}

// Lấy danh sách phiên giám sát đang kích hoạt
async function fetchActiveSessions() {
  try {
    const res  = await fetch(`${API_URL}/sessions`, {
      headers: {
        // Sử dụng token giả lập hoặc bypass auth cho endpoint API public của ESP32.
        // Endpoint /du-lieu-esp là endpoint không yêu cầu Auth.
        // Nhưng Endpoint /sessions thì có yêu cầu. Để đơn giản cho simulator,
        // chúng ta sẽ bypass auth hoặc tạo một tài khoản và lấy token.
        // Ở đây, trong server.js, /api/sessions yêu cầu requireAuth.
        // Chúng ta sẽ đăng nhập tài khoản Bác sĩ trước để lấy token!
      }
    });
    // Để lấy được sessions, simulator cần login trước:
    return [];
  } catch {
    return [];
  }
}

// Hàm chạy giả lập chính
async function main() {
  console.log('🚀 ESP32 Urticaria Simulator khởi động...\n');

  let token = '';
  try {
    // Đăng nhập tài khoản bác sĩ để lấy danh sách thiết bị
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'bacsi@hospital.com', password: '123456' })
    });
    const loginData = await loginRes.json();
    token = loginData.token;
  } catch (err) {
    console.error('❌ Không thể kết nối hoặc đăng nhập vào server backend.');
    console.log('Vui lòng khởi động Backend Server trước.\n');
    process.exit(1);
  }

  // Fetch active sessions
  let sessions = [];
  try {
    const res = await fetch(`${API_URL}/sessions`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    sessions = await res.json();
  } catch (err) {
    console.error('❌ Không lấy được danh sách phiên giám sát.');
  }

  if (sessions.length === 0) {
    console.log('⚠️ Không có phiên giám sát nào đang hoạt động.');
    console.log('Đang chờ thiết bị tự gửi dữ liệu thử nghiệm... (MAC mặc định: AA:BB:CC:DD:EE:11)');
    
    // Gửi thử nghiệm một thiết bị mặc định
    simulateDevice('AA:BB:CC:DD:EE:11', 'Trần Thị C');
    return;
  }

  console.log(`Tìm thấy ${sessions.length} phiên giám sát đang hoạt động:\n`);
  sessions.forEach((s, i) => {
    console.log(`  ${i+1}. Bệnh nhân: ${s.patientName} | Phòng: ${s.room} | Thiết bị: ${s.deviceId}`);
  });
  console.log('');

  // Giả lập từng thiết bị
  sessions.forEach((s, i) => {
    setTimeout(() => {
      simulateDevice(s.deviceId, s.patientName);
    }, i * 500);
  });
}

main();