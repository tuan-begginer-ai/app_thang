# Kế hoạch Tích hợp BoldSign Authorization Code Flow

## Bối cảnh & Vấn đề cốt lõi

Bạn muốn thử nghiệm phương thức **Authorization Code Flow + PKCE** của BoldSign song song với phương thức **Client Credentials** hiện tại, mà không gây ảnh hưởng gì đến hoạt động cũ.

### Thông tin đã xác nhận từ tài liệu BoldSign

| Thông số | Giá trị |
|---|---|
| Authorization endpoint | `https://account.boldsign.com/connect/authorize` |
| Token endpoint | `https://account.boldsign.com/connect/token` |
| PKCE | **Bắt buộc** (method: `S256`) |
| Redirect URI đã đăng ký | `http://localhost:5173/` |
| Callback mechanism | Browser **redirect** (HTTP 302) đến `redirect_uri?code=...` |
| Scopes cần thiết | `openid offline_access BoldSign.Documents.All` |
| Refresh Token | Single-use (xoay vòng sau mỗi lần refresh) |

## Phân tích kiến trúc quan trọng

> [!IMPORTANT]
> **Điểm quyết định:** Redirect URI `http://localhost:5173/` là địa chỉ của **Vite Dev Server** (React app). Điều này có nghĩa là sau khi người dùng đăng nhập, BoldSign sẽ redirect **trình duyệt ngoài (Electron BrowserWindow)** về địa chỉ này.  
> Thay vì dùng một Express server tạm thời trên cổng khác, ta phải **xử lý callback ngay trong React app** ở route `/boldsign/callback`.

### Luồng hoạt động

```
[Electron Main] → tạo BrowserWindow → mở URL đăng nhập BoldSign
      ↓
[BoldSign] → User đăng nhập → redirect về http://localhost:5173/boldsign/callback?code=xxx
      ↓
[React App] → /boldsign/callback → đọc ?code= từ URL → gửi sang Main via IPC
      ↓
[Electron Main] → nhận code → gọi /connect/token → lưu token → đóng BrowserWindow
```

## Proposed Changes

---

### Component 1: Cấu hình & Quản lý Settings

#### [MODIFY] [main.cjs](file:///d:/app/project_Thang/app_doctor/electron/main.cjs)

Thêm vào **sau** phần `db-delete-patient` handler (dòng 102):

