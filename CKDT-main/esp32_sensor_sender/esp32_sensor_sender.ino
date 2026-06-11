/*
 * =========================================================================
 * esp32_sensor_sender.ino
 * KẾT NỐI ESP32 VỚI CẢM BIẾN MLX90614 & DHT22 CHO HỆ THỐNG MỀ ĐAY
 * =========================================================================
 * 
 * SƠ ĐỒ ĐẤU NỐI DÂY (WIRING DIAGRAM):
 * 
 * 1. Cảm biến MLX90614 (Đo nhiệt độ da không tiếp xúc qua hồng ngoại):
 *    - VCC  ---> Chân 3.3V của ESP32
 *    - GND  ---> Chân GND của ESP32
 *    - SDA  ---> Chân GPIO 21 (chân SDA mặc định của ESP32)
 *    - SCL  ---> Chân GPIO 22 (chân SCL mặc định của ESP32)
 * 
 * 2. Cảm biến DHT22 (Đo nhiệt độ & độ ẩm phòng):
 *    - VCC  ---> Chân 3.3V hoặc 5V của ESP32
 *    - GND  ---> Chân GND của ESP32
 *    - DATA ---> Chân GPIO 4 (Có thể thay đổi tại biến `DHTPIN` bên dưới)
 *    * Lưu ý: Nếu dùng cảm biến DHT22 rời (không phải mạch module hàn sẵn), 
 *             hãy nối 1 điện trở 4.7k - 10k Ohm giữa chân VCC và chân DATA.
 * 
 * THƯ VIỆN CẦN CÀI ĐẶT TRÊN ARDUINO IDE (Vào Library Manager tìm và cài):
 * 1. "Adafruit MLX90614 Library" (Adafruit)
 * 2. "DHT sensor library" (Adafruit)
 * 3. "Adafruit Unified Sensor" (Thư viện phụ thuộc cho DHT)
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>

// ==========================================
// CẤU HÌNH THÔNG SỐ (BẮT BUỘC THAY ĐỔI)
// ==========================================
const char* ssid     = "TEN_WIFI_CUA_BAN";       // Tên Wi-Fi của bạn
const char* password = "MAT_KHAU_WIFI";          // Mật khẩu Wi-Fi của bạn

// Thay bằng IP cục bộ (Local IP) của máy tính chạy backend.
const char* serverIP = "192.168.1.15";           
const int serverPort = 8000;                     // Cổng server mặc định

// Khóa bảo mật thiết bị (nếu có cấu hình trong file .env của backend)
const char* deviceKey = ""; 

// Thời gian gửi dữ liệu định kỳ (5000 ms = 5 giây)
const unsigned long sendInterval = 5000; 

// ==========================================
// CẤU HÌNH PHẦN CỨNG & CẢM BIẾN
// ==========================================
#define USE_PHYSICAL_SENSORS false  // Đổi thành `true` nếu bạn đã lắp cảm biến thật.
                                    // Đổi thành `false` để GIẢ LẬP dữ liệu đo chạy thử.

// Cấu hình chân DHT22
#define DHTPIN 4
#define DHTTYPE DHT22

#if USE_PHYSICAL_SENSORS
  #include <Adafruit_MLX90614.h>
  #include <DHT.h>
  
  Adafruit_MLX90614 mlx = Adafruit_MLX90614();
  DHT dht(DHTPIN, DHTTYPE);
#endif

// ==========================================
// BIẾN TOÀN CỤC
// ==========================================
unsigned long lastSendTime = 0;
String espMacAddress = "";

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n=========================================");
  Serial.println("KHOI DONG THIET BI GIAM SAT DUAL-SENSOR...");
  Serial.println("=========================================");

  #if USE_PHYSICAL_SENSORS
    // Khởi động giao tiếp I2C cho MLX90614
    Wire.begin();
    if (!mlx.begin()) {
      Serial.println("[Error] Khong tim thay cam bien MLX90614! Kiem tra day SDA/SCL.");
      while (1); // Dừng lại nếu lỗi
    }
    // Khởi động cảm biến DHT22
    dht.begin();
    Serial.println("[Sensor] Khoi tao thanh cong MLX90614 & DHT22.");
  #else
    Serial.println("[Sensor] Chay che do GIẢ LẬP du lieu.");
  #endif

  // Kết nối Wi-Fi
  connectToWiFi();

  // Lấy địa chỉ MAC của ESP32
  espMacAddress = WiFi.macAddress();
  Serial.print("[ESP32 MAC] Dia chi MAC: ");
  Serial.println(espMacAddress);
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    connectToWiFi();
  }

  if (millis() - lastSendTime >= sendInterval) {
    lastSendTime = millis();
    
    float skinTemp = 0.0;
    float roomTemp = 0.0;
    float roomHumid = 0.0;

    #if USE_PHYSICAL_SENSORS
      // Đọc nhiệt độ đối tượng (nhiệt độ da) từ cảm biến hồng ngoại MLX90614
      skinTemp = mlx.readObjectTempC();
      
      // Đọc nhiệt độ và độ ẩm phòng từ DHT22
      roomTemp = dht.readTemperature();
      roomHumid = dht.readHumidity();

      // Kiểm tra lỗi cảm biến
      if (isnan(skinTemp) || isnan(roomTemp) || isnan(roomHumid)) {
        Serial.println("[Error] Loi doc cảm bien! Kiem tra cac dau day.");
        return;
      }
    #else
      // Giả lập dữ liệu ngẫu nhiên cho 3 chỉ số
      skinTemp = 36.5 + (random(-10, 20) / 10.0);   // Da ổn định hoặc sốt nhẹ (35.5 - 38.5)
      roomTemp = 26.0 + (random(-30, 60) / 10.0);   // Nhiệt độ phòng (23.0 - 32.0)
      roomHumid = 55.0 + random(-15, 25);           // Độ ẩm phòng (40% - 80%)
    #endif

    // Gửi gói tin lên Server
    sendMetricsToServer(skinTemp, roomTemp, roomHumid);
  }
}

void connectToWiFi() {
  Serial.print("[WiFi] Ket noi vao: ");
  Serial.println(ssid);
  
  WiFi.begin(ssid, password);
  
  int retry = 0;
  while (WiFi.status() != WL_CONNECTED && retry < 15) {
    delay(1000);
    Serial.print(".");
    retry++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WiFi] Da ket noi!");
    Serial.print("[WiFi] IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n[WiFi] ❌ Ket noi that bai!");
  }
}

void sendMetricsToServer(float skinT, float roomT, float roomH) {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  String serverUrl = "http://" + String(serverIP) + ":" + String(serverPort) + "/api/du-lieu-esp";
  
  http.begin(serverUrl);
  http.addHeader("Content-Type", "application/json");
  if (String(deviceKey).length() > 0) {
    http.addHeader("x-device-key", deviceKey);
  }

  /*
   * Xây dựng JSON payload gửi lên:
   * - device_mac: Địa chỉ MAC nhận diện thiết bị
   * - device_tag: Tên thiết bị (ví dụ 5 ký tự cuối của MAC)
   * - temperature: Nhiệt độ da (MLX90614) -> Bản chất là trường 'temperature' cũ trong DB
   * - room_temperature: Nhiệt độ phòng (DHT22) -> Cột mới thêm trong DB
   * - humidity: Độ ẩm phòng (DHT22) -> Bản chất là trường 'humidity' cũ trong DB
   */
  String jsonPayload = "{";
  jsonPayload += "\"device_mac\":\"" + espMacAddress + "\",";
  jsonPayload += "\"device_tag\":\"ESP32-" + espMacAddress.substring(espMacAddress.length() - 5) + "\",";
  jsonPayload += "\"temperature\":" + String(skinT, 2) + ",";
  jsonPayload += "\"room_temperature\":" + String(roomT, 2) + ",";
  jsonPayload += "\"humidity\":" + String(roomH, 2);
  jsonPayload += "}";

  Serial.println("\n[HTTP] Dang gui du lieu len Server...");
  Serial.print("[HTTP] Payload: ");
  Serial.println(jsonPayload);

  int httpCode = http.POST(jsonPayload);
  if (httpCode > 0) {
    String resp = http.getString();
    Serial.print("[HTTP] Server phan hoi (" + String(httpCode) + "): ");
    Serial.println(resp);
  } else {
    Serial.print("[HTTP] ❌ Loi ket noi. Code: ");
    Serial.println(httpCode);
  }
  
  http.end();
}
