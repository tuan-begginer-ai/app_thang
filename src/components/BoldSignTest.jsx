import { useState, useEffect } from 'react'

export default function BoldSignTest() {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)
  const [settings, setSettings] = useState({ authMethod: 'client_credentials' })
  const [loggedInUsers, setLoggedInUsers] = useState([])
  const [loginEmail, setLoginEmail] = useState('') // Email người dùng nhập trước khi đăng nhập
  const [showLoginInput, setShowLoginInput] = useState(false)

  useEffect(() => {
    if (window.boldSignAPI) {
      window.boldSignAPI.getSettings().then(setSettings)
      refreshLoggedInUsers()
    }
  }, [])

  const refreshLoggedInUsers = async () => {
    if (window.boldSignAPI && window.boldSignAPI.getLoggedInUsers) {
      const users = await window.boldSignAPI.getLoggedInUsers()
      setLoggedInUsers(users)
    }
  }

  const handleCopy = (text) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    // Nhắc ngắn gọn không dùng alert để tránh chặn UI
    setStatus({ success: true, message: `Đã sao chép: ${text}` })
    setTimeout(() => setStatus(null), 2000)
  }

  const handleToggleAuth = async (e) => {
    const newMethod = e.target.value
    const newSettings = { ...settings, authMethod: newMethod }
    setSettings(newSettings)
    await window.boldSignAPI.saveSettings(newSettings)
  }

  const handleLoginConfirm = async () => {
    const email = loginEmail.trim()
    if (!email || !email.includes('@')) {
      setStatus({ success: false, message: 'Vui lòng nhập email hợp lệ trước khi đăng nhập.' })
      return
    }
    setShowLoginInput(false)
    setStatus(null)
    setLoading(true)
    try {
      // Gửi email lên main process để dùng làm key lưu token
      const result = await window.boldSignAPI.startLogin({ userEmail: email })
      if (result.success) {
        setStatus(null) // Không hiện lại thông báo thành công ở dưới vì đã có trong danh sách
        setLoginEmail('')
        refreshLoggedInUsers()
      } else {
        setStatus({ success: false, message: result.message || 'Đã đóng cửa sổ đăng nhập' })
      }
    } catch (err) {
      setStatus({ success: false, message: 'Lỗi khi đăng nhập: ' + err.message })
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async (email) => {
    if (!window.boldSignAPI) return
    await window.boldSignAPI.logoutUser(email)
    refreshLoggedInUsers()
    setStatus(null)
  }

  const handleTest = async (email = null) => {
    if (!window.boldSignAPI) {
      setStatus({ success: false, message: 'Vui lòng chạy bằng Electron để test BoldSign.' })
      return
    }
    setLoading(true)
    setStatus(null)
    try {
      // Nếu không truyền email, test email đầu tiên trong danh sách (hoặc null nếu dùng Client Credentials)
      const testEmail = email || loggedInUsers[0] || null
      const result = await window.boldSignAPI.testConnection({ userEmail: testEmail })
      
      // Gắn thêm email vào thông báo để người dùng biết đang test cái nào
      const prefix = testEmail ? `[${testEmail}] ` : ''
      setStatus({ ...result, message: prefix + result.message })
    } catch (err) {
      setStatus({ success: false, message: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '16px', fontFamily: 'sans-serif', zIndex: 10000, position: 'relative', background: 'white', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', maxWidth: '340px' }}>
      <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '15px' }}>⚙️ Cấu hình BoldSign</h3>

      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', fontSize: '11px', color: '#666', marginBottom: '4px' }}>Phương thức xác thực:</label>
        <select value={settings.authMethod} onChange={handleToggleAuth} style={{ padding: '5px', width: '100%', borderRadius: '4px', border: '1px solid #ccc', fontSize: '12px' }}>
          <option value="client_credentials">Client Credentials (Server)</option>
          <option value="authorization_code">Authorization Code (Bác sĩ)</option>
        </select>
      </div>

      {settings.authMethod === 'authorization_code' && (
        <div style={{ marginBottom: '12px' }}>
          {/* Header danh sách */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold' }}>Tài khoản đã đăng nhập:</span>
            <button
              onClick={() => { setShowLoginInput(true); setStatus(null); }}
              disabled={loading}
              style={{ fontSize: '11px', padding: '3px 8px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              + Đăng nhập mới
            </button>
          </div>

          {/* Form nhập email trước khi đăng nhập */}
          {showLoginInput && (
            <div style={{ background: '#f0f7ff', border: '1px solid #b3d7ff', borderRadius: '4px', padding: '8px', marginBottom: '6px' }}>
              <div style={{ fontSize: '11px', color: '#444', marginBottom: '5px' }}>
                Nhập email BoldSign của bạn để liên kết với phiên đăng nhập:
              </div>
              <input
                type="email"
                placeholder="your@email.com"
                value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLoginConfirm()}
                autoFocus
                style={{ width: '100%', padding: '5px 8px', fontSize: '12px', borderRadius: '3px', border: '1px solid #aaa', boxSizing: 'border-box', marginBottom: '6px' }}
              />
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={handleLoginConfirm}
                  disabled={loading}
                  style={{ flex: 1, padding: '5px', background: '#28a745', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}
                >
                  {loading ? 'Đang mở...' : '🔐 Mở đăng nhập BoldSign'}
                </button>
                <button
                  onClick={() => { setShowLoginInput(false); setLoginEmail('') }}
                  style={{ padding: '5px 8px', background: '#eee', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '11px' }}
                >
                  Hủy
                </button>
              </div>
            </div>
          )}

          {/* Danh sách tài khoản */}
          <div style={{ maxHeight: '120px', overflowY: 'auto', border: '1px solid #eee', borderRadius: '4px', padding: '5px' }}>
            {loggedInUsers.length === 0 ? (
              <div style={{ fontSize: '11px', color: '#888', fontStyle: 'italic', padding: '3px' }}>Chưa có tài khoản nào.</div>
            ) : (
              loggedInUsers.map(email => (
                <div key={email} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', padding: '5px 2px', borderBottom: '1px solid #f5f5f5' }}>
                  <span
                    title={email}
                    style={{ color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '185px' }}
                  >
                    {email}
                  </span>
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                    <button onClick={() => handleTest(email)} style={{ background: 'none', border: 'none', color: '#28a745', cursor: 'pointer', fontSize: '10px', padding: 0 }}>Test</button>
                    <button onClick={() => handleCopy(email)} style={{ background: 'none', border: 'none', color: '#1a73e8', cursor: 'pointer', fontSize: '10px', padding: 0 }}>Copy</button>
                    <button onClick={() => handleLogout(email)} style={{ background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer', fontSize: '10px', padding: 0 }}>Xóa</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}


      {/* Đối với Client Credentials (Server), vẫn hiển thị nút check chung */}
      {settings.authMethod === 'client_credentials' && (
        <button onClick={() => handleTest()} disabled={loading} style={{ width: '100%', padding: '8px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', marginBottom: '10px' }}>
          {loading ? 'Đang xử lý...' : '🔍 Kiểm tra kết nối API (Server)'}
        </button>
      )}
      {status && (
        <div style={{
          marginTop: '10px',
          padding: '8px 10px',
          borderRadius: '4px',
          background: status.success ? '#e6f4ea' : '#fce8e6',
          color: status.success ? '#1e7e34' : '#c0392b',
          fontSize: '11px',
          lineHeight: '1.5',
          wordBreak: 'break-all'
        }}>
          {status.success
            ? `${status.message}${status.documentCount !== undefined ? ` (${status.documentCount} tài liệu)` : ''}`
            : `❌ ${status.message}`
          }
        </div>
      )}
    </div>
  )
}
