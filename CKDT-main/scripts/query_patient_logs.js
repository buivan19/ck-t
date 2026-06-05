const pool = require('../config/pool');

async function run() {
  const patientId = process.argv[2];
  if (!patientId) { console.error('Usage: node query_patient_logs.js <patientId>'); process.exit(1); }
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query('SELECT id, device_id, patient_id, temperature, humidity, recorded_at FROM sensor_logs WHERE patient_id = ? ORDER BY recorded_at DESC LIMIT 20', [patientId]);
    console.log(JSON.stringify(rows, null, 2));
  } catch (e) { console.error('Error:', e && e.message ? e.message : e); }
  finally { try{ conn.release(); }catch(e){}; process.exit(0); }
}

run();