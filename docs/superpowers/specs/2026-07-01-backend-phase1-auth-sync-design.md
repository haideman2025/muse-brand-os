# Backend Phase 1 — Access-Code Auth + JSON Sync (đa thiết bị)

**Ngày:** 2026-07-01
**Repo:** muse-brand-os
**Bối cảnh:** App hiện 100% local (localStorage cho state `S`, IndexedDB cho ảnh).
Cần backend để: (1) đồng bộ đa thiết bị + không mất dữ liệu, (2) sau này lưu ảnh
trang phục thật, (3) chia sẻ cộng đồng. Chia 3 giai đoạn; đây là **Giai đoạn 1**.

## 0. Quyết định đã chốt
- Stack: Cloudflare **Worker + D1** (tái dùng pattern `dojo-sync`). Ảnh (R2) để GĐ2.
- Đăng nhập: **access-code** (như Viral Dojo). Không email/OAuth.
- Giữ hosting GitHub Pages; client gọi Worker qua **CORS**.
- Key Gemini vẫn **client-only** (không đưa lên server).
- **GĐ1 chỉ đồng bộ JSON** (`S.characters`). Ảnh CHƯA đồng bộ (để GĐ2).
- Xung đột (409): **server thắng + toast báo**, không merge phức tạp.

## 1. Mục tiêu GĐ1
Người dùng nhập 1 access-code → toàn bộ nhân vật/persona/intake/outputs/tủ đồ (text)/
metadata gallery được lưu cloud và tự đồng bộ giữa các máy. App vẫn chạy offline
không cần đăng nhập (sync là tính năng cộng thêm, không phá luồng cũ).

## 2. Backend — Worker `muse-sync` + D1 `muse_db`

Copy gần 1:1 từ `C:\viral-dojo\dojo-sync\worker.js`, đổi:
- Header auth: `x-dojo-code` → `x-muse-code` (vẫn chấp nhận `?code=` cho sendBeacon).
- Tiền tố mã: `VD-` → `MB-`.
- Bỏ nhánh không cần cho GĐ1: có thể GIỮ `/lead` + admin (rẻ, tiện cấp mã), nhưng
  không bắt buộc dùng. Tối thiểu cần: `/auth`, `/pull`, `/push`, `/admin/codes`.

**Thư mục:** `muse-sync/worker.js`, `muse-sync/wrangler.toml`, `muse-sync/schema.sql`.

**D1 schema (`accounts`):**
```sql
CREATE TABLE IF NOT EXISTS accounts (
  code TEXT PRIMARY KEY,
  name TEXT,
  blob TEXT,               -- JSON.stringify(S.characters)
  version INTEGER DEFAULT 0,
  created_at TEXT, updated_at TEXT, last_seen TEXT,
  plan TEXT DEFAULT 'life', expires_at TEXT, note TEXT,
  pushes INTEGER DEFAULT 0
);
```

**Endpoint (hành vi như Dojo):**
- `POST /auth` → `{ok,name,version,plan,expiresAt}`.
- `GET /pull` → `{blob, version, name, plan, expiresAt}`.
- `POST /push {blob, baseVersion}` → CAS `UPDATE ... WHERE code=? AND version=?`.
  - Khớp → `{ok,version:next}`. Lệch → `409 {conflict:true, serverBlob, version}`.
- `POST /admin/codes` (header `x-admin-token`) → cấp mã mới.
- Secret: `ADMIN_TOKEN` (wrangler secret).

**Bindings (`wrangler.toml`):** `[[d1_databases]] binding="DB"`, `database_name="muse_db"`.

## 3. Client — lớp sync trong index.html

### 3.1 Trạng thái sync (KHÔNG nằm trong blob)
- Lưu riêng ở localStorage: `muse_sync_code`, `muse_sync_version`, `muse_sync_name`.
- Hằng số: `const SYNC_URL="https://muse-sync.<subdomain>.workers.dev";`

