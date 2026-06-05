const express = require('express');
const router = express.Router();
const pool = require('../config/pool');

// GET /api/export/sensor-logs?patientId=...&deviceId=...&limit=100
router.get('/export/sensor-logs', async (req, res) => {
  try {
    const { patientId, deviceId, limit = 100, since } = req.query;

    const clauses = [];
    const params = [];
    if (patientId) { clauses.push('patient_id = ?'); params.push(patientId); }
    if (deviceId)  { clauses.push('device_id = ?');  params.push(deviceId); }
    if (since)     { clauses.push('recorded_at >= ?'); params.push(since); }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

    const sql = `SELECT id, device_id, patient_id, temperature, humidity, recorded_at FROM sensor_logs ${where} ORDER BY recorded_at DESC LIMIT ?`;
    params.push(Number(limit));

    const [rows] = await pool.query(sql, params);

    // Build CSV
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    const filename = `sensor_logs_${patientId||deviceId||'all'}_${Date.now()}.csv`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // CSV header
    res.write('id,device_id,patient_id,temperature,humidity,recorded_at\n');
    for (const r of rows) {
      const line = [r.id, r.device_id, r.patient_id, r.temperature, r.humidity, r.recorded_at].map(v => (v !== null && v !== undefined) ? (`"${String(v).replace(/"/g,'""')}"`) : '').join(',');
      res.write(line + '\n');
    }
    res.end();
  } catch (err) {
    console.error('[EXPORT /sensor-logs]', err && err.message ? err.message : err);
    res.status(500).json({ error: 'Lỗi khi xuất CSV' });
  }
});

module.exports = router;
