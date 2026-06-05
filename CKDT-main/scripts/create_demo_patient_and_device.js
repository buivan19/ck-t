const pool = require('../config/pool');
const crypto = require('crypto');

async function run() {
  const conn = await pool.getConnection();
  try {
    const patientId = crypto.randomUUID();
    const deviceId = crypto.randomUUID();
    const mac = process.argv[2] || 'DEMO-MAC-001';

    console.log('Creating demo patient with id', patientId);
    await conn.query(
      `INSERT INTO patient_profiles (id, user_id, full_name, age, gender, phone, room_number, bed_number, created_at)
       VALUES (?, NULL, ?, ?, ?, ?, ?, ?, NOW())`,
      [patientId, 'Demo Patient', 30, 'M', '0123456789', '101', '1']
    );

    console.log('Creating demo device with id', deviceId, 'mac', mac);
    await conn.query(
      `INSERT INTO devices (id, mac_address, status, location, patient_id, created_at)
       VALUES (?, ?, 'active', ?, ?, NOW())`,
      [deviceId, mac, 'Demo Ward', patientId]
    );

    console.log('Demo patient and device created successfully:');
    console.log({ patientId, deviceId, mac });
  } catch (err) {
    console.error('Error creating demo entries:', err && err.message ? err.message : err);
  } finally {
    try { conn.release(); } catch (e) {}
    process.exit(0);
  }
}

run();
