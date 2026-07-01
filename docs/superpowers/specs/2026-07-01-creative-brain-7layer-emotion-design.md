# Creative Brain Upgrade — 7-Layer Prompt Engine + Emotion Profile

**Ngày:** 2026-07-01
**Repo:** muse-brand-os (single-file `index.html`)
**Loại:** Nâng cấp "ngầm" (invisible quality upgrade) — không đổi UI.

## 1. Mục tiêu

Nâng "bộ não sáng tạo" của muse-brand-os để ảnh nhân vật (Studio → Photoshoot / Wardrobe)
**thực tế hơn, có cảm xúc hơn, an toàn nền tảng hơn** — bằng cách viết lại phần
prompt-building theo công thức chắt lọc từ tài liệu phân tích prompt của user.

**Nguyên tắc bất biến:** giữ nguyên khoá SFW hiện có ("tasteful, safe-for-work,
no sexualization"). Đây là yếu tố giúp ảnh sống được trên TikTok/FB/IG. Bản nâng
chỉ tăng chất lượng nghệ thuật + cảm xúc, KHÔNG mở nội dung nhạy cảm.

**Quyết định đã chốt:**
1. Phạm vi: nâng thẳng engine muse-brand-os (`index.html`).
2. Kiểu: ngầm — prompt tốt hơn, UI giữ nguyên.
3. Cảm xúc: auto suy từ persona (deterministic), không có nút chọn.
4. Kiến trúc: Prompt Builder có cấu trúc (Approach B).

## 2. Kiến thức chắt lọc (nguồn: bộ tài liệu prompt của user)

### 2.1 Công thức 7 lớp (master-prompt structure)
Mọi prompt phân tích trong tài liệu đều lặp đúng 7 lớp, theo thứ tự:

1. **Subject** — nhân vật + neo nhận diện (face identity) + **biểu cảm** + pose + trang phục.
2. **Setting/Environment** — bối cảnh, đạo cụ, chiều sâu hậu cảnh.
3. **Lighting** — nguồn/hướng/chất sáng (soft/diffused), thời điểm, rim light, catchlight.
4. **Composition** — cỡ cảnh, góc máy, framing, DoF/bokeh, rule-of-thirds.
5. **Style/Mood** — phong cách nhiếp ảnh (editorial/lifestyle/commercial) + tâm trạng.
6. **Colors** — palette chủ đạo + accent + mức tương phản.
7. **Texture/Details** — da/vải/tóc/bề mặt + chốt "no text, no watermark".

### 2.2 Tầng cảm xúc (nguồn: tài liệu "tạo cảm xúc cho video")
- 6 cảm xúc cơ bản (Paul Ekman): happy, sad, anger, fear, surprise, disgust.
- Với thương hiệu: bỏ fear/disgust; dùng 6 **mood** thực chiến (bảng 2.3).
- Cảm xúc là cần gạt: **biểu cảm + ánh sáng + palette + lens** cùng phục vụ 1 mood.

### 2.3 Bảng 6 Mood → cần gạt điện ảnh (đã user duyệt)

| Mood | Biểu cảm | Ánh sáng | Palette | Lens/góc |
|---|---|---|---|---|
| Confident | ánh mắt trực diện, cằm hơi nâng | directional, catchlight rõ | tương phản vừa | 50mm, hơi thấp |
| Warm/Joyful | cười nhẹ, mắt cười | soft warm, airy | warm neutrals | eye-level |
| Serene/Calm | thư thái, nhìn xa | soft diffused, cửa sổ | pastel/neutral | shallow DoF |
| Aspirational | hướng lên, hy vọng | golden, rim light | ấm + sáng | wide, thoáng |
| Editorial/Mysterious | trầm, khép | low-key, side light | tối + 1 accent | close-up |
| Alluring (tasteful) | tự tin, duyên | soft front-left | ấm da | medium close-up |

## 3. Kiến trúc (Approach B — Prompt Builder có cấu trúc)

### 3.1 Hằng số kiến thức mới (thêm vào index.html)
- `PHOTO_TOKENS` — token photoreal chuẩn (RAW photo, 85mm/50mm, subsurface skin,
  natural skin texture, sharp focus, 8k) + anti-token (no 3d render/anime/cartoon).
- `MOOD_LIB` — object 6 mood, mỗi mood có `{expression, lighting, palette, lens, styleMood}`.
- Quy tắc bố cục & tỉ lệ mặc định (vertical 3:4, no text, no watermark, authentic
  content-creator photo — not stock).

### 3.2 Hàm mới / viết lại
- `moodProfile(persona)` — **mới**. Đọc `vibe/niche/pov/voiceTone`, khớp keyword
  (map bảng), trả về 1 entry `MOOD_LIB`. Có fallback mặc định = `Confident`.
  Thuần deterministic, không gọi API.
- `visualBase()` — **viết lại**. Vẫn là neo nhận diện, nhưng cấu trúc rõ Subject-layer
  và tiêm `PHOTO_TOKENS`. Giữ nhánh `publicDescription` (digital twin) như cũ.
- `buildLayers(o, mood)` — **mới**. Trả object 7 lớp từ input shot + moodProfile.
- `shotPrompt(o)` — **viết lại**. Gọi `moodProfile(S.persona)` → `buildLayers` →
  ráp chuỗi 7 lớp theo thứ tự. Vẫn nhận `{angle, makeup, outfit, background, pose}`
  như cũ để không vỡ mọi caller. Giữ khoá identity + SFW ở cuối.

### 3.3 Không đổi
- `costumeSetPrompt`, `outfitIdeasPrompt`, `sceneConceptPrompt`, `extractOutfitPrompt`
  — giữ nguyên (chỉ tiêu thụ output của builder). UI/tab Studio giữ nguyên.
- Mọi caller của `shotPrompt` (dòng ~980, ~989) giữ nguyên chữ ký.

## 4. Luồng dữ liệu

`S.persona` → `moodProfile()` → mood entry
→ `shotPrompt(o)` gọi `visualBase()` + `buildLayers(o, mood)`
→ ráp chuỗi 7 lớp + PHOTO_TOKENS + khoá SFW/identity/aspect
→ `geminiImage(prompt)` (không đổi).

## 5. Ranh giới & an toàn
- Giữ nguyên `COMPLY` và câu "Safe-for-work, tasteful... No text, no watermark".
- Builder luôn ép: vertical 3:4 (hoặc 9:16), no watermark, no text,
  "authentic content-creator photo, not stock".
- Không thêm nội dung tình dục hoá; các mood "Alluring" vẫn ở mức tasteful/editorial.

## 6. Testing (app tĩnh, không có test runner)
1. **Prompt inspection:** in `shotPrompt()` cho 3 persona mẫu (vibe: "năng lượng
   tự tin" / "dịu dàng chữa lành" / "sang trọng bí ẩn") → xác nhận:
   - moodProfile map đúng mood kỳ vọng (Confident / Serene / Editorial).
   - Chuỗi output có đủ 7 lớp, đúng thứ tự, có PHOTO_TOKENS + khoá SFW.
2. **Visual smoke test:** mở app, tạo 1 persona, bấm gen 1 ảnh Photoshoot thật →
   mắt thường xác nhận ảnh photoreal + đúng mood, không vỡ layout, không lỗi console.
3. **Regression:** bấm gen Wardrobe/costume → xác nhận `shotPrompt` cũ vẫn nhận
   `outfit` và không lỗi.

## 7. Ngoài phạm vi (YAGNI)
- Không thêm UI chọn mood/ánh sáng (để giai đoạn sau nếu muốn).
- Không tách kho kiến thức ra file JSON ngoài.
- Không đụng các app khác (viral-dojo, lpf, flow...) trong đợt này.
