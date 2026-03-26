import { useState } from 'react'

export default function SignatureRequest({ patientName, getPdfBase64 }) {
  const [doctorName,  setDoctorName]  = useState('Bác sĩ Phan Quốc Bình')
  const [doctorEmail, setDoctorEmail] = useState('')
  const [loading,         setLoading]         = useState(false)
  const [loadingEmbedded, setLoadingEmbedded] = useState(false)
  const [result,          setResult]          = useState(null)
  const [documentId,  setDocumentId]  = useState(null)
  const [status,      setStatus]      = useState(null)

  // Gửi phiếu khám lên BoldSign để Bác sĩ ký
  const handleSend = async () => {
    if (!doctorName || !doctorEmail) {
      alert('Vui lòng nhập tên và email Bác sĩ')
      return
    }

    if (!window.boldSignAPI) {
        alert('BoldSign API không khả dụng. Vui lòng chạy ứng dụng trong Electron.')
        return
    }

    setLoading(true)
    try {
        const pdfBase64 = await getPdfBase64();
        if (!pdfBase64) {
            alert('Không thể tạo nội dung PDF để gửi ký.')
            setLoading(false)
            return
        }

        const res = await window.boldSignAPI.sendForSignature({
            pdfBase64,
            doctorName,
            doctorEmail,
            patientName
        })
        setResult(res)
        if (res.success) setDocumentId(res.documentId)
    } catch (err) {
        setResult({ success: false, message: err.message })
    } finally {
        setLoading(false)
    }
  }

  // Mở trang BoldSign để tự kéo thả vị trí chữ ký
  const handleEmbeddedSend = async () => {
    if (!doctorName || !doctorEmail) {
      alert('Vui lòng nhập tên và email Bác sĩ')
      return
    }

    if (!window.boldSignAPI) {
      alert('BoldSign API không khả dụng. Vui lòng chạy ứng dụng trong Electron.')
      return
    }

    setLoadingEmbedded(true)
    try {
      const pdfBase64 = await getPdfBase64();
      if (!pdfBase64) {
        alert('Không thể tạo nội dung PDF để gửi ký.')
        setLoadingEmbedded(false)
        return
      }

      const res = await window.boldSignAPI.createEmbeddedRequest({
        pdfBase64,
        doctorName,
        doctorEmail,
        patientName
      })

      if (res.success) {
        setDocumentId(res.documentId)
        // Mở URL trang BoldSign trong trình duyệt
        window.open(res.sendUrl, '_blank')
      } else {
        setResult(res)
      }
    } catch (err) {
      setResult({ success: false, message: err.message })
    } finally {
      setLoadingEmbedded(false)
    }
  }

  // Kiểm tra Bác sĩ đã ký chưa
  const handleCheckStatus = async () => {
    if (!documentId) return
    const res = await window.boldSignAPI.checkStatus(documentId)
    setStatus(res)
  }

  // Tải PDF đã ký về máy
  const handleDownload = async () => {
    if (!documentId) return
    const res = await window.boldSignAPI.downloadSigned(documentId)
    if (res.success) alert(`✅ Đã lưu PDF đã ký tại: ${res.savedTo}`)
    else if (res.message !== 'Đã hủy lưu file') alert(`❌ Lỗi: ${res.message}`)
  }

  return (
    <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: '15px', marginTop: '16px', background: '#fff' }}>
      <h5 style={{ marginTop: 0, marginBottom: '10px' }}>🖊️ Yêu cầu ký số phiếu khám</h5>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: '100%' }}>
        <input
          placeholder="Tên Bác sĩ"
          value={doctorName}
          onChange={e => setDoctorName(e.target.value)}
          style={{ padding: '6px 12px', borderRadius: 4, border: '1px solid #ccc', fontSize: '13px' }}
        />
        <input
          placeholder="Email Bác sĩ"
          type="email"
          value={doctorEmail}
          onChange={e => setDoctorEmail(e.target.value)}
          style={{ padding: '6px 12px', borderRadius: 4, border: '1px solid #ccc', fontSize: '13px' }}
        />
        <button
          onClick={handleSend}
          disabled={loading || loadingEmbedded}
          style={{ padding: '8px', background: '#1a73e8', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold' }}
        >
          {loading ? '⏳ Đang gửi...' : '📨 Gửi yêu cầu ký'}
        </button>

        <button
          onClick={handleEmbeddedSend}
          disabled={loading || loadingEmbedded}
          style={{ padding: '8px', background: '#7b1fa2', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold' }}
        >
          {loadingEmbedded ? '⏳ Đang tạo...' : '🖊️ Mở trang ký (Tùy chỉnh vị trí)'}
        </button>
      </div>

      {result && (
        <div style={{
          marginTop: 10, padding: 8, borderRadius: 4, fontSize: '12px',
          background: result.success ? '#e8f5e9' : '#fce4e4',
          color: result.success ? '#2e7d32' : '#c62828'
        }}>
          {result.success
            ? <>✅ {result.message}<br/><small>ID: <code>{result.documentId.substring(0,8)}...</code></small></>
            : `❌ ${result.message}`
          }
        </div>
      )}

      {documentId && (
        <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={handleCheckStatus}
            style={{ padding: '6px 10px', borderRadius: 4, border: '1px solid #999', cursor: 'pointer', fontSize: '12px' }}>
            🔍 Kiểm tra
          </button>
          <button onClick={handleDownload}
            style={{ padding: '6px 10px', borderRadius: 4, border: '1px solid #1a73e8', color: '#1a73e8', cursor: 'pointer', fontSize: '12px', background: 'transparent' }}>
            ⬇️ Tải PDF đã ký
          </button>
        </div>
      )}

      {status && (
        <div style={{ marginTop: 8, padding: 8, background: '#f5f5f5', borderRadius: 4, fontSize: '12px' }}>
          Trạng thái: <strong>{status.status === 'Completed' ? '✅ Hoàn thành' : status.status}</strong><br/>
          Bác sĩ: <strong>{(status.signerStatus === 'Signed' || status.status === 'Completed') ? '✅ Đã ký' : '⏳ Chưa ký'}</strong>
        </div>
      )}
    </div>
  )
}
