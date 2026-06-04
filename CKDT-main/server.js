// ============================================================
// server.js - HỆ THỐNG GIÁM SÁT TRUYỀN DỊCH
// ============================================================
'use strict';

const express = require('express');
const cors    = require('cors');
const crypto  = require('crypto'); // built-in Node, không cần cài
require('dotenv').config();

const app = express();

// ── Middleware ───────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  credentials: true,
}));
app.use(express.json());

// ── Pool MySQL2 ──────────────────────────────────────────────
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host:               process.env.DB_HOST     || 'localhost',
  port:    Number(    process.env.DB_PORT)     || 3306,
  user:               process.env.DB_USER     || 'root',
  password:           process.env.DB_PASSWORD || '',
  database:           process.env.DB_NAME     || 'infusion_monitoring',
  waitForConnections: true,
  connectionLimit:    10,
  timezone:           '+07:00',
});

pool.getConnection()
  .then(c => { console.log('[DB] Ket noi MySQL thanh cong!'); c.release(); })
  .catch(e => { console.error('[DB] Loi ket noi MySQL:', e.message); process.exit(1); });

// ── Token store đơn giản (in-memory) ────────────────────────
// Key: token string  →  Value: { userId, role, name, email }
const tokenStore = new Map();

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Middleware xác thực
function requireAuth(req, res, next) {
  const auth = req.headers['authorization'] || '';
  const token = auth.replace('Bearer ', '').trim();
  if (!token || !tokenStore.has(token)) {
    return res.status(401).json({ error: 'Chưa đăng nhập hoặc phiên hết hạn.' });
  }
  req.user = tokenStore.get(token);
  next();
}

// Middleware chỉ cho kỹ thuật viên
function requireTechnician(req, res, next) {
  if (req.user?.role !== 'technician') {
    return res.status(403).json({ error: 'Chỉ kỹ thuật viên mới có quyền này.' });
  }
  next();
}

// ── Routes ESP32 ─────────────────────────────────────────────
const deviceRoutes = require('./routes/deviceRoutes');
app.use('/', deviceRoutes);

