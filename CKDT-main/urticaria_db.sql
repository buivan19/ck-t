CREATE DATABASE IF NOT EXISTS `urticaria_monitoring` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `urticaria_monitoring`;

DROP TABLE IF EXISTS `clinical_diagnoses`;
DROP TABLE IF EXISTS `sensor_logs`;
DROP TABLE IF EXISTS `devices`;
DROP TABLE IF EXISTS `patient_profiles`;
DROP TABLE IF EXISTS `users`;

-- Users Table
CREATE TABLE `users` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('engineer','doctor','patient','admin') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'patient',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Patient Profiles Table
CREATE TABLE `patient_profiles` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `user_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `full_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `age` int DEFAULT NULL,
  `gender` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `room_number` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bed_number` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_patient_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Devices Table
CREATE TABLE `devices` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `mac_address` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `device_tag` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('available','active','error') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'available',
  `patient_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `location` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT 'Kho thiết bị',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `mac_address` (`mac_address`),
  UNIQUE KEY `device_tag` (`device_tag`),
  CONSTRAINT `fk_device_patient` FOREIGN KEY (`patient_id`) REFERENCES `patient_profiles` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sensor Logs Table
CREATE TABLE `sensor_logs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `device_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `patient_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `temperature` decimal(5,2) NOT NULL,
  `humidity` decimal(5,2) NOT NULL,
  `recorded_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_sensor_device_time` (`device_id`,`recorded_at`),
  KEY `idx_sensor_patient_time` (`patient_id`,`recorded_at`),
  CONSTRAINT `fk_sensor_device` FOREIGN KEY (`device_id`) REFERENCES `devices` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sensor_patient` FOREIGN KEY (`patient_id`) REFERENCES `patient_profiles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Clinical Diagnoses Table
CREATE TABLE `clinical_diagnoses` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `patient_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `device_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `temperature` decimal(5,2) NOT NULL,
  `humidity` decimal(5,2) NOT NULL,
  `diagnosis_text` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('normal','warning','urgent') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'normal',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_diag_patient_time` (`patient_id`,`created_at`),
  CONSTRAINT `fk_diag_patient` FOREIGN KEY (`patient_id`) REFERENCES `patient_profiles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_diag_device` FOREIGN KEY (`device_id`) REFERENCES `devices` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed Data
-- 1. Seed Users
INSERT INTO `users` (`id`, `name`, `email`, `password_hash`, `role`) VALUES
('u1-doc-uuid-1111-2222-333333333333', 'Bác sĩ Nguyễn Văn A', 'bacsi@hospital.com', '123456', 'doctor'),
('u2-eng-uuid-1111-2222-333333333333', 'Kỹ sư Lê Văn B', 'engineer@hospital.com', '123456', 'engineer'),
('u3-pat-uuid-1111-2222-333333333333', 'Bệnh nhân Trần Thị C', 'benhnhan@hospital.com', '123456', 'patient');

-- 2. Seed Patient Profile for Patient User
INSERT INTO `patient_profiles` (`id`, `user_id`, `full_name`, `age`, `gender`, `phone`, `room_number`, `bed_number`) VALUES
('p1-pat-uuid-1111-2222-333333333333', 'u3-pat-uuid-1111-2222-333333333333', 'Trần Thị C', 28, 'Nữ', '0901234567', 'Phòng 201', 'Giường A');

-- 3. Seed Devices
INSERT INTO `devices` (`id`, `mac_address`, `device_tag`, `status`, `patient_id`, `location`) VALUES
('d1-dev-uuid-1111-2222-333333333333', 'AA:BB:CC:DD:EE:11', 'ESP32-01', 'active', 'p1-pat-uuid-1111-2222-333333333333', 'Phòng 201'),
('d2-dev-uuid-1111-2222-333333333333', 'AA:BB:CC:DD:EE:22', 'ESP32-02', 'available', NULL, 'Kho thiết bị');
