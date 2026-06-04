// ============================================================
// esp32_simulator.js — Giả lập NHIỀU ESP32 cùng lúc
// ============================================================
// Cách dùng:
//   node esp32_simulator.js                → tự động lấy tất cả session đang active
//   node esp32_simulator.js <session_id>   → chạy 1 session cụ thể
//
// Mỗi ESP32 ảo sẽ gửi data độc lập mỗi 3 giây.
// ============================================================

const API_URL  = 'http://localhost:8000/api';
const INTERVAL = 3000; // ms

// ── Giả lập 1 thiết bị ──────────────────────────────────────
function simulateDevice(sessionId, initialWeight = 500) {
  let weight = initialWeight;

  console.log(`[ESP-${sessionId.slice(0,8)}] Bắt đầu giả lập, trọng lượng ban đầu: ${weight}g`);

  const timer = setInterval(async () => {
    // Giả lập nhiễu tốc độ nhỏ giọt: 35–65 giọt/phút
    const dropRate = Math.floor(Math.random() * 31) + 35;

    // Dịch vơi dần 1–2g mỗi 3 giây
    weight -= (Math.random() * 2 + 1);
    if (weight < 30) weight = 30; // đáy bình

    const payload = {
      session_id:        sessionId,
      current_drop_rate: dropRate,
      current_weight:    parseFloat(weight.toFixed(2)),
    };

    try {
      const res = await fetch(`${API_URL}/du-lieu-esp`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });
      const data = await res.json();
      console.log(
        `[ESP-${sessionId.slice(0,8)}] ${payload.current_weight}g | ` +
        `${payload.current_drop_rate} g/p | còn ~${data.calculated_time ?? '?'} phút`
      );
    } catch {
      console.error(`[ESP-${sessionId.slice(0,8)}] ❌ Không kết nối được server!`);
    }
  }, INTERVAL);

  return timer;
}

// ── Tự động lấy các session đang chạy ────────────────────────
async function fetchActiveSessions() {
  try {
    const res  = await fetch(`${API_URL}/sessions`);
    const data = await res.json();
    // Lọc session còn active (không phải completed)
    return data.filter(s => s.status !== 'completed' && s.status !== 'urgent');
  } catch {
    console.error('❌ Không lấy được session từ server.');
    return [];
  }
}

// ── Main ─────────────────────────────────────────────────────
async function main() {
  console.log('🚀 ESP32 Multi-Simulator khởi động...\n');

  const argSessionId = process.argv[2]; // node esp32_simulator.js <id>

  if (argSessionId) {
    // Chạy 1 session được chỉ định thủ công
    console.log(`Chế độ: 1 session cụ thể\n`);
    simulateDevice(argSessionId, 500);
  } else {
    // Tự động detect tất cả session đang active
    console.log('Chế độ: tự động theo tất cả session đang hoạt động\n');

    const sessions = await fetchActiveSessions();

    if (sessions.length === 0) {
      console.log('⚠️  Không có session nào đang chạy.');
      console.log('   Hãy tạo phiên truyền trên web rồi chạy lại simulator này.');
      console.log('   Hoặc chạy: node esp32_simulator.js <session_id>\n');
      return;
    }

    console.log(`Tìm thấy ${sessions.length} session đang chạy:\n`);
    sessions.forEach((s, i) => {
      console.log(`  ${i+1}. ${s.patientName} — Phòng ${s.room} Giường ${s.bed} | ID: ${s.id}`);
    });
    console.log('');

    // Chạy tất cả cùng lúc, offset nhỏ để không gửi đúng 1 lúc
    sessions.forEach((s, i) => {
      setTimeout(() => {
        simulateDevice(s.id, s.volumeInitial || 500);
      }, i * 500); // cách nhau 0.5s để dễ đọc log
    });
  }
}

main();