// ── Health check ─────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// ============================================================
// AUTH
// ============================================================

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Thiếu email hoặc mật khẩu.' });
    }

    // Mật khẩu lưu plain text trong DB (đơn giản cho dự án nhỏ)
    const [[user]] = await pool.query(
      `SELECT id, name, email, role FROM users
       WHERE email = ? AND password_hash = ? LIMIT 1`,
      [email, password]
    );

    if (!user) {
      return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng.' });
    }

    const token = generateToken();
    tokenStore.set(token, { userId: user.id, role: user.role, name: user.name, email: user.email });

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error('[POST /api/auth/login]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/logout
app.post('/api/auth/logout', requireAuth, (req, res) => {
  const token = req.headers['authorization'].replace('Bearer ', '').trim();
  tokenStore.delete(token);
  res.json({ success: true });
});

// GET /api/auth/me  — kiểm tra token còn hợp lệ không
app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// ============================================================
// DEVICES — dành cho kỹ thuật viên
// ============================================================

// GET /api/devices — lấy danh sách thiết bị (cả bác sĩ lẫn KTV đều dùng)
app.get('/api/devices', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, mac_address, label, location_room, location_bed, status, created_at
       FROM infusion_devices
       ORDER BY created_at DESC`
    );
    res.json(rows.map(d => ({
      id:           d.id,
      macAddress:   d.mac_address,
      label:        d.label || d.mac_address,
      locationRoom: d.location_room,
      locationBed:  d.location_bed,
      status:       d.status,      // 'available' | 'active' | 'error' | 'unassigned'
      createdAt:    d.created_at,
    })));
  } catch (err) {
    console.error('[GET /api/devices]', err.message);
    res.json([]);
  }
});

// POST /api/devices — KTV thêm thiết bị mới
app.post('/api/devices', requireAuth, requireTechnician, async (req, res) => {
  try {
    const { macAddress, label } = req.body;
    if (!macAddress) {
      return res.status(400).json({ error: 'Thiếu macAddress.' });
    }

    // Kiểm tra trùng
    const [[existing]] = await pool.query(
      `SELECT id FROM infusion_devices WHERE mac_address = ? LIMIT 1`,
      [macAddress]
    );
    if (existing) {
      return res.status(409).json({ error: 'MAC address đã tồn tại trong hệ thống.' });
    }

    await pool.query(
      `INSERT INTO infusion_devices (mac_address, label, status, registered_by)
       VALUES (?, ?, 'available', ?)`,
      [macAddress, label || null, req.user.userId]
    );

    const [[newDevice]] = await pool.query(
      `SELECT id, mac_address, label, location_room, location_bed, status, created_at
       FROM infusion_devices WHERE mac_address = ? LIMIT 1`,
      [macAddress]
    );

    res.status(201).json({
      id:           newDevice.id,
      macAddress:   newDevice.mac_address,
      label:        newDevice.label || newDevice.mac_address,
      locationRoom: newDevice.location_room,
      locationBed:  newDevice.location_bed,
      status:       newDevice.status,
      createdAt:    newDevice.created_at,
    });
  } catch (err) {
    console.error('[POST /api/devices]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/devices/:id — KTV xoá thiết bị (chỉ khi không đang active)
app.delete('/api/devices/:id', requireAuth, requireTechnician, async (req, res) => {
  try {
    const [[device]] = await pool.query(
      `SELECT id, status FROM infusion_devices WHERE id = ? LIMIT 1`,
      [req.params.id]
    );
    if (!device) return res.status(404).json({ error: 'Không tìm thấy thiết bị.' });
    if (device.status === 'active') {
      return res.status(409).json({ error: 'Không thể xoá thiết bị đang có phiên truyền.' });
    }
    await pool.query(`DELETE FROM infusion_devices WHERE id = ?`, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/devices]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// SESSIONS
// ============================================================

// GET /api/sessions
app.get('/api/sessions', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        s.id,
        p.full_name                          AS patientName,
        p.room_number                        AS room,
        p.bed_number                         AS bed,
        d.mac_address                        AS deviceId,
        ft.name                              AS fluidType,
        s.initial_weight                     AS volumeInitial,
        s.status,
        s.start_at                           AS createdAt,
        (SELECT m.current_drop_rate
         FROM infusion_metrics_logs m
         WHERE m.session_id = s.id
         ORDER BY m.recorded_at DESC LIMIT 1) AS dropRate,
        (SELECT m.current_weight
         FROM infusion_metrics_logs m
         WHERE m.session_id = s.id
         ORDER BY m.recorded_at DESC LIMIT 1) AS volumeRemaining,
        (SELECT m.remaining_time
         FROM infusion_metrics_logs m
         WHERE m.session_id = s.id
         ORDER BY m.recorded_at DESC LIMIT 1) AS remainingTime,
        EXISTS(
          SELECT 1 FROM infusion_issues i
          WHERE i.session_id = s.id AND i.status != 'resolved'
        ) AS manualError
      FROM infusion_sessions s
      JOIN patient_profiles p  ON s.patient_id    = p.id
      JOIN infusion_devices d  ON s.device_id     = d.id
      LEFT JOIN fluid_types ft ON s.fluid_type_id = ft.id
      WHERE s.status != 'completed'
      ORDER BY s.start_at DESC
    `);

    res.json(rows.map(r => ({
      ...r,
      volumeRemaining: r.volumeRemaining ?? r.volumeInitial,
      dropRate:        r.dropRate        ?? 0,
      remainingTime:   r.remainingTime   ?? null,
      manualError:     Boolean(r.manualError),
      ended:           false,
    })));
  } catch (err) {
    console.error('[GET /api/sessions]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sessions/:id/metrics
app.get('/api/sessions/:id/metrics', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT current_drop_rate, current_weight, remaining_time, recorded_at
       FROM infusion_metrics_logs
       WHERE session_id = ?
       ORDER BY recorded_at DESC LIMIT 60`,
      [req.params.id]
    );
    res.json(rows.reverse());
  } catch (err) {
    console.error('[GET /metrics]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sessions
app.post('/api/sessions', requireAuth, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { patientName, room, bed, deviceId, fluidType, volumeInitial, dropRate } = req.body;

    if (!patientName || !deviceId || !volumeInitial) {
      await conn.rollback();
      return res.status(400).json({ error: 'Thiếu: patientName, deviceId, volumeInitial' });
    }

    // 1. Tìm hoặc tạo bệnh nhân
    let patientId;
    const [existing] = await conn.query(
      `SELECT id FROM patient_profiles
       WHERE full_name=? AND room_number=? AND bed_number=? LIMIT 1`,
      [patientName, room ?? null, bed ?? null]
    );
    if (existing.length > 0) {
      patientId = existing[0].id;
    } else {
      await conn.query(
        `INSERT INTO patient_profiles (full_name, room_number, bed_number) VALUES (?,?,?)`,
        [patientName, room ?? null, bed ?? null]
      );
      const [[np]] = await conn.query(
        `SELECT id FROM patient_profiles WHERE full_name=? ORDER BY created_at DESC LIMIT 1`,
        [patientName]
      );
      patientId = np.id;
    }

    // 2. Tìm thiết bị theo mac_address
    const [[device]] = await conn.query(
      `SELECT id, status FROM infusion_devices WHERE mac_address=? LIMIT 1`,
      [deviceId]
    );
    if (!device) {
      await conn.rollback();
      return res.status(404).json({ error: `Không tìm thấy thiết bị: ${deviceId}` });
    }
    if (device.status === 'active') {
      await conn.rollback();
      return res.status(409).json({ error: 'Thiết bị đang có phiên truyền khác.' });
    }

    // 3. Tìm loại dịch
    let fluidTypeId = null;
    if (fluidType) {
      const [fts] = await conn.query(
        `SELECT id FROM fluid_types WHERE name LIKE ? LIMIT 1`,
        [`%${fluidType}%`]
      );
      if (fts.length > 0) fluidTypeId = fts[0].id;
    }

    // 4. Dùng staff_id từ token đăng nhập
    const staffId = req.user.userId;

    // 5. Tạo phiên
    await conn.query(
      `INSERT INTO infusion_sessions
         (device_id, patient_id, staff_id, fluid_type_id, initial_weight, status)
       VALUES (?,?,?,?,?,'normal')`,
      [device.id, patientId, staffId, fluidTypeId, volumeInitial]
    );

    // 6. Lấy phiên vừa tạo
    const [[newSession]] = await conn.query(
      `SELECT s.id, p.full_name AS patientName, p.room_number AS room,
              p.bed_number AS bed, d.mac_address AS deviceId,
              ft.name AS fluidType, s.initial_weight AS volumeInitial,
              s.status, s.start_at AS createdAt
       FROM infusion_sessions s
       JOIN patient_profiles p  ON s.patient_id    = p.id
       JOIN infusion_devices d  ON s.device_id     = d.id
       LEFT JOIN fluid_types ft ON s.fluid_type_id = ft.id
       WHERE s.patient_id=? ORDER BY s.start_at DESC LIMIT 1`,
      [patientId]
    );

    // 7. Đánh dấu thiết bị bận
    await conn.query(
      `UPDATE infusion_devices SET status='active' WHERE id=?`,
      [device.id]
    );

    await conn.commit();
    res.status(201).json({
      ...newSession,
      volumeRemaining: Number(volumeInitial),
      dropRate:        Number(dropRate) || 0,
      manualError:     false,
      ended:           false,
    });

  } catch (err) {
    await conn.rollback();
    console.error('[POST /api/sessions] LOI:', err.message);
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// PATCH /api/sessions/:id/end
app.patch('/api/sessions/:id/end', requireAuth, async (req, res) => {
  try {
    const [[s]] = await pool.query(
      'SELECT device_id FROM infusion_sessions WHERE id=?',
      [req.params.id]
    );
    if (!s) return res.status(404).json({ error: 'Không tìm thấy phiên' });

    await pool.query(
      `UPDATE infusion_sessions SET status='completed', end_at=NOW() WHERE id=?`,
      [req.params.id]
    );
    await pool.query(
      `UPDATE infusion_devices SET status='available' WHERE id=?`,
      [s.device_id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[PATCH /end]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/sessions/:id/error
app.patch('/api/sessions/:id/error', requireAuth, async (req, res) => {
  try {
    const staffId = req.user.userId;

    await pool.query(
      `INSERT INTO infusion_issues
         (session_id, reported_by, issue_type, description, status)
       VALUES (?, ?, 'device_error', 'Loi thiet bi - bao cao thu cong', 'pending')`,
      [req.params.id, staffId]
    );
    await pool.query(
      `UPDATE infusion_sessions SET status='urgent' WHERE id=?`,
      [req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[PATCH /error]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/alerts
app.get('/api/alerts', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT a.id, a.alert_type, a.message, a.is_read, a.triggered_at,
              p.full_name AS patientName, p.room_number AS room, p.bed_number AS bed
       FROM infusion_alerts a
       JOIN infusion_sessions s ON a.session_id = s.id
       JOIN patient_profiles  p ON s.patient_id = p.id
       ORDER BY a.triggered_at DESC LIMIT 50`
    );
    res.json(rows);
  } catch (err) {
    console.error('[GET /api/alerts]', err.message);
    res.json([]);
  }
});

// ── Khởi động ─────────────────────────────────────────────────
const PORT = process.env.PORT || 8000;
app.listen(PORT, () =>
  console.log(`[Server] Dang chay tai http://localhost:${PORT}`)
);