# Muse Brand OS — Digital Twin Studio (Gemini)

Web app 1 file đưa bạn đi một luồng liền mạch: **Tạo nhân vật (persona) → Digital Twin (clone khuôn mặt từ selfie) → Studio ảnh (Photoshoot · Tủ đồ · Thư viện) → Mục tiêu kinh doanh & chiến lược thương hiệu → 5 artifact brand-os → Xuất toàn bộ file**. AI (Gemini) tự sinh nội dung **và tự chấm điểm** (Quality Gate). Nhân vật là *trục nhân cách* — mọi hook/nội dung viết bằng giọng nhân vật, mọi ảnh giữ cùng khuôn mặt.

> Kế thừa các tính năng studio ảnh của repo gốc **V-Life Studio** (`Daning-my-muse`): Digital Twin từ ảnh, Photoshoot (makeup/outfit/pose/bối cảnh/góc máy), Wardrobe (tủ đồ), Gallery — đã làm sạch (không NSFW), bỏ video/mini-game/storyboard.

## Cách dùng
1. **Mở** `index.html` bằng trình duyệt (Chrome/Edge/Safari). Không cần cài gì, không cần server.
2. **① Thiết lập** — dán **Gemini API Key** (https://aistudio.google.com/app/apikey → *Create API key*). Bấm *Kiểm tra kết nối*.
3. **② Tạo cuộc sống mới** — gõ 1 ý tưởng thô → AI dựng nháp **Persona + Intake** cùng lúc.
4. **③ Hồ sơ nhân vật** — chỉnh tay hoặc *AI hoàn thiện persona*.
5. **④ Chân dung & Digital Twin** — *Upload selfie → AI clone* thành nhân vật (giữ khuôn mặt nhất quán) hoặc *Sinh từ mô tả*.
6. **⑤ Studio ảnh** — **Photoshoot** (makeup/outfit/pose/bối cảnh/góc máy + *AI gợi ý concept*, chụp 1 hoặc 4 góc) · **Tủ đồ** (gợi ý 10 outfit, costume-set theo chủ đề, trích outfit từ ảnh) · **Thư viện** (mọi ảnh lưu IndexedDB, tải/xoá, đặt làm khuôn mặt neo) · **👠 Phối đồ** (1 món đồ / mô tả / dịp mặc → 5 ảnh (1 mặc đơn giản + 4 phối) + 3 prompt video 10s có text overlay 6–8 quick-cut + bài đăng 3 tầng giá trị; tối đa 5 bộ/lần; xuất flow-pack cho Google Flow kèm ảnh tham chiếu). Hai chế độ: **AI sinh ảnh** hoặc **📤 Ảnh thật của tôi** — tự tải 2–6 ảnh chụp thật, AI nhìn ảnh viết kế hoạch, không tốn tiền sinh ảnh.
7. **⑥ Mục tiêu KD & chiến lược** — điền intake (mục \* bắt buộc) hoặc *AI gợi ý từ persona*.
8. **Pipeline 5 giai đoạn** — *Chạy pipeline tự động* (generate + tự chấm điểm rubric 100đ/gate) hoặc làm tay.
9. **Xuất file** — `05-brand-kit.json` (import "Hồ sơ Sản phẩm chuẩn"); `01–04 .md`, `00-intake.json`, `persona.json`, `06-scorecard.json`, `index.html` Command Center, ảnh Studio → thả vào **Brand Vault**.

## Đặc điểm
- **Client-side hoàn toàn:** key & dữ liệu lưu cục bộ (localStorage); ảnh chân dung lưu IndexedDB. Chỉ gọi tới Google Gemini.
- **Quality Gate:** tự chấm ≥5 yếu tố/giai đoạn, tổng 100đ; Overall (khuyến nghị ≥82).
- **Persona-driven:** giọng/POV/nỗi đau nhân vật được nhồi vào mọi prompt.
- **Model:** mặc định `gemini-2.5-flash` (text), `gemini-2.5-flash-image` (ảnh). Đổi ở bước ①.

## Tuân thủ
- Không NSFW; persona là nhân vật marketing tinh tế.
- Ngành nhạy cảm (sức khoẻ/sinh lý): **không** claim y khoa ("chữa bệnh/cam kết/100%"); kể chuyện tinh tế, nuôi organic, chuyển đổi qua inbox; có disclaimer. AgeGate 18+.

## Triển khai
Host tĩnh (GitHub Pages/Netlify/Cloudflare/Vercel). App vẫn chạy client-side; mỗi người tự nhập key của họ → public an toàn.

## Kiểm thử
Không có build step, nên chạy tay trước khi push:

```bash
node test/syntax.test.js        # mọi khối <script> còn parse được (lỗi cú pháp = trang trắng)
node test/char-fields.test.js   # CHAR_FIELDS ↔ blankChar/activeChar nhất quán kiểu dữ liệu
node test/style-plan.test.js    # validate kế hoạch AI (số look/clip, overlay, góc máy, end_state)
node test/omni-prompt.test.js   # prompt Omni: an toàn policy + luật nối cut
node test/vision-plan.test.js   # prompt đọc ảnh thật: cấm bịa, đúng số look ↔ số ảnh

# 3 test dưới cần Chrome; xem dòng RESULT trong output
CHROME="/c/Program Files/Google/Chrome/Application/chrome.exe"
"$CHROME" --headless=new --disable-gpu --allow-file-access-from-files --virtual-time-budget=90000 \
  --dump-dom "file://$PWD/test/boot.test.html"   # app boot sạch, không lỗi JS runtime
"$CHROME" --headless=new --disable-gpu --allow-file-access-from-files --virtual-time-budget=60000 \
  --dump-dom "file://$PWD/test/thumb.test.html"  # thumbnail thật sự nhỏ và có cache
"$CHROME" --headless=new --disable-gpu --allow-file-access-from-files --virtual-time-budget=90000 \
  --dump-dom "file://$PWD/test/style-pack.test.html"  # flow-pack đúng schema, ảnh nhúng đã thu nhỏ
```

### Luật prompt video (đọc trước khi sửa `omniMasterPrompt()`)

**1. Không bao giờ nhắc nhận dạng con người.** Không "ảnh tham chiếu", không tả khuôn mặt, không
"giữ đúng gương mặt". Google Flow chặn thẳng với lý do *vi phạm chính sách tạo video về người nổi
tiếng*. Chủ thể để chung chung (`a generic stylish young woman`); ảnh tham chiếu upload riêng trong
Flow lo phần giữ mặt. Luật này đã có sẵn trong `aiPromptSafe()` — mọi prompt video phải theo.
Khoá **trang phục** thì được, đó không phải nhận dạng người.

**2. Không kịch bản hoá từng cut.** Chỉ nêu `6-8 quick cuts` + ý tưởng + text overlay + luật nối
cut, rồi để model tự quyết nhịp, khuôn hình, góc máy. Chỉ định cứng từng cut vừa làm prompt dài
vừa ra video cứng hơn.

**3. Giữ luật nối cut.** `each cut must continue EXACTLY from where the previous cut ended — same
position, same facing, same object in hand, same motion momentum`. Nêu một lần làm luật chung là đủ
để 6–8 quick-cut liền mạch.

`test/omni-prompt.test.js` khoá cả 3 luật này lại.

**4. Hình dạng flow-pack: 1 bộ = 1 ngày, 1 video = 1 shot.** Mỗi shot mang nguyên prompt omni của cả
video 10s. Tool dựng video coi mỗi shot là **một video phải render** — tách 6–8 quick-cut thành 6–8
shot là 1 bộ hoá thành 18–19 video. `test/style-pack.test.html` khoá con số này lại.

### Luật ảnh (đọc trước khi thêm lưới ảnh mới)
Thư viện chứa tới **600 ảnh**, mỗi ảnh gốc **1–7MB base64**. Nạp cả lưới bằng ảnh gốc = **1–4GB** →
tab chết với `Aw Snap: Out of Memory`.

- Trong vòng lặp dựng lưới: **chỉ dùng `lazyThumb(imgEl, key)`** — thumb 384px (~44KB), cache
  IndexedDB (`th:` + key), dựng theo hàng đợi 1 tấm/lượt và chỉ khi ảnh sắp lọt tầm nhìn.
- `mediaGet()` trả ảnh gốc → chỉ gọi cho **đúng một tấm, đúng lúc cần**: tải về · đặt ảnh neo ·
  làm reference gửi Gemini · nhúng flow-pack.
- Nút tick/chọn trong lưới **không được** gọi lại hàm render cả lưới — chỉ sơn lại phần đã đổi
  (xem `paintVidOutfitSel()`), nếu không mỗi lần tick là nạp lại toàn bộ ảnh.
