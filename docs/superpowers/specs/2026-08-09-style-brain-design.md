# Style Brain — bộ não phối đồ & thiết kế thời trang

Ngày: 2026-08-09 · Trạng thái: đã duyệt thiết kế, chờ viết kế hoạch triển khai

## Mục tiêu

Cho phép người dùng biến **một món đồ / một mô tả / một dịp mặc** thành một gói nội dung thời trang
hoàn chỉnh, bám đúng phong cách của nhân vật mẫu:

- **5 ảnh**: 1 ảnh mặc đơn giản + 4 ảnh phối theo 4 phong cách khác nhau
- **3 prompt video 10s**: mỗi video 6–8 quick-cut, góc máy khác nhau, có text overlay dạy phối đồ
- **1 bài đăng storytelling 3 tầng giá trị**
- Làm **tối đa 5 bộ cùng lúc**
- Xuất **1 file `flow-pack/v1`** import thẳng Google Flow, ảnh tham chiếu nhúng sẵn

## Quyết định đã chốt

| Câu hỏi | Chốt |
|---|---|
| Đầu vào 1 bộ | Cả 3 kiểu: món đồ có sẵn · mô tả tự gõ · dịp mặc |
| DNA thời trang | Khối riêng lưu theo nhân vật, AI sinh nháp, người dùng sửa tay |
| Cách chạy 5 bộ | 2 giai đoạn: sinh kế hoạch (text) → duyệt/sửa → render ảnh |
| Xuất file | 1 JSON `flow-pack/v1`, ảnh nhúng đã thu nhỏ 1024px |
| 4 phong cách phối | **AI tự chọn** dựa trên DNA thời trang + đầu vào (không dùng danh sách cố định) |
| Vị trí | Tab mới `👠 Phối đồ` trong Studio |

## Kiến trúc

Tab mới trong Studio, đứng sau `🛍️ Bộ ảnh SP`. Không sửa tính năng nào đang chạy.

```
studioTab('style') → renderStyleBrain(body)
  ├─ Khối DNA thời trang       (S.fashionDna, sửa tay + nút AI viết nháp)
  ├─ Khối nhập tối đa 5 bộ     (STYLE.inputs[])
  ├─ Giai đoạn 1: sinh kế hoạch → S.styleSets[]
  ├─ Danh sách card từng bộ    (sửa/xoá/render ảnh)
  └─ Xuất flow-pack + tải ảnh gốc
```

### Dùng lại (không viết mới)

| Hàm sẵn có | Dùng để |
|---|---|
| `geminiText(prompt,true)` | sinh kế hoạch JSON, sinh DNA thời trang |
| `geminiImageMulti(prompt,refs)` | render ảnh có nhiều tham chiếu (ref cuối = món đồ, được giữ lâu nhất khi retry) |
| `getRef()` | ảnh neo khuôn mặt nhân vật |
| `addToGallery(dataUrl,prompt,kind)` | lưu ảnh, trả `gid` |
| `mediaGet` / `mediaThumb` / `lazyThumb` | ảnh gốc vs thumb cho lưới |
| `scaleDataUrl(u,1024)` | thu nhỏ trước khi nhúng JSON |
| `parseJSON`, `dl`, `esc`, `uid`, `toast` | tiện ích |
| `ANGLES` | danh sách góc máy cho quick-cut |

## Dữ liệu

### 1. DNA thời trang — `S.fashionDna` (object, per nhân vật)

```js
{archetype:'', silhouette:'', palette:'', fabrics:'', accessories:'', hairMakeup:'', avoid:''}
```

- `avoid` = **TỪ CẤM**: kiểu đồ nhân vật không bao giờ mặc. Bơm vào prompt dưới dạng negative
  constraint cho cả ảnh lẫn video.
- Nút `✨ AI viết DNA thời trang`: gọi `geminiText` với persona + `ethnicityLook` + `vibe` +
  `visualStyle`; nếu có ảnh neo thì gửi kèm qua đường vision. Kết quả đổ vào 7 ô, **không tự lưu
  đè** — người dùng bấm Lưu.
