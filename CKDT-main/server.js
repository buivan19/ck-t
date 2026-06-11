// ============================================================
// server.js - Urticaria Monitoring System Web Server
// ============================================================
'use strict';

const express = require('express');
const cors    = require('cors');
const crypto  = require('crypto');
require('dotenv').config();

const app = express();
const http = require('http');
const { Server } = require('socket.io');

// ── Middleware ───────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-device-key'],
  exposedHeaders: ['Content-Disposition']
}));
app.use(express.json());

// ── Import DB Pool ───────────────────────────────────────────
const pool = require('./config/pool');

async function ensureDeviceTagColumn() {
  try {
    const [rows] = await pool.query("SHOW COLUMNS FROM devices LIKE 'device_tag'");
    if (!rows || rows.length === 0) {
      console.log('[DB] Thêm cột device_tag vào bảng devices...');
      await pool.query("ALTER TABLE devices ADD COLUMN device_tag varchar(100) DEFAULT NULL");
      try {
        await pool.query('CREATE UNIQUE INDEX idx_devices_device_tag ON devices (device_tag)');
      } catch (err) {
        if (err.code === 'ER_DUP_KEYNAME' || err.errno === 1061) {
          console.log('[DB] Chỉ mục device_tag đã tồn tại, bỏ qua.');
        } else {
          throw err;
        }
      }
    }
  } catch (err) {
    console.error('[DB] Lỗi khi đảm bảo cột device_tag:', err.message);
    throw err;
  }
}

async function ensureRoomTemperatureColumn() {
  try {
    // 1. Check sensor_logs table
    const [rowsLogs] = await pool.query("SHOW COLUMNS FROM sensor_logs LIKE 'room_temperature'");
    if (!rowsLogs || rowsLogs.length === 0) {
      console.log('[DB] Thêm cột room_temperature vào bảng sensor_logs...');
      await pool.query("ALTER TABLE sensor_logs ADD COLUMN room_temperature decimal(5,2) DEFAULT NULL");
    }
    // 2. Check clinical_diagnoses table
    const [rowsDiag] = await pool.query("SHOW COLUMNS FROM clinical_diagnoses LIKE 'room_temperature'");
    if (!rowsDiag || rowsDiag.length === 0) {
      console.log('[DB] Thêm cột room_temperature vào bảng clinical_diagnoses...');
      await pool.query("ALTER TABLE clinical_diagnoses ADD COLUMN room_temperature decimal(5,2) DEFAULT NULL");
    }
  } catch (err) {
    console.error('[DB] Lỗi khi đảm bảo cột room_temperature:', err.message);
    throw err;
  }
}

// Create HTTP server and Socket.IO for realtime updates
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET','POST']
  }
});

// Socket.IO authentication middleware: verify token from in-memory tokenStore
io.use((socket, next) => {
  try {
    const tokenFromAuth = socket.handshake.auth && socket.handshake.auth.token;
    const authHeader = socket.handshake.headers && socket.handshake.headers.authorization;
    const token = (tokenFromAuth ? tokenFromAuth : (authHeader ? authHeader.replace('Bearer ', '') : '')).trim();

    if (!token || !tokenStore.has(token)) {
      return next(new Error('unauthorized'));
    }

    const user = tokenStore.get(token);
    socket.data.user = user;

    // Join a personal room so we can emit only to that user
    if (user && user.userId) {
      socket.join(`user:${user.userId}`);
    }

    // Join monitor room for clinicians/engineers/admins
    if (user && ['doctor', 'engineer', 'admin'].includes(user.role)) {
      socket.join('monitor');
    }

    next();
  } catch (e) { next(new Error('unauthorized')) }
});

// Inject realtime into controllers that need it
const DeviceController = require('./controllers/DeviceController');
const pendingDeviceClaims = new Map();
if (DeviceController && typeof DeviceController.setRealtime === 'function') {
  DeviceController.setRealtime(io);
}
if (DeviceController && typeof DeviceController.setPendingDeviceClaims === 'function') {
  DeviceController.setPendingDeviceClaims(pendingDeviceClaims);
}

