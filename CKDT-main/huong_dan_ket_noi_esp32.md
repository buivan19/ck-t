# HƯỚNG DẪN KẾT NỐI ESP32 VỚI HỆ THỐNG GIÁM SÁT MỀ ĐAY (URTICARIA MONITORING SYSTEM)

Tài liệu này hướng dẫn chi tiết cách kết nối **3 đầu thiết bị/ứng dụng** lại với nhau để dữ liệu cảm biến đo được từ ESP32 hiển thị trực tiếp theo thời gian thực (real-time) lên ứng dụng Web.

---

## Sơ Đồ Hoạt Động (3 Đầu Kết Nối)

```
  [1. Thiết bị ESP32 (Đầu cuối)] 
                │
                │ HTTP POST (JSON) qua Wi-Fi
                ▼
  [2. Máy tính / Backend Server (Node.js - Cổng 8000)] <───> [MySQL Database]
                │
                │ Socket.IO (Real-time Broadcast)
                ▼
  [3. Web Application (React/Vite - Cổng 5173)]
```

---

## BƯỚC 1: Chuẩn Bị Mạng Wi-Fi & Tìm IP Máy Tính

> ⚠️ **Quy tắc quan trọng nhất:** Thiết bị ESP32 và Máy tính chạy Server **PHẢI** cùng kết nối vào một mạng Wi-Fi (hoặc cùng một router mạng cục bộ).

1. Trên Máy tính chạy Web App, mở **Command Prompt (cmd)** hoặc **PowerShell**.
2. Nhập lệnh sau và nhấn **Enter**:
   ```powershell
   ipconfig
   ```
3. Tìm phần card mạng Wi-Fi đang kết nối (`Wireless LAN adapter Wi-Fi`), tìm dòng **IPv4 Address**.
   * *Ví dụ:* `192.168.1.15` (Đây chính là địa chỉ IP cục bộ của máy tính bạn). Hãy ghi lại IP này.

---

## BƯỚC 2: Cài Đặt & Nạp Code Lên ESP32

Chúng tôi đã chuẩn bị sẵn file code Arduino tại: `esp32_sensor_sender/esp32_sensor_sender.ino` trong thư mục dự án.