- Đăng ký `fashionDna` vào `CHAR_FIELDS` (kiểu object, mặc định `{}`).

### 2. Bộ phối đồ — `S.styleSets` (array, per nhân vật)

```js
{
  id, createdAt,                          // uid(), _today10()
  source:{kind:'wardrobe'|'text'|'occasion', key:'', text:''},
  styleName:'',                           // tên phong cách chung của bộ
  base:{prompt_en:'', gid:''},            // ảnh 1 — mặc đơn giản, nền sạch
  looks:[{name:'', why:'', prompt_en:'', gid:''}],      // đúng 4
  videos:[{title:'', hook:'', audio:'', clips:[         // đúng 3
    {seq:1, angle:'', action:'', overlay:'', prompt_en:''}   // 6–8 clip
  ]}],
  post:{knowledge:'', emotion:'', insight:'', caption:'', hashtags:''}
}
```

**Bắt buộc:** đăng ký `styleSets` vào **cả** `CHAR_FIELDS` **và** `CHAR_ARRAY_FIELDS`. Thiếu vế thứ
hai thì `activeChar()` khởi tạo nó thành `{}` và mọi `.push/.filter` sẽ nổ — đúng lỗi
`S.content.unshift is not a function` đã xảy ra ngày 2026-08-09.

### 3. State tạm (không lưu) — `STYLE`

```js
const STYLE={inputs:[{kind:'wardrobe',key:'',text:''}], ratio:'4:5', busy:false, openId:'', exportIds:[]};
```
- `inputs` tối đa 5 phần tử; UI chặn thêm quá 5.
- `ratio` dùng cho toàn bộ ảnh của lần chạy đó — chọn `1:1` / `4:5` (mặc định) / `9:16`, lấy chuỗi
  mô tả từ `CC_RATIOS` sẵn có.
- `exportIds` = các bộ được tick để xuất flow-pack.

## Luồng

### Giai đoạn 1 — `styleGenPlan()` — sinh kế hoạch (1 lần gọi text)

Input prompt gồm: persona rút gọn · **toàn bộ DNA thời trang** · danh sách đầu vào từng bộ ·
yêu cầu schema JSON.

Ràng buộc ghi thẳng trong prompt và **validate lại phía client**:

- đúng 4 phần tử `looks`, đúng 3 phần tử `videos`
- mỗi `videos[].clips` có **6–8** phần tử; mỗi clip `angle` phải lấy từ `ANGLES`, `overlay` ≤ 12 từ
  và không rỗng
- `post` đủ 3 tầng, không tầng nào rỗng
- không nhắc tên thương hiệu thật, không claim y khoa (theo mục Tuân thủ của repo)

Hàm validate `styleValidatePlan(plan)` trả về `{ok, errors[]}`. Lỗi → hiện lỗi cụ thể + nút thử lại,
**không** ghi vào `S.styleSets`.

Kết quả hợp lệ → `S.styleSets.unshift(...)` từng bộ, cap 20 bộ (xoá bộ cũ nhất kèm ảnh của nó).

### Giai đoạn 2 — Render ảnh (bấm riêng từng bộ)

`styleRenderSet(setId)`:

1. `refs = [await getRef()]`; nếu `source.kind==='wardrobe'` thì thêm ảnh món đồ vào **cuối** mảng
   (`geminiImageMulti` giữ ref cuối lâu nhất khi phải retry).
2. Render **tuần tự** 5 ảnh: `base` trước, rồi 4 `looks`. Mỗi ảnh:
   `geminiImageMulti(promptGhep, refs)` → `addToGallery(u, prompt, 'style')` → lưu `gid` vào set → `save()`.
3. Ảnh nào lỗi thì bỏ qua ảnh đó, ghi lỗi lên card, **các ảnh còn lại vẫn chạy tiếp**.
4. Nút render hiện tiến độ `n/5`, disabled khi đang chạy.

