const pool = require('../config/pool');

async function run() {
  const conn = await pool.getConnection();
  try {
    console.log('Bắt đầu migrate thêm trường device_tag vào bảng devices...');

    try {
      await conn.query("ALTER TABLE devices ADD COLUMN device_tag varchar(100) DEFAULT NULL");
      console.log('Đã thêm cột device_tag.');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME' || err.code === 'ER_DUP_KEYNAME' || err.errno === 1060) {
        console.log('Cột device_tag đã tồn tại, bỏ qua bước tạo cột.');
      } else {
        throw err;
      }
    }

    try {
      await conn.query('ALTER TABLE devices ADD UNIQUE INDEX idx_devices_device_tag (device_tag)');
      console.log('Đã thêm chỉ mục UNIQUE cho device_tag.');
    } catch (err) {
      if (err.code === 'ER_DUP_KEYNAME' || err.errno === 1061) {
        console.log('Chỉ mục device_tag đã tồn tại, bỏ qua bước tạo chỉ mục.');
      } else {
        throw err;
      }
    }

    await conn.query('UPDATE devices SET device_tag = mac_address WHERE device_tag IS NULL');
    console.log('Đã đồng bộ device_tag với mac_address cho các thiết bị hiện tại.');

    console.log('Migrate hoàn tất.');
  } catch (err) {
    console.error('Migrate thất bại:', err && err.message ? err.message : err);
  } finally {
    try { conn.release(); } catch (e) {}
    process.exit(0);
  }
}

run();
