# Muse Brand OS — Tạo cuộc sống mới (Gemini)

Web app 1 file đưa bạn đi một luồng liền mạch: **Tạo nhân vật (persona) → Hồ sơ + chân dung → Mục tiêu kinh doanh & chiến lược thương hiệu → 5 artifact brand-os → Storyboard 30 ngày → Xuất toàn bộ file**. AI (Gemini) tự sinh nội dung **và tự chấm điểm** (Quality Gate). Nhân vật là *trục nhân cách* — mọi hook/nội dung viết bằng giọng nhân vật.

## Cách dùng (3 phút)
1. **Mở** `index.html` bằng trình duyệt (Chrome/Edge/Safari). Không cần cài gì, không cần server.
2. **① Thiết lập** — dán **Gemini API Key** (lấy miễn phí tại https://aistudio.google.com/app/apikey → *Create API key*). Bấm *Kiểm tra kết nối*.
3. **② Tạo cuộc sống mới** — gõ 1 ý tưởng thô → AI dựng nháp **Persona + Intake** cùng lúc (có thể bỏ qua, điền tay).
4. **③ Hồ sơ nhân vật** — chỉnh tay hoặc *AI hoàn thiện persona*.
5. **④ Chân dung** — *Tạo ảnh chân dung* bằng Gemini image (lưu IndexedDB).
6. **⑤ Mục tiêu KD & chiến lược** — điền intake (mục \* bắt buộc) hoặc *AI gợi ý từ persona*.
7. **Pipeline 5 giai đoạn** — *Chạy pipeline tự động* (generate + tự chấm điểm theo rubric 100đ/gate) hoặc làm tay từng bước.
8. **Storyboard 30 ngày** — hook theo giọng persona + imagePrompt + caption (chỉ text).
9. **Xuất file** — `05-brand-kit.json` (import "Hồ sơ Sản phẩm chuẩn" của tool viral); `01–04 .md`, `00-intake.json`, `persona.json`, `storyboard.json`, `06-scorecard.json`, `index.html` Command Center → thả vào **Brand Vault**.

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