`promptGhep` = mô tả cảnh (từ kế hoạch) + khoá phong cách dựng từ `fashionDna` + `avoid` dưới dạng
negative + tỉ lệ ảnh. Ảnh lưu với `kind:'style'`; thêm `['style','Phối đồ']` vào `GAL_KINDS`.

### Xuất flow-pack

`styleFlowPack()` → `flow-pack/v1`. **Chỉ xuất các bộ được tick** (`STYLE.exportIds`); mặc định tick
sẵn mọi bộ đã có ít nhất 1 ảnh. Thư viện giữ tới 20 bộ nên phải chọn, không xuất mù cả kho.

- `characters[]`: 1 phần tử `NV1`, `anh_base64` = ảnh neo qua `scaleDataUrl(u,1024)`
- `products[]`: mỗi look **đã có ảnh** = 1 phần tử, `anh_base64` = ảnh look thu nhỏ 1024px,
  `xuat_hien_o` = danh sách shot dùng nó
- `days[]`: **1 bộ = 1 ngày** (`N1`…), **1 video = 1 shot**. Mỗi shot mang nguyên prompt omni của cả
  video 10s và đính sẵn toàn bộ ảnh tham chiếu của bộ. Một mẻ 5 bộ → 5 ngày × 3 shot = 15 video.

  > **Không được tách clip thành shot.** Tool dựng video coi mỗi shot là một video phải render;
  > tách 6–8 clip ra là 1 bộ hoá thành 18–19 video (lỗi đã xảy ra 2026-08-10, xem `style-pack.test.html`).
- Thu nhỏ **trước** khi nhúng, dựng chuỗi JSON một lần rồi `dl()` qua Blob

Nút phụ `⬇ Tải ảnh gốc` tải bản full-res, nạp trong hẹn giờ từng tấm (theo `dlGalleryAll`).

## Bài post 3 tầng

| Tầng | Nội dung |
|---|---|
| `knowledge` | nguyên tắc phối cụ thể, áp dụng được ngay (tỉ lệ, màu, chất liệu) |
| `emotion` | mô tả khoảnh khắc/góc máy bắt mắt và cảm giác khi mặc |
| `insight` | chi tiết ít người biết: gốc gác món đồ, mẹo, lỗi thường gặp |

Kèm `caption` ngắn + `hashtags`. Ngôn ngữ theo `CC.lang` đang có (vi/en).

## Bộ nhớ — luật bắt buộc

- Lưới ảnh trong tab **chỉ** dùng `lazyThumb()`, không `mediaGet()` trong vòng lặp
- Render ảnh **tuần tự**, không `Promise.all`
- Thu nhỏ trước khi nhúng JSON; không giữ mảng ảnh full-res sống lâu

## Xử lý lỗi

| Tình huống | Xử lý |
|---|---|
| Chưa có API key | toast + `go('setup')` |
| Chưa có persona | toast "Cần nhân vật (bước ③)", nút disabled |
| Chưa có DNA thời trang | cho chạy, nhưng cảnh báo vàng "nên sinh DNA trước để 5 bộ đồng nhất" |
| JSON kế hoạch sai schema | hiện lỗi cụ thể từ `styleValidatePlan`, không ghi vào state |
| Ảnh bị Gemini chặn | ghi lỗi lên đúng ảnh đó, các ảnh khác vẫn render |
| Xuất pack khi chưa có ảnh | vẫn xuất, `co_anh:false`, cảnh báo trong toast |

## Test

- `test/char-fields.test.js`: thêm `styleSets` vào `ARRAY_FIELDS`
- `test/boot.test.html`: assert có `renderStyleBrain`, `styleGenPlan`, `styleRenderSet`,
  `styleFlowPack`, `styleValidatePlan`
- `test/stylepack.test.html` (mới): dựng set giả → `styleValidatePlan` bắt đúng các vi phạm
  (thiếu look, clip < 6 hoặc > 8, overlay rỗng, tầng post rỗng); `styleFlowPack` ra đúng schema,
  số ngày = số video, ảnh nhúng đã thu nhỏ (< 400KB/ảnh)