io.on('connection', (socket) => {
  socket.on('patient:watch-device', (deviceTag) => {
    const tag = String(deviceTag || '').trim();
    if (!tag || !socket.data?.user?.userId) return;
    pendingDeviceClaims.set(tag, { userId: socket.data.user.userId, socketId: socket.id });
    console.log('[Socket] Patient is waiting for device tag:', tag, 'userId=', socket.data.user.userId);
  });

  socket.on('patient:unwatch-device', (deviceTag) => {
    const tag = String(deviceTag || '').trim();
    if (!tag) return;
    const entry = pendingDeviceClaims.get(tag);
    if (entry && entry.socketId === socket.id) {
      pendingDeviceClaims.delete(tag);
    }
  });

  socket.on('disconnect', () => {
    for (const [tag, entry] of pendingDeviceClaims.entries()) {
      if (entry.socketId === socket.id) {
        pendingDeviceClaims.delete(tag);
      }
    }
  });
});

// ── Simple In-Memory Token Store ─────────────────────────────
const tokenStore = new Map();
let dbReady = false;

const mockUsers = [
  { id: 1, name: 'Bác sĩ Minh', email: 'bacsi@hospital.com', password: '123456', role: 'doctor' },
  { id: 2, name: 'Kỹ sư An', email: 'engineer@hospital.com', password: '123456', role: 'engineer' },
  { id: 3, name: 'Bệnh nhân Trang', email: 'benhnhan@hospital.com', password: '123456', role: 'patient' },
];

const mockDevices = [
  { id: 'dev-001', deviceId: 'ESP32-001', macAddress: 'AA:BB:CC:DD:EE:01', status: 'active', location: 'Phòng 101', patientId: 1, deviceTag: 'TAG-001', createdAt: new Date().toISOString() },
  { id: 'dev-002', deviceId: 'ESP32-002', macAddress: 'AA:BB:CC:DD:EE:02', status: 'available', location: 'Kho thiết bị', patientId: null, deviceTag: 'TAG-002', createdAt: new Date().toISOString() },
];

const mockPatients = [
  { id: 1, name: 'Nguyễn Văn A', age: 45, gender: 'Nam', phone: '0901111111', room: '101', bed: '101', condition: 'sốt' },
  { id: 2, name: 'Trần Thị B', age: 32, gender: 'Nữ', phone: '0902222222', room: '102', bed: '201', condition: 'viêm da' },
];

let mockSessions = [
  { id: 'session-001', patientId: 1, patientName: 'Nguyễn Văn A', age: 45, room: '101', bed: '101', condition: 'sốt', deviceId: 'ESP32-001', fluidType: 'NaCl 0.9%', volumeInitial: 1000, volumeRemaining: 980, dropRate: 80, doctor: 'Bác sĩ Minh', ended: false, status: 'normal', manualError: false },
  { id: 'session-002', patientId: 2, patientName: 'Trần Thị B', age: 32, room: '102', bed: '201', condition: 'viêm da', deviceId: 'ESP32-002', fluidType: 'Ringer Lactate', volumeInitial: 800, volumeRemaining: 320, dropRate: 60, doctor: 'Bác sĩ Minh', ended: false, status: 'warning', manualError: false },
];

let mockDiagnoses = [
  { id: 'diag-001', patientId: 1, patientName: 'Nguyễn Văn A', severity: 'normal', summary: 'Theo dõi ổn định' },
  { id: 'diag-002', patientId: 2, patientName: 'Trần Thị B', severity: 'warning', summary: 'Cần kiểm tra tốc độ truyền' },
];

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function getMockUserByEmail(email) {
  return mockUsers.find(u => u.email === email) || null;
}

function getMockUserFromToken(token) {
  return tokenStore.get(token) || null;
}

function getMockSessionById(id) {
  return mockSessions.find(s => s.id === id || s.patientId === Number(id));
}

function getMockDeviceById(id) {
  return mockDevices.find(d => d.id === id || d.deviceId === id);
}

// Authentication Middlewares
function requireAuth(req, res, next) {
  const auth = req.headers['authorization'] || '';
  const token = auth.replace('Bearer ', '').trim();
  if (!token || !tokenStore.has(token)) {
    return res.status(401).json({ error: 'Chưa đăng nhập hoặc phiên hết hạn.' });
  }
  req.user = tokenStore.get(token);
  next();
}

function requireRole(roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ error: 'Bạn không có quyền thực hiện hành động này.' });
    }
    next();
  };
}

