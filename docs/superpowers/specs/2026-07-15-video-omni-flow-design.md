# Muse Brand OS — Module "🎬 Video Omni" (Flow) design

**Ngày:** 2026-07-15 · **Repo:** muse-brand-os (single-file index.html)
**Mục tiêu:** Tự sinh bộ prompt video cho Google Flow (Omni) + danh sách ảnh cần chọn, cho affiliate **thời trang × biến hình × tài năng** (đàn/piano/hát/nhảy/catwalk). Thay việc gõ prompt tay.

## Quyết định (brainstorm 2026-07-15)
1. Cấu trúc: **nhiều clip 10s nối nhau** (10s=1, 20s=2, 30s=3 clip), mỗi clip 1 prompt Omni, thiết kế nối thành mạch biến hình liền.
2. Deliverable chính: **prompt EN copy-paste + danh sách ảnh cần chọn** trong Flow (mỗi clip). Bonus: JSON pack kèm ảnh.
3. Audio: **nhạc + hành động, KHÔNG voiceover** (nhạc mood + tiếng đàn/hát + chuyển động).
4. Outfit: **chọn từ tủ đồ/thư viện ảnh có sẵn** của nhân vật (tick theo thứ tự).
5. Engine prompt: **DETERMINISTIC** (như `shotPrompt`) — không gọi AI, giữ nguyên khoá SFW/identity của Muse.

## Vị trí & tận dụng sẵn có
- Thêm tab **🎬 Video** trong Studio (`renderStudio` @1055, `studioTab`). Route `renderVideo`.
- Dùng: `visualBase()`/`dnaDesc()` (khoá mặt+DNA), `moodProfile()` (mood từ persona), `S.gallery`(ảnh `g:<id>`)+`S.wardrobe`(ảnh `wb:<id>`, có `masterPrompt` EN), `getRef()` (ảnh neo mặt), `mediaGet`, `dl`/`dlDataUrl`, `toast`/`esc`, copy qua `data-c`.

## UI (renderVideo)
- Cảnh báo nếu chưa có nhân vật / chưa có Digital Twin ref.
- **Tài năng** (chip multi-select): guitar · piano · hát · nhảy · catwalk · tạo dáng biểu cảm + ô tự nhập.
- **Outfit biến hình**: lưới thumbnail (wardrobe + gallery), tick theo thứ tự → chuỗi biến hình + ảnh tham chiếu.
- **Thời lượng**: 10/20/30s → clipCount = /10.
- Nút **Sinh bộ prompt**.

## Engine (deterministic)
`videoClipPrompt(i, total, outfitDesc, talents, mood)` → prompt Omni EN:
- Vertical 9:16, ~10s, TikTok/Reels short-form.
- Subject: SAME woman `visualBase()` — **keep exact same face identity across clips (use reference image)**.
- Wearing: `outfitDesc` (từ tên/masterPrompt outfit tick cho clip đó).
- Action: talents (join) + biến hình thử đồ + cute expressive attractive posing.
- Clip ≥2: "Continues seamlessly from previous clip, same face & character, evolving the look."
- Editing: 6-8 smooth quick cuts, varied creative camera angles, silky match-cut + cinematic morph giữa look.
- Lighting/mood: `mood.lighting` + `mood.styleMood`, cinematic color grade.
- Audio: nhạc mood + tiếng talent; **no voiceover**.
- **SFW lock (giữ nguyên):** tasteful, safe-for-work, non-explicit fashion editorial (sleepwear styled as editorial), platform-safe TikTok/IG, no burned-in text, no watermark.
- Phân bổ outfit: clip i dùng outfit[i % n] (mỗi clip 1 look reveal).

## Output (mỗi clip)
- Header "Clip i/N (10s)".
- Prompt EN trong box + nút Copy (`data-c`).
- "Ảnh cần chọn trong Flow": thumbnail **[Khuôn mặt neo]** + **[outfit i]** (hydrate mediaGet) + tên.
- Ghi chú nhạc/chuyển cảnh.
- Nút **Copy tất cả** + **⬇ Tải JSON pack** (nhúng portrait `getRef()` + ảnh outfit base64 + clips prompt).

## Ngoài phạm vi
- Không voiceover, không gọi Gemini để sinh prompt (deterministic). Có thể thêm "AI làm phong phú" sau.
- Không đổi khoá SFW; không mở nội dung nhạy cảm.

## Kiểm thử
- Không có test harness (single-file). Smoke: mở index.html, tạo/mở nhân vật có ref + vài outfit → tab Video → chọn tài năng + tick outfit + 20s → sinh → copy prompt + kiểm ảnh cần chọn + tải JSON. Push → GitHub Pages tự deploy.
