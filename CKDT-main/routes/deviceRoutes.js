//map URL với Controller
require('dotenv').config();
const express = require('express');
const router = express.Router();
const DeviceController = require('../controllers/DeviceController'); // Gọi não bộ ra

// Middleware: simple device key check (useful for ESP32 devices)
function requireDeviceKey(req, res, next) {
	const expected = process.env.DEVICE_KEY || null;
	if (!expected) return next(); // no device key configured -> allow
	const key = req.headers['x-device-key'] || req.headers['x_device_key'] || req.headers['device-key'];
	if (!key || key !== expected) {
		return res.status(401).json({ error: 'Invalid or missing device key' });
	}
	next();
}

// Mở đường link POST để đón ESP32, khi có khách thì đưa vào hàm nhanDuLieuESP
router.post('/du-lieu-esp', requireDeviceKey, DeviceController.nhanDuLieuESP);
router.post('/api/sensor-data', requireDeviceKey, DeviceController.nhanDuLieuESP);

module.exports = router;
