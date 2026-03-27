import { useEffect, useState } from 'react';

export default function BoldSignCallback() {
  const [status, setStatus] = useState('Đang xử lý đăng nhập...');
  const [error, setError] = useState(null);

  useEffect(() => {
    const processCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        
        if (code) {
          setStatus('Đang xác thực mã code...');
          await window.boldSignAPI.exchangeCode(code);
          setStatus('Đăng nhập thành công! Cửa sổ này sẽ tự đóng.');
          
          // Small delay before closing to let user see success
          setTimeout(() => {
             // In Electron, window.close() usually works if the window was opened via window.open 
             // or if it's a separate BrowserWindow.
             window.close();
          }, 1500);
        } else {
          setError('Không tìm thấy mã code trong URL.');
        }
      } catch (err) {
        console.error('Callback error:', err);
        setError('Lỗi khi đổi mã code: ' + err.message);
      }
    };

    processCallback();
  }, []);

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      height: '100vh',
      fontFamily: 'sans-serif',
      textAlign: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        padding: '30px',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        maxWidth: '400px'
      }}>
        <h2 style={{ color: error ? '#d32f2f' : '#1976d2' }}>
          {error ? '❌ Lỗi' : '🔒 BoldSign Auth'}
        </h2>
        
        <p style={{ fontSize: '16px', margin: '20px 0' }}>
          {error || status}
        </p>

        {error && (
          <button 
            onClick={() => window.close()}
            style={{
              padding: '10px 20px',
              background: '#555',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Đóng cửa sổ
          </button>
        )}
      </div>
    </div>
  );
}