1. Mở file [esp32_sensor_sender.ino](file:///c:/Users/Admin/CKDT/CKDT-main/esp32_sensor_sender/esp32_sensor_sender.ino) bằng phần mềm **Arduino IDE**.
2. Chỉnh sửa các thông số sau ở phần đầu code:
   * `ssid`: Thay bằng tên Wi-Fi của bạn (ví dụ: `"MyHomeWiFi"`).
   * `password`: Thay bằng mật khẩu Wi-Fi của bạn (ví dụ: `"12345678"`).
   * `serverIP`: Thay bằng địa chỉ **IPv4 Address** của máy tính đã tìm thấy ở **Bước 1** (ví dụ: `"192.168.1.15"`).
   * `USE_REAL_DHT_SENSOR`:
     * Đặt là `false` để chạy thử nghiệm bằng dữ liệu giả lập sinh ra từ ESP32 (không cần nối cảm biến vật lý).
     * Đặt là `true` nếu bạn đã đấu nối cảm biến DHT11/DHT22 vào chân `GPIO 4` của ESP32.
3. Chọn board **ESP32 Dev Module** (hoặc loại board tương ứng của bạn) cùng cổng COM trong Arduino IDE.
4. Nhấn nút **Upload (Nạp code)** lên ESP32.
5. Sau khi nạp code thành công, mở **Serial Monitor** trong Arduino IDE, chọn tốc độ baud là **115200**.
6. ESP32 sẽ hiển thị thông báo kết nối Wi-Fi và in địa chỉ MAC ra màn hình:
   * *Ví dụ:* `[ESP32 MAC] Dia chi MAC cua thiet bi la: 24:0A:C4:B1:C2:A3`
   * **Hãy copy/ghi lại mã MAC này**, bạn sẽ cần nó để đăng ký thiết bị trên Web App.

---

## BƯỚC 3: Khởi Động Backend Server & Database

1. Đảm bảo phần mềm quản trị cơ sở dữ liệu MySQL (ví dụ **XAMPP** hoặc **MySQL Installer**) đang chạy và Database có tên `urticaria_monitoring` đã được thiết lập.
   * *Mẹo:* Nếu đây là lần đầu tiên cài đặt, bạn có thể chạy lệnh sau trong thư mục dự án để tự tạo cấu trúc bảng biểu DB:
     ```powershell
     node setup_db.js
     ```
2. Mở cửa sổ Terminal/PowerShell trong VS Code tại thư mục `CKDT-main` và chạy lệnh sau để khởi động Backend:
   ```powershell
   npm run start-server
   ```
   * Bạn sẽ thấy thông báo:
     `[DB] Ket noi MySQL thanh cong!` và
     `[Server] Urticaria Monitoring System listening at http://localhost:8000`

---

## BƯỚC 4: Khởi Động Frontend Web Application

1. Mở thêm một cửa sổ Terminal mới trong VS Code tại thư mục `CKDT-main` và chạy lệnh sau để bật giao diện Web App:
   ```powershell
   npm run dev
   ```
2. Mở trình duyệt Web (Chrome/Edge) và truy cập đường link: `http://localhost:5173`

---

## BƯỚC 5: Đăng Ký và Liên Kết Thiết Bị với Bệnh Nhân

Để hệ thống hiển thị đúng dữ liệu đo của ESP32 cho bệnh nhân, địa chỉ MAC của ESP32 phải được liên kết với một hồ sơ bệnh nhân trong hệ thống. Bạn có 2 cách thực hiện:

### Cách A: Giao Diện Quản Trị (Dành cho Bác sĩ & Kỹ sư)
1. Trên giao diện Web (`http://localhost:5173`), đăng nhập bằng tài khoản Kỹ sư:
   * **Email:** `engineer@hospital.com`
   * **Mật khẩu:** `123456`
2. Truy cập tab **Thiết bị** (Devices), bấm nút **Thêm thiết bị mới**.
3. Nhập địa chỉ MAC bạn lấy từ Serial Monitor (ví dụ: `24:0A:C4:B1:C2:A3`) và nhập vị trí rồi bấm Lưu.
4. Đăng xuất, sau đó đăng nhập bằng tài khoản Bác sĩ:
   * **Email:** `bacsi@hospital.com`
   * **Mật khẩu:** `123456`
5. Tại trang chủ Dashboard, bấm **Tạo phiên giám sát mới**, chọn bệnh nhân muốn theo dõi và chọn thiết bị có mã MAC của ESP32 bạn vừa thêm.
6. Hệ thống sẽ bắt đầu lắng nghe và vẽ biểu đồ realtime ngay khi ESP32 gửi gói tin lên!

### Cách B: Giao Diện Khách Hàng (Bệnh nhân tự nhận thiết bị)
1. Đăng nhập bằng tài khoản Bệnh nhân:
   * **Email:** `benhnhan@hospital.com`
   * **Mật khẩu:** `123456`
2. Tại trang Dashboard cá nhân của bệnh nhân, nhập địa chỉ MAC (ví dụ: `24:0A:C4:B1:C2:A3`) hoặc Tag của ESP32 vào khung **Nhận thiết bị (Claim Device)**.
3. Bấm **Claim thiết bị**. Hệ thống sẽ tự động đăng ký MAC này vào database và liên kết nó trực tiếp vào tài khoản bệnh nhân này để theo dõi.

---

## Kiểm Tra & Khắc Phục Sự Cố (Troubleshooting)

* **ESP32 báo lỗi kết nối `Loi: Khong the ket noi Wi-Fi`:**
  * Kiểm tra lại chính xác tên Wi-Fi (SSID) và mật khẩu Wi-Fi của bạn trong Arduino Code (phân biệt viết hoa/thường). ESP32 chỉ hỗ trợ băng tần Wi-Fi **2.4GHz**, không hỗ trợ Wi-Fi 5GHz.
* **ESP32 báo lỗi kết nối `Loi ket noi den Server. Ma loi: -1`:**
  * Kiểm tra xem máy tính của bạn và ESP32 có thực sự đang dùng chung 1 router Wi-Fi hay không.
  * Hãy đảm bảo rằng bạn đã chỉnh sửa biến `serverIP` thành đúng IP của máy tính, không được để `localhost` hay `127.0.0.1` trong Arduino code.
  * Kiểm tra xem Tường lửa (Windows Firewall) trên máy tính có đang chặn cổng `8000` không. Hãy tạm tắt tường lửa hoặc cấp quyền cho phép lưu lượng mạng đi qua cổng này.
* **ESP32 gửi thành công (HTTP Code 200) nhưng Web App không vẽ biểu đồ:**
  * Đảm bảo thiết bị đã được liên kết với một bệnh nhân trong phiên giám sát đang hoạt động (Active Session) ở **Bước 5**. Nếu thiết bị chưa được liên kết, Server sẽ báo lỗi `409: Thiết bị chưa được gán cho bệnh nhân`.
