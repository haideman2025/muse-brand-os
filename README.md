# Muse Brand OS — Digital Twin Studio (Gemini)

Web app 1 file đưa bạn đi một luồng liền mạch: **Tạo nhân vật (persona) → Digital Twin (clone khuôn mặt từ selfie) → Studio ảnh (Photoshoot · Tủ đồ · Thư viện) → Mục tiêu kinh doanh & chiến lược thương hiệu → 5 artifact brand-os → Xuất toàn bộ file**. AI (Gemini) tự sinh nội dung **và tự chấm điểm** (Quality Gate). Nhân vật là *trục nhân cách* — mọi hook/nội dung viết bằng giọng nhân vật, mọi ảnh giữ cùng khuôn mặt.

> Kế thừa các tính năng studio ảnh của repo gốc **V-Life Studio** (`Daning-my-muse`): Digital Twin từ ảnh, Photoshoot (makeup/outfit/pose/bối cảnh/góc máy), Wardrobe (tủ đồ), Gallery — đã làm sạch (không NSFW), bỏ video/mini-game/storyboard.

## Cách dùng
1. **Mở** `index.html` bằng trình duyệt (Chrome/Edge/Safari). Không cần cài gì, không cần server.
2. **① Thiết lập** — dán **Gemini API Key** (https://aistudio.google.com/app/apikey → *Create API key*). Bấm *Kiểm tra kết nối*.
3. **② Tạo cuộc sống mới** — gõ 1 ý tưởng thô → AI dựng nháp **Persona + Intake** cùng lúc.
4. **③ Hồ sơ nhân vật** — chỉnh tay hoặc *AI hoàn thiện persona*.
5. **④ Chân dung & Digital Twin** — *Upload selfie → AI clone* thành nhân vật (giữ khuôn mặt nhất quán) hoặc *Sinh từ mô tả*.
6. **⑤ Studio ảnh** — **Photoshoot** (makeup/outfit/pose/bối cảnh/góc máy + *AI gợi ý concept*, chụp 1 hoặc 4 góc) · **Tủ đồ** (gợi ý 10 outfit, costume-set theo chủ đề, trích outfit từ ảnh) · **Thư viện** (mọi ảnh lưu IndexedDB, tải/xoá, đặt làm khuôn mặt neo).
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