// ── Route ESP32 (Sensor Data Ingestion) ──────────────────────
const deviceRoutes = require('./routes/deviceRoutes');
app.use('/', deviceRoutes);
app.use('/api', deviceRoutes);

// CSV export routes
const exportRoutes = require('./routes/exportRoutes');
app.use('/api', exportRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api', (req, res, next) => {
  if (dbReady) return next();

  const path = req.path || '';
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '').trim();

  if (req.method === 'POST' && path === '/auth/login') {
    const { email, password } = req.body || {};
    const user = getMockUserByEmail(email);
    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng.' });
    }
    const newToken = generateToken();
    tokenStore.set(newToken, { userId: user.id, role: user.role, name: user.name, email: user.email });
    return res.json({ token: newToken, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  }

  if (req.method === 'GET' && path === '/auth/me') {
    const user = getMockUserFromToken(token);
    if (!user) return res.status(401).json({ error: 'Chưa đăng nhập hoặc phiên hết hạn.' });
    return res.json({ user: { id: user.userId, name: user.name, email: user.email, role: user.role } });
  }

  if (req.method === 'POST' && path === '/auth/logout') {
    if (token) tokenStore.delete(token);
    return res.json({ success: true });
  }

  if (req.method === 'POST' && path === '/auth/register') {
    const { email, password, name, role } = req.body || {};
    if (!email || !password || !name) return res.status(400).json({ error: 'Thiếu thông tin đăng ký.' });
    const newUser = { id: mockUsers.length + 1, name, email, password, role: role || 'patient' };
    mockUsers.push(newUser);
    return res.json({ success: true, user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role } });
  }

  if (req.method === 'GET' && path === '/sessions') {
    return res.json(mockSessions);
  }

  if (req.method === 'POST' && path === '/sessions') {
    const { patientId, deviceId } = req.body || {};
    const patient = mockPatients.find(p => p.id === Number(patientId));
    const device = mockDevices.find(d => d.id === deviceId || d.deviceId === deviceId);
    const session = {
      id: `session-${mockSessions.length + 1}`,
      patientId: patient?.id || 1,
      patientName: patient?.name || 'Bệnh nhân mới',
      age: patient?.age || 30,
      room: patient?.room || '101',
      bed: patient?.bed || '101',
      condition: patient?.condition || 'đang theo dõi',
      deviceId: device?.deviceId || deviceId || 'ESP32-NEW',
      fluidType: 'NaCl 0.9%',
      volumeInitial: 1000,
      volumeRemaining: 1000,
      dropRate: 80,
      doctor: 'Bác sĩ Minh',
      ended: false,
      status: 'normal',
      manualError: false,
    };
    mockSessions.push(session);
    return res.json(session);
  }

  if (req.method === 'PATCH' && /^\/sessions\/([^/]+)\/end$/.test(path)) {
    const match = path.match(/^\/sessions\/([^/]+)\/end$/);
    const id = match[1];
    mockSessions = mockSessions.map(s => s.id === id || String(s.patientId) === id ? { ...s, ended: true, status: 'completed' } : s);
    return res.json({ success: true });
  }

  if (req.method === 'GET' && /^\/sessions\/([^/]+)\/metrics$/.test(path)) {
    const match = path.match(/^\/sessions\/([^/]+)\/metrics$/);
    const session = getMockSessionById(match[1]);
    if (!session) return res.status(404).json({ error: 'Không tìm thấy phiên' });
    return res.json({ sessionId: session.id, metrics: [{ time: '10:00', pressure: 84 }, { time: '10:05', pressure: 87 }] });
  }

  if (req.method === 'GET' && path === '/devices') {
    return res.json(mockDevices);
  }

  if (req.method === 'POST' && path === '/devices') {
    const device = { id: `dev-${mockDevices.length + 1}`, ...req.body, status: 'active', createdAt: new Date().toISOString() };
    mockDevices.push(device);
    return res.json(device);
  }

  if (req.method === 'DELETE' && /^\/devices\/([^/]+)$/.test(path)) {
    const match = path.match(/^\/devices\/([^/]+)$/);
    mockDevices = mockDevices.filter(d => d.id !== match[1] && d.deviceId !== match[1]);
    return res.json({ success: true });
  }

  if (req.method === 'POST' && /^\/devices\/([^/]+)\/report$/.test(path)) {
    return res.json({ success: true });
  }

  if (req.method === 'GET' && path === '/patients') {
    return res.json(mockPatients);
  }

  if (req.method === 'POST' && path === '/patients') {
    const patient = { id: mockPatients.length + 1, ...req.body };
    mockPatients.push(patient);
    return res.json(patient);
  }

  if (req.method === 'DELETE' && /^\/patients\/([^/]+)$/.test(path)) {
    const match = path.match(/^\/patients\/([^/]+)$/);
    mockPatients = mockPatients.filter(p => p.id !== Number(match[1]));
    return res.json({ success: true });
  }

  if (req.method === 'GET' && path === '/diagnoses') {
    return res.json(mockDiagnoses);
  }

  if (req.method === 'GET' && path === '/patient/dashboard') {
    return res.json({ profile: mockPatients[0], sessions: mockSessions.filter(s => !s.ended) });
  }

  if (req.method === 'POST' && path === '/patient/claim-device') {
    const { deviceTag } = req.body || {};
    const device = mockDevices.find(d => d.deviceTag === deviceTag || d.deviceId === deviceTag);
    if (!device) return res.status(404).json({ error: 'Không tìm thấy thiết bị.' });
    device.status = 'active';
    device.patientId = mockPatients[0].id;
    return res.json({ success: true, device });
  }

  return next();
});

