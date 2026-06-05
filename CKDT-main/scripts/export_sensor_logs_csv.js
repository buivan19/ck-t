const pool = require('../config/pool');
const fs = require('fs');

async function run() {
  const args = process.argv.slice(2);
  const opts = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--patientId') opts.patientId = args[++i];
    if (args[i] === '--deviceId') opts.deviceId = args[++i];
    if (args[i] === '--limit') opts.limit = Number(args[++i]);
    if (args[i] === '--since') opts.since = args[++i];
    if (args[i] === '--out') opts.out = args[++i];
  }

  const clauses = [];
  const params = [];
  if (opts.patientId) { clauses.push('patient_id = ?'); params.push(opts.patientId); }
  if (opts.deviceId)  { clauses.push('device_id = ?');  params.push(opts.deviceId); }
  if (opts.since)     { clauses.push('recorded_at >= ?'); params.push(opts.since); }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  const limit = opts.limit || 1000;
  params.push(limit);

  const sql = `SELECT id, device_id, patient_id, temperature, humidity, recorded_at FROM sensor_logs ${where} ORDER BY recorded_at DESC LIMIT ?`;

  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(sql, params);
    const filename = opts.out || `sensor_logs_export_${Date.now()}.csv`;
    const stream = fs.createWriteStream(filename, { encoding: 'utf8' });
    stream.write('id,device_id,patient_id,temperature,humidity,recorded_at\n');
    for (const r of rows) {
      const line = [r.id, r.device_id, r.patient_id, r.temperature, r.humidity, r.recorded_at].map(v => (v !== null && v !== undefined) ? (`"${String(v).replace(/"/g,'""')}"`) : '').join(',');
      stream.write(line + '\n');
    }
    stream.end();
    console.log('Wrote', rows.length, 'rows to', filename);
  } catch (e) {
    console.error('Error exporting sensor_logs:', e && e.message ? e.message : e);
  } finally {
    try { conn.release(); } catch (e) {}
    process.exit(0);
  }
}

run();