- `test/syntax.test.js` chạy như thường

## Nâng cấp 2026-08-09 — prompt hoàn chỉnh cho mô hình Omni

Học từ công thức tham khảo của @cheerselflin:

```
quy cách chung + khoá chủ thể + đơn vị cảnh × N + liên tục xuyên cảnh + ràng buộc phủ định
```

Mỗi **đơn vị cảnh** = mốc thời gian + cỡ cảnh/góc máy + MỘT hành động chính + chuyển động máy +
âm thanh + ON-SCREEN TEXT + **trạng thái kết thúc (END STATE)**.

**END STATE là mấu chốt.** Nó bàn giao vị trí nhân vật, hướng mặt, vật trong tay, đà chuyển động và
cảm xúc cho cut kế tiếp; `action` của cut sau phải bắt đầu đúng từ đó. Không có nó thì 6–8 quick-cut
là 6–8 mảnh rời — nhân vật đang cầm ly ở cut 3 sang cut 4 tay không.

Thay đổi:

| Việc | Nơi |
|---|---|
| Clip có thêm `camera`, `sound`, `end_state` | schema `styleSets`, prompt sinh kế hoạch |
| `styleValidatePlan` ép `end_state` không rỗng ở mọi clip **trừ clip cuối** | validator |
| `omniMasterPrompt(video,opts)` dựng prompt 5 khối; trường trống thì bỏ qua nên bộ dữ liệu cũ vẫn chạy | hàm thuần, test bằng node |
| Nút `📋 Copy prompt Omni` | tab Phối đồ **và** tab Video Omni |
| `days[].prompt_omni` trong flow-pack, giữ nguyên `shots[].prompt_en` | `styleBuildPack` |

### Sửa lại cùng ngày — Flow chặn vì chính sách người nổi tiếng

Bản đầu bê nguyên công thức tham khảo vào, gồm câu *"Use the woman from the reference image…
Maintain her EXACT facial identity, hairstyle, facial features and body proportions"*. Google Flow
**chặn thẳng**: *"Câu lệnh này có thể vi phạm chính sách của chúng tôi về việc tạo video về người
nổi tiếng"*. Đây là luật app đã biết từ trước và ghi trong `aiPromptSafe()` — bản nâng cấp đã bỏ qua.

Sửa:

| Trước | Sau |
|---|---|
| "from the reference image", "EXACT facial identity", "facial features" | chủ thể chung chung `a generic stylish young woman`, cấm tả mặt, cấm nhắc người thật/nổi tiếng |
| `IMMUTABLE ITEMS` gộp cả người lẫn đồ | `WARDROBE LOCK` — chỉ khoá trang phục |
| TIMELINE kịch bản hoá từng cut (mốc giờ, góc máy, chuyển động, END STATE mỗi cut) | `6-8 quick cuts` + `IDEA` + beats + `You decide the pacing, the shot sizes, the camera moves` |
| `end_state` bắt buộc, validate chặn | tuỳ chọn — luật nối cut nêu **một lần** ở khối `CUT FLOW` |

Thứ giữ lại từ công thức tham khảo là phần đắt nhất: luật *mỗi cut nối tiếp đúng trạng thái cut
trước* (vị trí, hướng người, vật trong tay, đà chuyển động).

**Quyết định về text overlay:** người dùng chọn **để model tự vẽ chữ vào video**, nên khối phủ định
KHÔNG cấm chữ và mỗi đơn vị cảnh ghi `ON-SCREEN TEXT: "..."`. Rủi ro đã nêu: chữ tiếng Việt có dấu
hay bị méo và không sửa được, phải sinh lại cả clip. Bảng "giây nào — chữ gì" vẫn hiển thị ở card
để dán tay ở CapCut khi cần.

## Không làm (YAGNI)

- Không tự đăng mạng xã hội — đã có Zernio riêng
- Không render video thật — app chỉ sinh prompt, Flow lo phần dựng
- Không có nút "sinh lại đúng 1 ảnh lỗi" ở bản đầu
- Không đồng bộ thumb lên worker