// ============================================================
// AUTHENTICATION ENDPOINTS
// ============================================================

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Thiếu email hoặc mật khẩu.' });
    }

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

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name, role } = req.body;
    const allowedRoles = ['patient', 'doctor', 'admin'];

    if (!email || !password || !name || !role) {
      return res.status(400).json({ error: 'Thiếu email, mật khẩu, tên người dùng hoặc loại tài khoản.' });
    }
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ error: 'Loại tài khoản không hợp lệ.' });
    }

    const [[existing]] = await pool.query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
    if (existing) {
      return res.status(409).json({ error: 'Tài khoản với tên đăng nhập này đã tồn tại.' });
    }

    const userId = crypto.randomUUID();
    await pool.query(
      'INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)',
      [userId, name, email, password, role]
    );

    if (role === 'patient') {
      await pool.query(
        'INSERT INTO patient_profiles (id, user_id, full_name, created_at) VALUES (UUID(), ?, ?, NOW())',
        [userId, name]
      );
    }

    res.status(201).json({
      success: true,
      user: { id: userId, name, email, role }
    });
  } catch (err) {
    console.error('[POST /api/auth/register]', err.message || err);
    res.status(500).json({ error: err.message || 'Lỗi server.' });
  }
});

app.post('/api/auth/logout', requireAuth, (req, res) => {
  const token = req.headers['authorization'].replace('Bearer ', '').trim();
  tokenStore.delete(token);
  res.json({ success: true });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// ============================================================
// DEVICE ENDPOINTS (For Engineers)
// ============================================================

app.get('/api/devices', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT d.id, d.mac_address AS macAddress, d.status, d.location, d.created_at AS createdAt, p.full_name AS patientName
      FROM devices d
      LEFT JOIN patient_profiles p ON d.patient_id = p.id
      ORDER BY d.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('[GET /api/devices]', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/devices', requireAuth, requireRole(['engineer', 'admin']), async (req, res) => {
  try {
    const { macAddress, location } = req.body;
    if (!macAddress) {
      return res.status(400).json({ error: 'Thiếu MAC address.' });
    }

    // Check duplicate MAC
    const [[existing]] = await pool.query('SELECT id FROM devices WHERE mac_address = ? LIMIT 1', [macAddress]);
    if (existing) {
      return res.status(409).json({ error: 'MAC address đã tồn tại.' });
    }

    await pool.query(
      `INSERT INTO devices (id, mac_address, status, location) VALUES (UUID(), ?, 'available', ?)`,
      [macAddress, location || 'Kho thiết bị']
    );

    res.status(201).json({ success: true });
  } catch (err) {
    console.error('[POST /api/devices]', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/devices/:id', requireAuth, requireRole(['engineer', 'admin']), async (req, res) => {
  try {
    const [[device]] = await pool.query('SELECT status FROM devices WHERE id = ? LIMIT 1', [req.params.id]);
    if (!device) {
      return res.status(404).json({ error: 'Không tìm thấy thiết bị.' });
    }
    if (device.status === 'active') {
      return res.status(409).json({ error: 'Không thể xoá thiết bị đang gắn bệnh nhân.' });
    }

    await pool.query('DELETE FROM devices WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/devices/:id]', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/devices/:id/report', requireAuth, requireRole(['doctor', 'engineer', 'admin']), async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason) {
      return res.status(400).json({ error: 'Thiếu lý do báo cáo lỗi thiết bị.' });
    }

    const [[device]] = await pool.query('SELECT id, patient_id FROM devices WHERE id = ? LIMIT 1', [req.params.id]);
    if (!device) {
      return res.status(404).json({ error: 'Không tìm thấy thiết bị.' });
    }
    if (!device.patient_id) {
      return res.status(400).json({ error: 'Thiết bị chưa được gắn với bệnh nhân, không thể báo cáo lỗi.' });
    }

    await pool.query('UPDATE devices SET status = "error" WHERE id = ?', [device.id]);
    await pool.query(
      `INSERT INTO clinical_diagnoses (id, patient_id, device_id, temperature, humidity, diagnosis_text, status, created_at)
       VALUES (UUID(), ?, ?, 0, 0, ?, 'urgent', NOW())`,
      [device.patient_id, device.id, `Báo cáo lỗi thiết bị: ${reason}`]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('[POST /api/devices/:id/report]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// PATIENT PROFILE ENDPOINTS (For Doctors)
// ============================================================

app.get('/api/patients', requireAuth, requireRole(['doctor', 'admin']), async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT p.id, p.full_name AS fullName, p.age, p.gender, p.phone, p.room_number AS roomNumber, p.bed_number AS bedNumber, p.created_at AS createdAt,
             d.mac_address AS deviceMac
      FROM patient_profiles p
      LEFT JOIN devices d ON d.patient_id = p.id
      ORDER BY p.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('[GET /api/patients]', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/patients', requireAuth, requireRole(['doctor', 'admin']), async (req, res) => {
  try {
    const { fullName, age, gender, phone, roomNumber, bedNumber, email, password } = req.body;
    if (!fullName) {
      return res.status(400).json({ error: 'Thiếu tên bệnh nhân.' });
    }

    let userId = null;
    if (email && password) {
      const [[existingUser]] = await pool.query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
      if (existingUser) {
        userId = existingUser.id;
      } else {
        userId = crypto.randomUUID();
        await pool.query(
          `INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, 'patient')`,
          [userId, fullName, email, password]
        );
      }
    }

    await pool.query(
      `INSERT INTO patient_profiles (id, user_id, full_name, age, gender, phone, room_number, bed_number)
       VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?)`,
      [userId, fullName, age || null, gender || null, phone || null, roomNumber || null, bedNumber || null]
    );

    res.status(201).json({ success: true });
  } catch (err) {
    console.error('[POST /api/patients]', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/patients/:id', requireAuth, requireRole(['doctor', 'admin']), async (req, res) => {
  try {
    // Free up devices
    await pool.query('UPDATE devices SET status = "available", patient_id = NULL WHERE patient_id = ?', [req.params.id]);
    await pool.query('DELETE FROM patient_profiles WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/patients/:id]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// ACTIVE SESSIONS / MONITORING ENDPOINTS (For Doctors)
// ============================================================

app.get('/api/sessions', requireAuth, requireRole(['doctor', 'admin']), async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        p.id AS id,
        p.full_name AS patientName,
        p.room_number AS room,
        p.bed_number AS bed,
        d.mac_address AS deviceId,
        (SELECT s.temperature FROM sensor_logs s WHERE s.patient_id = p.id ORDER BY s.recorded_at DESC LIMIT 1) AS lastTemp,
        (SELECT s.humidity FROM sensor_logs s WHERE s.patient_id = p.id ORDER BY s.recorded_at DESC LIMIT 1) AS lastHumid,
        (SELECT s.room_temperature FROM sensor_logs s WHERE s.patient_id = p.id ORDER BY s.recorded_at DESC LIMIT 1) AS lastRoomTemp,
        (SELECT c.diagnosis_text FROM clinical_diagnoses c WHERE c.patient_id = p.id ORDER BY c.created_at DESC LIMIT 1) AS diagnosisText,
        (SELECT c.status FROM clinical_diagnoses c WHERE c.patient_id = p.id ORDER BY c.created_at DESC LIMIT 1) AS status,
        d.created_at AS createdAt
      FROM patient_profiles p
      JOIN devices d ON d.patient_id = p.id
      WHERE d.status = 'active'
      ORDER BY d.created_at DESC
    `);

    res.json(rows.map(r => ({
      id:              r.id,
      patientName:     r.patientName,
      room:            r.room,
      bed:             r.bed,
      deviceId:        r.deviceId,
      temperature:     r.lastTemp ?? null,
      humidity:        r.lastHumid ?? null,
      roomTemperature: r.lastRoomTemp ?? null,
      diagnosisText:   r.diagnosisText ?? 'Chưa có dữ liệu',
      status:          r.status ?? 'normal',
      createdAt:       r.createdAt,
      ended:           false
    })));
  } catch (err) {
    console.error('[GET /api/sessions]', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/sessions', requireAuth, requireRole(['doctor', 'admin']), async (req, res) => {
  try {
    const { patientId, deviceId } = req.body;
    if (!patientId || !deviceId) {
      return res.status(400).json({ error: 'Thiếu patientId hoặc deviceId.' });
    }

    const [[device]] = await pool.query('SELECT id, status FROM devices WHERE id = ? OR mac_address = ? LIMIT 1', [deviceId, deviceId]);
    if (!device) {
      return res.status(404).json({ error: 'Không tìm thấy thiết bị.' });
    }
    if (device.status !== 'available') {
      return res.status(409).json({ error: 'Thiết bị đang bận hoặc bị lỗi.' });
    }

    await pool.query('UPDATE devices SET status = "active", patient_id = ? WHERE id = ?', [patientId, device.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('[POST /api/sessions]', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/sessions/:id/end', requireAuth, requireRole(['doctor', 'admin']), async (req, res) => {
  try {
    await pool.query('UPDATE devices SET status = "available", patient_id = NULL WHERE patient_id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('[PATCH /api/sessions/:id/end]', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/sessions/:id/metrics', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT temperature, humidity, room_temperature AS roomTemperature, recorded_at AS recordedAt
      FROM sensor_logs
      WHERE patient_id = ?
      ORDER BY recorded_at DESC LIMIT 60
    `, [req.params.id]);

    res.json(rows.map(r => ({
      temperature: Number(r.temperature),
      humidity:    Number(r.humidity),
      roomTemperature: r.roomTemperature != null ? Number(r.roomTemperature) : null,
      recordedAt:  r.recordedAt
    })).reverse());
  } catch (err) {
    console.error('[GET /api/sessions/:id/metrics]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// CLINICAL DIAGNOSES / HISTORICAL ALERTS (For Doctors)
// ============================================================

app.get('/api/diagnoses', requireAuth, requireRole(['doctor', 'engineer', 'admin']), async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        c.id, c.temperature, c.humidity, c.diagnosis_text AS message, c.status AS alert_type, c.created_at AS triggered_at,
        p.full_name AS patientName, p.room_number AS room, p.bed_number AS bed
      FROM clinical_diagnoses c
      JOIN patient_profiles p ON c.patient_id = p.id
      ORDER BY c.created_at DESC LIMIT 100
    `);
    res.json(rows);
  } catch (err) {
    console.error('[GET /api/diagnoses]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// PATIENT PRIVATE DASHBOARD ENDPOINTS
// ============================================================

app.get('/api/patient/dashboard', requireAuth, requireRole(['patient']), async (req, res) => {
  try {
    const [[profile]] = await pool.query('SELECT * FROM patient_profiles WHERE user_id = ? LIMIT 1', [req.user.userId]);
    if (!profile) {
      return res.status(404).json({ error: 'Không tìm thấy thông tin bệnh nhân.' });
    }

    const [[device]] = await pool.query('SELECT mac_address, device_tag FROM devices WHERE patient_id = ? LIMIT 1', [profile.id]);

    const [[latestLog]] = await pool.query(`
      SELECT temperature, humidity, room_temperature, recorded_at 
      FROM sensor_logs 
      WHERE patient_id = ? 
      ORDER BY recorded_at DESC LIMIT 1
    `, [profile.id]);

    const [[latestDiagnosis]] = await pool.query(`
      SELECT diagnosis_text, status 
      FROM clinical_diagnoses 
      WHERE patient_id = ? 
      ORDER BY created_at DESC LIMIT 1
    `, [profile.id]);

    res.json({
      profile,
      device: device ? { macAddress: device.mac_address, deviceTag: device.device_tag } : null,
      latestData: latestLog ? { 
        temperature: Number(latestLog.temperature), 
        humidity: Number(latestLog.humidity), 
        roomTemperature: latestLog.room_temperature != null ? Number(latestLog.room_temperature) : null,
        time: latestLog.recorded_at 
      } : null,
      latestDiagnosis: latestDiagnosis ? { 
        text: latestDiagnosis.diagnosis_text, 
        status: latestDiagnosis.status 
      } : null
    });
  } catch (err) {
    console.error('[GET /api/patient/dashboard]', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/patient/claim-device', requireAuth, requireRole(['patient']), async (req, res) => {
  try {
    const { deviceTag, device_tag, macAddress, mac_address } = req.body;
    const normalizedTag = String(deviceTag || device_tag || '').trim();
    const normalizedMac = String(macAddress || mac_address || '').trim();

    if (!normalizedTag && !normalizedMac) {
      return res.status(400).json({ error: 'Thiếu deviceTag hoặc MAC address của thiết bị.' });
    }

    const [[profile]] = await pool.query('SELECT id FROM patient_profiles WHERE user_id = ? LIMIT 1', [req.user.userId]);
    if (!profile) {
      return res.status(404).json({ error: 'Không tìm thấy thông tin bệnh nhân.' });
    }

    const [[device]] = await pool.query(
      'SELECT id, patient_id, status, mac_address, device_tag FROM devices WHERE device_tag = ? OR mac_address = ? LIMIT 1',
      [normalizedTag || '', normalizedMac || '']
    );

    if (device) {
      if (device.patient_id && device.patient_id !== profile.id) {
        return res.status(409).json({ error: 'Thiết bị này đã được gán cho bệnh nhân khác.' });
      }

      const updatedTag = normalizedTag || device.device_tag;
      const updatedMac = normalizedMac || device.mac_address;
      await pool.query(
        'UPDATE devices SET patient_id = ?, status = ?, device_tag = ?, mac_address = ? WHERE id = ?',
        [profile.id, 'active', updatedTag, updatedMac, device.id]
      );

      return res.json({
        success: true,
        message: 'Thiết bị đã được gán cho bạn.',
        device: { macAddress: updatedMac, deviceTag: updatedTag }
      });
    }

    const insertMac = normalizedMac || normalizedTag;
    const insertTag = normalizedTag || null;

    await pool.query(
      'INSERT INTO devices (id, mac_address, device_tag, status, location, patient_id, created_at) VALUES (UUID(), ?, ?, ?, ?, ?, NOW())',
      [insertMac, insertTag, 'active', 'Patient claimed device', profile.id]
    );

    res.json({ success: true, message: 'Thiết bị mới đã được tạo và gán cho bạn.', device: { macAddress: insertMac, deviceTag: insertTag } });
  } catch (err) {
    console.error('[POST /api/patient/claim-device]', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error('[JSON Syntax Error]', err.message);
    return res.status(400).json({ error: 'JSON body không hợp lệ. Vui lòng gửi payload đúng JSON.' });
  }
  next(err);
});

// ── Server Listen ────────────────────────────────────────────
const PORT = process.env.PORT || 8000;

async function startServer() {
  try {
    await ensureDeviceTagColumn();
    await ensureRoomTemperatureColumn();
    dbReady = true;
    server.listen(PORT, () =>
      console.log(`[Server] Urticaria Monitoring System listening at http://localhost:${PORT}`)
    );
  } catch (err) {
    console.warn('[Server] Không thể kết nối DB, đang chạy ở chế độ demo:', err.message);
    server.listen(PORT, () =>
      console.log(`[Server] Urticaria Monitoring System listening at http://localhost:${PORT} (demo mode)`)
    );
  }
}

startServer();