### 3.2 Đăng nhập
- Nút/gạt "☁️ Đồng bộ" trên header. Chưa có code → modal: nhập access-code +
  nút "Dùng offline" (đóng, không đổi gì).
- Nhập code → `POST /auth`. OK → lưu code, gọi `syncPull()`.

### 3.3 Pull (khi load & khi đăng nhập)
- `syncPull()`: `GET /pull`. Nếu `version > muse_sync_version` **và** có blob:
  - `S.characters = serverBlob; S.activeId = <hợp lệ>` → `saveLocalOnly()` → render.
  - Cập nhật `muse_sync_version = version`.
- Nếu server rỗng (version 0, blob null) → **đẩy local lên** (first push) để khởi tạo.

### 3.4 Push (debounce)
- Tách `save()` thành: `saveLocalOnly()` (ghi localStorage như hiện tại) + hàm cũ
  `save()` gọi `saveLocalOnly()` rồi `schedulePush()`.
- `schedulePush()`: debounce ~2000ms → `syncPush()`.
- `syncPush()`: nếu có code → `POST /push {blob:S.characters, baseVersion:muse_sync_version}`.
  - `ok` → `muse_sync_version = version`.
  - `409 conflict` → nạp `serverBlob` vào S (server thắng), set version, render,
    toast "Đã tải bản mới nhất từ thiết bị khác". KHÔNG tự push đè.
- Lỗi mạng → im lặng, giữ local, thử lại ở lần `save()` sau (không chặn UI).

### 3.5 Offline-first
- Không có code → app chạy y hệt hiện tại (chỉ localStorage/IndexedDB).
- Mọi lời gọi sync bọc try/catch, thất bại không được ném lỗi ra UI chính.

### 3.6 UI ghi chú ảnh
- Ở tab Thư viện/Tủ đồ: dòng nhỏ "☁️ Đồng bộ text đa thiết bị. Ảnh còn lưu trên
  máy này (đồng bộ ảnh ở bản cập nhật sau)." để tránh hiểu nhầm mất ảnh.

## 4. Luồng dữ liệu
`save()` → `saveLocalOnly()` (localStorage) + `schedulePush()` → (debounce) `POST /push`.
Load → `syncPull()` → merge server (nếu mới hơn) → render. Ảnh vẫn IndexedDB, không đụng.

## 5. Ranh giới & rủi ro
- Blob chỉ chứa text JSON (không ảnh) → nhỏ, an toàn cho D1.
- `muse_sync_*` để NGOÀI blob, tránh vòng lặp đồng bộ chính nó.
- Server-wins có thể ghi đè sửa đổi local chưa push khi 2 máy sửa gần đồng thời;
  chấp nhận cho v1 (1 user, hiếm). Không mất dữ liệu server.
- Không log key Gemini; Worker không nhận key.

## 6. Testing
1. **Deploy test:** `wrangler d1 create muse_db` → áp schema → `wrangler deploy` →
   set `ADMIN_TOKEN` → `POST /admin/codes` lấy 1 mã.
2. **Đa thiết bị:** 2 trình duyệt cùng mã → sửa tủ đồ ở A → reload B → thấy thay đổi.
3. **Xung đột:** ở B đổi `muse_sync_version` cũ rồi push → nhận 409 → xác nhận nạp
   serverBlob + toast, không mất dữ liệu.
4. **Offline:** không nhập code → tạo nhân vật/tủ đồ → xác nhận app chạy bình thường.
5. **First push:** mã mới (blob null) → login ở máy có sẵn dữ liệu → xác nhận đẩy lên,
   máy thứ 2 pull thấy đủ.

## 7. Ngoài phạm vi (để GĐ2/GĐ3)
- Đồng bộ ảnh (R2) — GĐ2.
- Chia sẻ/thư viện cộng đồng — GĐ3.
- Trang admin đồ hoạ (dùng lại admin Dojo hoặc gọi API tay là đủ cho GĐ1).
