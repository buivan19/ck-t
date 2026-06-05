const pool = require('../config/pool');

async function run() {
  const conn = await pool.getConnection();
  try {
    const [[countDevices]] = await conn.query('SELECT COUNT(*) AS c FROM devices');
    const [[countPatients]] = await conn.query('SELECT COUNT(*) AS c FROM patient_profiles');
    const [[countLogs]] = await conn.query('SELECT COUNT(*) AS c FROM sensor_logs');
    const [[countDiag]] = await conn.query('SELECT COUNT(*) AS c FROM clinical_diagnoses');

    console.log('\n=== Counts ===');
    console.log('devices:', countDevices.c);
    console.log('patient_profiles:', countPatients.c);
    console.log('sensor_logs:', countLogs.c);
    console.log('clinical_diagnoses:', countDiag.c);

    const [recentLogs] = await conn.query('SELECT id, device_id, patient_id, temperature, humidity, recorded_at FROM sensor_logs ORDER BY recorded_at DESC LIMIT 5');
    console.log('\n=== Recent sensor_logs ===');
    console.log(JSON.stringify(recentLogs, null, 2));

    const [recentDiag] = await conn.query('SELECT id, patient_id, device_id, temperature, humidity, diagnosis_text, status, created_at FROM clinical_diagnoses ORDER BY created_at DESC LIMIT 5');
    console.log('\n=== Recent clinical_diagnoses ===');
    console.log(JSON.stringify(recentDiag, null, 2));

  } catch (e) {
    console.error('Error:', e && e.message ? e.message : e);
  } finally {
    try { conn.release(); } catch (e) {}
    process.exit(0);
  }
}

run();