**Các hàm và handlers mới thêm:**
- `SETTINGS_FILE`: đường dẫn file JSON để lưu cấu hình auth
- `saveSettings(data)` / `getSettings()`: đọc/ghi cấu hình
- `ipcMain.handle('settings:get')` + `ipcMain.handle('settings:save')`: IPC handler cho settings
- `getBoldSignAccessToken()`: **Dispatcher** — tự động chọn Client Credentials hoặc Auth Code
- `getBoldSignClientCredentialsToken()`: logic cũ, đổi tên từ [getBoldSignToken](file:///d:/app/project_Thang/app_doctor/electron/main.cjs#104-119)
- `getBoldSignAuthCodeToken()`: kiểm tra token còn hiệu lực hoặc dùng refresh token
- `refreshAuthCodeToken(refreshToken)`: gọi endpoint refresh token
- PKCE helpers: `generateCodeVerifier()`, `generateCodeChallenge(verifier)`

**IPC Handlers mới:**
- `ipcMain.handle('boldsign:start-login')`: tạo PKCE, mở BrowserWindow đăng nhập BoldSign, lưu `codeVerifier` tạm thời vào biến module
- `ipcMain.handle('boldsign:exchange-code', (event, code))`: nhận `code` từ React, gọi token endpoint, lưu token vào settings

**Thay đổi trên các handlers hiện có:**
- Đổi tất cả [getBoldSignToken()](file:///d:/app/project_Thang/app_doctor/electron/main.cjs#104-119) → `getBoldSignAccessToken()` (5 handlers)

---

### Component 2: React Callback Route

#### [NEW] [src/components/BoldSignCallback.jsx](file:///d:/app/project_Thang/app_doctor/src/components/BoldSignCallback.jsx)

Tạo mới component này. Khi React app load tại `/boldsign/callback`:
1. Đọc `?code=` từ `window.location.href`
2. Gọi `window.boldSignAPI.exchangeCode(code)`
3. Hiển thị "Đăng nhập thành công" rồi `window.close()` hoặc điều hướng về trang chính

> [!NOTE]
> Trong Electron, Vite dev server tại port 5173 phục vụ cùng một React app. React dùng client-side routing (React Router hoặc điều kiện đơn giản), nên ta cần thêm logic: **nếu URL chứa `/boldsign/callback`** → render component Callback thay vì app chính.

#### [MODIFY] [src/App.jsx](file:///d:/app/project_Thang/app_doctor/src/App.jsx)

Thêm logic routing đơn giản ở đầu component:
```js
if (window.location.pathname === '/boldsign/callback') {
  return <BoldSignCallback />;
}
```

---

### Component 3: Preload Script

#### [MODIFY] [electron/preload.js](file:///d:/app/project_Thang/app_doctor/electron/preload.js)

Thêm vào `boldSignAPI`:
```js
startLogin:   () => ipcRenderer.invoke('boldsign:start-login'),
exchangeCode: (code) => ipcRenderer.invoke('boldsign:exchange-code', code),
getSettings:  () => ipcRenderer.invoke('settings:get'),
saveSettings: (data) => ipcRenderer.invoke('settings:save', data),
```

---

### Component 4: Giao diện Thử nghiệm

#### [MODIFY] [src/components/BoldSignTest.jsx](file:///d:/app/project_Thang/app_doctor/src/components/BoldSignTest.jsx)

Cập nhật UI để:
- Hiển thị dropdown chọn phương thức xác thực (lưu vào settings)
- Nút **"Đăng nhập BoldSign"** (gọi `startLogin`) — chỉ hiển thị khi chọn auth code
- Sau khi đăng nhập, nút **"Kiểm tra kết nối"** hoạt động với token auth code
- Hiển thị trạng thái đăng nhập (đã đăng nhập / chưa đăng nhập)

---

## Cập nhật cần thực hiện trước khi chạy

> [!IMPORTANT]
> **Bắt buộc phải làm trước:** Đăng nhập BoldSign App Settings, vào cấu hình ứng dụng "My Test", xác nhận rằng Redirect URI đã có: `http://localhost:5173/`  
> *(Nếu đúng thì không cần làm gì thêm trên BoldSign portal)*

> [!WARNING]
> **Ứng dụng phải đang chạy dev server** (`npm run dev` hoặc `npm run electron:dev`) tại cổng 5173 mới hoạt động được, vì đó là địa chỉ BoldSign redirect về.

---

## Kế hoạch Kiểm tra

### Kiểm tra thủ công (Manual)

1. Chạy ứng dụng: `npm run electron:dev`
2. Mở component **"Cấu hình & Test BoldSign"**
3. Chọn phương thức: `Authorization Code (Thử nghiệm)`
4. Nhấn nút **"Đăng nhập BoldSign"** → Một cửa sổ Electron mới mở ra với trang đăng nhập BoldSign
5. Đăng nhập bằng tài khoản BoldSign → BoldSign redirect về `http://localhost:5173/boldsign/callback?code=...`
6. Component `BoldSignCallback` hiển thị thông báo "Đang xử lý..." → rồi "Đăng nhập thành công!"
7. Cửa sổ đăng nhập tự đóng, quay lại app chính
8. Nhấn **"Kiểm tra kết nối"** → phải thành công và hiển thị số tài liệu
9. **Kiểm tra phương thức cũ:** Chuyển lại về `Client Credentials` → Kiểm tra kết nối vẫn hoạt động bình thường

### Kiểm tra token lưu trữ

Sau bước 6, kiểm tra file settings tại:  
`%APPDATA%\app-doctor\boldsign-settings.json` — phải có `authCodeToken` với `access_token`, `refresh_token`, `expiresAt`
