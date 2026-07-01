# Backend Phase 2 — Đồng bộ ảnh qua R2

**Ngày:** 2026-07-01 · **Repo:** muse-brand-os

## Mục tiêu
GĐ1 đồng bộ JSON (không ảnh). GĐ2 đưa ảnh (gallery, ref/portrait Digital Twin,
thumbnail tủ đồ) lên **R2** để sống đa thiết bị. Ảnh vẫn cache IndexedDB cục bộ;
R2 là nguồn khi thiết bị khác chưa có bytes.

## Backend (muse-sync)
- R2 bucket `muse-media`, binding `IMG`.
- Key R2 = `<code>/<localKey>` (localKey: `g:<id>`, `ref:<charId>`, `portrait:<charId>`,
  `wb:<id>`). Worker luôn tự prefix bằng code → cách ly theo account.
- Endpoint (đã xác thực x-muse-code):
  - `POST /img?key=<k>` body = bytes ảnh (≤8MB) → R2 put.
  - `GET  /img?key=<k>` → trả bytes (404 nếu thiếu).
  - `POST /img/delete {key}` → R2 delete.
- Validate key regex `^[A-Za-z0-9:_.\-]{1,120}$`.

## Client — media layer (index.html)
- `r2Put/r2Get` (fetch có header x-muse-code; dataURL↔Blob).
- `mediaPut(key,dataUrl)` = IDB.put + r2Put (fire-and-forget nếu đã đăng nhập sync).
- `mediaGet(key)` = IDB trước; miss → r2Get → cache IDB → trả. **Lazy hydration**:
  thiết bị mới render ảnh → tự kéo từ R2.
- `mediaDel(key)` = IDB.del + r2 delete.
- Reroute mọi điểm đọc/ghi/xoá ảnh: `getRef/setRef`, `addToGallery`, gallery render,
  `delGallery`, trim >120, `useAsRef`, portrait, charDuplicate/charDelete, Dojo hero.
- Không đăng nhập sync → media layer chạy đúng như cũ (chỉ IDB).

## Thumbnail tủ đồ (mới)
- Item tủ đồ thêm cờ `img:true`, thumbnail lưu key `wb:<id>`.
- `onOutfitFile` (upload ảnh outfit) → lưu chính ảnh upload làm thumbnail.
- `genCostumeSet` (tạo bộ theo chủ đề) → lưu ảnh sinh ra làm thumbnail.
- `paintWardrobe` async: hiện thumbnail (mediaGet), fallback không ảnh cho item text cũ.

## Testing
1. curl round-trip R2: POST→GET (byte khớp)→404 missing→401 no-code→delete→404. ✓ (đã chạy)
2. Máy A đăng nhập, gen ảnh → ảnh lên R2. Máy B cùng mã → mở Studio/Thư viện → ảnh
   tự hiện (hydrate từ R2). Tủ đồ có thumbnail.
3. Xoá ảnh/nhân vật ở A → R2 cũng xoá.
4. Offline (không sync) → ảnh vẫn chạy bằng IDB như cũ.

## Ngoài phạm vi
- Nén/resize ảnh trước upload (có thể thêm sau nếu tốn băng thông).
- Chia sẻ cộng đồng — GĐ3.
