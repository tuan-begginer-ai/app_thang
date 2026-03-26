import { useState } from 'react'

export default function BoldSignTest() {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleTest = async () => {
    if (!window.boldSignAPI) {
      setStatus({
        success: false,
        message: 'Ứng dụng đang chạy trong trình duyệt. Vui lòng mở bằng ứng dụng Electron (lệnh npm run electron:dev) để test BoldSign.'
      })
      return
    }

    setLoading(true)
    setStatus(null)
    try {
      const result = await window.boldSignAPI.testConnection()
      setStatus(result)
    } catch (err) {
      setStatus({ success: false, message: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', zIndex: 10000, position: 'relative', background: 'white', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
      <h3>Test kết nối BoldSign</h3>

      <button onClick={handleTest} disabled={loading} style={{ padding: '8px 16px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
        {loading ? 'Đang kiểm tra...' : 'Kiểm tra kết nối'}
      </button>

      {status && (
        <div style={{
          marginTop: '12px',
          padding: '12px',
          borderRadius: '8px',
          background: status.success ? '#e6f4ea' : '#fce8e6',
          color: status.success ? '#1e7e34' : '#c0392b'
        }}>
          {status.success
            ? `✅ ${status.message} — Tìm thấy ${status.documentCount} tài liệu`
            : `❌ Lỗi: ${status.message}`
          }
        </div>
      )}
    </div>
  )
}
