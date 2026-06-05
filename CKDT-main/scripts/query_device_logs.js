const pool = require('../config/pool');

async function run() {
  const mac = process.argv[2];
  if (!mac) { console.error('Usage: node query_device_logs.js <mac>'); process.exit(1); }
  const conn = await pool.getConnection();
  try {
    const [[device]] = await conn.query('SELECT id, patient_id FROM devices WHERE mac_address = ? LIMIT 1', [mac]);
    if (!device) { console.log('No device found for mac', mac); process.exit(0); }
    console.log('Device:', device);
    const [rows] = await conn.query('SELECT id, device_id, patient_id, temperature, humidity, recorded_at FROM sensor_logs WHERE device_id = ? ORDER BY recorded_at DESC LIMIT 50', [device.id]);
    console.log('Logs:', JSON.stringify(rows, null, 2));
  } catch (e) { console.error('Error:', e && e.message ? e.message : e); }
  finally { try{ conn.release(); }catch(e){}; process.exit(0); }
}

run();