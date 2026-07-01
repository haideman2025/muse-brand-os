# Character DNA — clone luồng khởi tạo My-Muse-AI vào muse-brand-os

**Ngày:** 2026-07-01
**Repo:** muse-brand-os · **Nguồn tham chiếu:** haideman2025/My-Muse-AI-

## 0. Mục tiêu & ranh giới
Port "bộ DNA nhân vật" + kho lựa chọn ngoại hình của My-Muse-AI vào muse-brand-os để
tạo nhân vật với **ngoại hình sáng tạo & đa dạng hơn**, tông **gợi cảm/trưởng thành (18+)**.

**Mức 18+ đã chốt:** như My-Muse — gợi cảm, ẩn ý, vóc dáng đa dạng **có** field nhấn
ngực/mông. **NON-EXPLICIT**: không nudity, không khiêu dâm (Gemini chặn, nền tảng cấm;
bản thân My-Muse cũng chỉ "innuendo/sensual", không explicit). Từ ngữ figure giữ mức
"bust/hips figure" tao nhã để vẫn render được.

## 1. Kiến trúc (muse-native, không dựng lại React)
muse-brand-os đã có: persona data-driven (PERSONA_FIELDS), clone-from-ảnh
(`clonePrompt`+geminiVision), "AI hoàn thiện" (`completePersonaPrompt`), engine 7 lớp
(`visualBase`/`buildLayers`/`moodProfile`), Studio (Photoshoot/Wardrobe/Gallery).
→ Ghép DNA vào các mạch này thay vì tạo wizard 6-bước tách rời.

## 2. Data model
Thêm `S.persona.dna` (object, nằm trong persona → tự sync GĐ1 + lưu local):
```
dna = { ethnicity, skinTone, eyeColor, hairColor, hairStyle,
        bodyType, breastSize, buttSize, customPhysicalDetails }
```
`normPersona()` mở rộng để copy `dna`. blankChar không cần đổi (dna khởi tạo lazy).

## 3. DNA_LIB (hằng số) — nhãn Việt → cụm mô tả English
Port từ My-Muse constants.ts, dịch sang cụm dùng thẳng trong prompt:
- **ethnicity** (8), **skinTone** (6), **eyeColor** (7), **hairColor** (10),
  **hairStyle** (14), **bodyType** (5: mảnh mai/săn chắc/đồng hồ cát/đầy đặn/cơ bắp).
- **breastSize** (—/nhỏ/vừa/đầy/lớn → "small…large full bust"),
  **buttSize** (—/thon/săn chắc/vừa/đầy đặn → "slim…full rounded hips"). Non-explicit.

## 4. Engine tiêu thụ DNA
- `dnaDesc()` — mới: ráp các field dna đã chọn thành 1 cụm English (ethnicity, figure,
  skin, hair color+style, eye, customPhysicalDetails).
- `visualBase()` — nâng: nếu có `publicDescription` (Digital Twin) → giữ neo mặt +
  **append figure/dna** (giống My-Muse: mặt bất biến + body từ DNA). Nếu không →
  dựng từ dnaDesc (fallback `ethnicityLook` cũ nếu chưa chọn DNA).
- Không đổi chữ ký `shotPrompt`/`buildLayers`.

## 5. UI
### 5.1 Card "🧬 Ngoại hình DNA" trong bước ③ Hồ sơ nhân vật
- Mỗi category = 1 hàng chip bấm chọn (toggle). `skin/eye/hair` có thể kèm chấm màu.
- Chọn → `S.persona.dna[cat]=value` → repaint card + `save()`.
- Field `customPhysicalDetails` = textarea ("nốt ruồi, hình xăm, sẹo đặc trưng...").

### 5.2 Kho Pose / Background / Cosplay → tab Photoshoot
- `POSE_LIB` (nam/nữ), `BG_LIB`, `COSPLAY_LIB` (curated) port từ constants.ts.
- Chip quick-pick điền vào input `PS.pose` / `PS.background` / `PS.outfit` sẵn có.
- `outfitIdeasPrompt` giữ (đã táo bạo). Thêm nút "cosplay/anime" preset.

## 6. AI tự điền DNA
- `clonePrompt` (clone từ ảnh) — mở rộng JSON output: thêm khoá `dna:{ethnicity,
  skinTone,eyeColor,hairColor,hairStyle,bodyType,breastSize,buttSize}` để AI Vision
  đọc ảnh điền luôn DNA (đúng tinh thần "Visual DNA" của My-Muse).
- `completePersonaPrompt` — thêm gợi ý điền dna nếu trống.
- Cả hai map giá trị về đúng nhãn Việt trong DNA_LIB (normalize).

## 7. Testing
1. Node syntax-check toàn script sau mỗi chunk.
2. Chọn DNA (vd: Latin, đồng hồ cát, đầy bust, tóc đỏ wavy, mắt xanh) → in `shotPrompt`
   → xác nhận cụm DNA xuất hiện đủ trong Subject layer, đúng thứ tự 7 lớp.
3. Digital Twin + DNA: có publicDescription → xác nhận giữ neo mặt + append figure.
4. Mở app: bấm chip DNA → repaint đúng, gen 1 ảnh thật xác nhận ngoại hình đổi theo.
5. Regression: persona cũ không có dna → visualBase vẫn chạy (fallback ethnicityLook).

## 8. Ngoài phạm vi
- Không port hệ subscription/tier, game (BeerCatch), video VEO của My-Muse.
- Không dựng wizard 6-bước tách rời (dùng stages sẵn có).
- Nội dung explicit/nudity — KHÔNG (ngoài lằn ranh, không render được).
