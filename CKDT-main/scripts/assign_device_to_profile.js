const pool = require('../config/pool');
const crypto = require('crypto');

async function run() {
  const userId = process.argv[2];
  const mac = process.argv[3];
  if (!userId || !mac) {
    console.error('Usage: node assign_device_to_profile.js <userId> <mac>');
    process.exit(1);
  }

  const conn = await pool.getConnection();
  try {
    const [[profile]] = await conn.query('SELECT id FROM patient_profiles WHERE user_id = ? LIMIT 1', [userId]);
    if (!profile) {
      console.error('No patient profile found for user:', userId);
      process.exit(1);
    }
    const profileId = profile.id;

    // Check if device with mac exists
    const [[existingDevice]] = await conn.query('SELECT id FROM devices WHERE mac_address = ? LIMIT 1', [mac]);
    if (existingDevice) {
      await conn.query('UPDATE devices SET patient_id = ?, status = "active" WHERE id = ?', [profileId, existingDevice.id]);
      console.log('Updated existing device', existingDevice.id, '-> assigned to profile', profileId);
    } else {
      const deviceId = crypto.randomUUID();
      await conn.query('INSERT INTO devices (id, mac_address, status, location, patient_id, created_at) VALUES (?, ?, "active", ?, ?, NOW())', [deviceId, mac, 'Demo Ward', profileId]);
      console.log('Inserted device', deviceId, 'mac', mac, '-> assigned to profile', profileId);
    }
  } catch (e) {
    console.error('Error:', e && e.message ? e.message : e);
  } finally {
    try { conn.release(); } catch(e){}
    process.exit(0);
  }
}

run();