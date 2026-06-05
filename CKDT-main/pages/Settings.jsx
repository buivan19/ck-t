import { useApp } from '../context/AppContext'

export default function Settings() {
  const { autoRefresh, setAutoRefresh } = useApp()

  return (
    <div className="main-content">
      <div className="page-title">Cài đặt</div>

      {/* General settings */}
      <div className="settings-section">
        <h3>Cấu hình chẩn đoán & hệ thống</h3>

        <div className="setting-row">
          <div>
            <div className="setting-label">Ngưỡng nhiệt độ cảnh báo (Tiêu chuẩn lâm sàng)</div>
            <div className="setting-desc">Nhiệt độ da vượt quá ngưỡng này sẽ kích hoạt chẩn đoán nguy cơ</div>
          </div>
          <div className="setting-right">
            <span style={{ fontWeight: 700, fontSize: 16, color: '#ef4444' }}>37.5</span>
            <span className="setting-unit">°C</span>
          </div>
        </div>

        <div className="setting-row">
          <div>
            <div className="setting-label">Ngưỡng độ ẩm cảnh báo (Tiêu chuẩn lâm sàng)</div>
            <div className="setting-desc">Độ ẩm da vượt quá ngưỡng này báo hiệu đổ nhiều mồ hôi và kích ứng da</div>
          </div>
          <div className="setting-right">
            <span style={{ fontWeight: 700, fontSize: 16, color: '#0284c7' }}>80</span>
            <span className="setting-unit">%</span>
          </div>
        </div>

        <div className="setting-row">
          <div>
            <div className="setting-label">Tự động làm mới</div>
            <div className="setting-desc">Cập nhật dữ liệu từ ESP32 theo thời gian thực</div>
          </div>
          <div className="setting-right">
            <button
              className={`toggle ${autoRefresh ? '' : 'off'}`}
              onClick={() => setAutoRefresh(v => !v)}
              aria-label="Toggle auto refresh"
            />
          </div>
        </div>
      </div>

      {/* System info */}
      <div className="settings-section">
        <h3>Về hệ thống</h3>
        {[
          ['Phiên bản:', '1.0.0'],
          ['Tên hệ thống:', 'Urticaria Monitoring System'],
          ['Cập nhật lần cuối:', new Date().toLocaleDateString('vi-VN')],
        ].map(([k, v]) => (
          <div key={k} className="setting-row">
            <div className="setting-label">{k}</div>
            <div style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
