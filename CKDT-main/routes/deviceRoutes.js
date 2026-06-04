//map URL với Controller
const express = require('express');
const router = express.Router();
const DeviceController = require('../controllers/DeviceController'); // Gọi não bộ ra

// Mở đường link POST để đón ESP32, khi có khách thì đưa vào hàm nhanDuLieuESP
router.post('/du-lieu-esp', DeviceController.nhanDuLieuESP);

module.exports = router;
