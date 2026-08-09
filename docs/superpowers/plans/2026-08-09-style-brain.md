# Style Brain Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm tab `👠 Phối đồ` biến 1 món đồ / mô tả / dịp mặc thành 5 ảnh + 3 prompt video 10s + 1 bài storytelling 3 tầng, tối đa 5 bộ/lần, xuất 1 file `flow-pack/v1`.

**Architecture:** App là **một file** `index.html`, không build step, mọi thứ là hàm top-level trong khối `<script>` duy nhất. Tính năng mới bám đúng khuôn đó: state per-nhân-vật trong `S`, một hàm `render*` cho tab, dùng lại `geminiText` / `geminiImageMulti` / `addToGallery` / `lazyThumb` / `scaleDataUrl` / `dl`. Logic thuần (validate, dựng pack) tách thành hàm không đụng DOM để test được bằng node.

**Tech Stack:** HTML/CSS/JS thuần · Gemini REST (`gemini-2.5-flash`, `gemini-2.5-flash-image`) · IndexedDB cho ảnh · localStorage cho state · test bằng `node` + Chrome headless.

**Spec:** `docs/superpowers/specs/2026-08-09-style-brain-design.md`

---

## File Structure

| File | Trách nhiệm | Thay đổi |
|---|---|---|
| `index.html` | toàn bộ app | thêm ~9 khối hàm mới, sửa 3 dòng đăng ký state, thêm 1 tab |
| `test/char-fields.test.js` | nhất quán kiểu field | thêm `styleSets` vào `ARRAY_FIELDS` |
| `test/style-plan.test.js` | **mới** — validate kế hoạch AI | tạo mới |
| `test/style-pack.test.html` | **mới** — dựng flow-pack trong Chrome | tạo mới |
| `test/boot.test.html` | smoke test khởi động | thêm assert 5 hàm mới |
| `README.md` | tài liệu | thêm tab mới vào mục Cách dùng + lệnh test mới |

Vị trí chèn code trong `index.html`: **ngay trước** `const VID_TALENTS=[` (khối Video Omni), để cụm Style Brain nằm liền một mạch và không xen vào giữa tính năng khác.

---

## Task 1: Đăng ký state cho nhân vật

**Files:**
- Modify: `index.html` (`CHAR_FIELDS`, `CHAR_ARRAY_FIELDS`, `blankChar`)
- Test: `test/char-fields.test.js`

- [ ] **Step 1: Sửa test cho fail trước**

Trong `test/char-fields.test.js`, thêm `'styleSets'` vào mảng `ARRAY_FIELDS`:

```js
const ARRAY_FIELDS = ['gallery', 'wardrobe', 'vlogLog', 'content', 'vidHistory', 'products', 'styleSets'];
```

- [ ] **Step 2: Chạy test để thấy nó fail**

Run: `node test/char-fields.test.js`
Expected: FAIL — `blankChar().styleSets là undefined, phải là []` và `CHAR_FIELDS thiếu 'styleSets'`

- [ ] **Step 3: Đăng ký field**

Sửa 3 dòng trong `index.html`:

```js
const CHAR_FIELDS=['idea','persona','intake','outputs','scores','gallery','wardrobe','vlogLog','content','vidHistory','calendar','products','fashionDna','styleSets'];
```

```js
const CHAR_ARRAY_FIELDS=['gallery','wardrobe','vlogLog','content','vidHistory','products','styleSets'];
```

```js
function blankChar(name){return {name:name||"Nhân vật 1",createdAt:_today10(),updatedAt:_today10(),idea:"",persona:{},intake:{},outputs:{},scores:{},gallery:[],wardrobe:[],vlogLog:[],content:[],vidHistory:[],styleSets:[]};}
```

`fashionDna` cố tình **không** vào `CHAR_ARRAY_FIELDS` — nó là object, `activeChar()` sẽ tự khởi tạo `{}`.

- [ ] **Step 4: Chạy lại test**

Run: `node test/char-fields.test.js`
Expected: PASS toàn bộ 5 test

- [ ] **Step 5: Commit**

```bash
git add index.html test/char-fields.test.js
git commit -m "feat(style): đăng ký fashionDna + styleSets vào state nhân vật"
```

---

## Task 2: Hàm validate kế hoạch (logic thuần, TDD)

**Files:**
- Modify: `index.html` (thêm khối mới trước `const VID_TALENTS=[`)
- Test: `test/style-plan.test.js` (tạo mới)

- [ ] **Step 1: Viết test fail trước**

Tạo `test/style-plan.test.js`:

```js
/**
 * Test cho styleValidatePlan — chốt chặn không cho JSON rác từ AI lọt vào state.
 * Trích code thật giữa 2 mốc trong index.html rồi chạy.
 *
 * Chạy: node test/style-plan.test.js
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const m = SRC.match(/== STYLE PLAN VALIDATOR[\s\S]*?== END STYLE PLAN VALIDATOR ==/);
assert.ok(m, 'Không trích được khối STYLE PLAN VALIDATOR từ index.html');

const ang = SRC.match(/const ANGLES=\[[^\]]*\];/);
assert.ok(ang, 'Không trích được ANGLES');

const app = new Function(`${ang[0]}\n${m[0]}\nreturn {styleValidatePlan, ANGLES};`)();

let failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); }
  catch (e) { failed++; console.log(`  ✗ ${name}\n      ${e.message}`); }
}

// Dựng 1 bộ hợp lệ để làm gốc, mỗi test bẻ đúng 1 chỗ.
function goodClip(i) {
  return { seq: i + 1, angle: app.ANGLES[i % app.ANGLES.length], action: 'walk', overlay: 'Phối áo khoác dài', prompt_en: 'a cinematic shot' };
}
function goodVideo() { return { title: 'V', hook: 'h', audio: 'lo-fi', clips: [0,1,2,3,4,5].map(goodClip) }; }
function goodLook(i) { return { name: 'Look ' + i, why: 'vì DNA', prompt_en: 'styled shot ' + i }; }
function goodSet() {
  return {
    styleName: 'Gothic tối giản',
    base: { prompt_en: 'plain outfit shot' },
    looks: [1,2,3,4].map(goodLook),
    videos: [goodVideo(), goodVideo(), goodVideo()],
    post: { knowledge: 'k', emotion: 'e', insight: 'i' }
  };
}

console.log('\nstyleValidatePlan — chặn JSON rác từ AI\n');

test('bộ hợp lệ thì ok', () => {
  const r = app.styleValidatePlan([goodSet()]);
  assert.ok(r.ok, 'phải hợp lệ, lỗi: ' + r.errors.join(' | '));
});

test('nhận cả dạng {sets:[...]}', () => {
  assert.ok(app.styleValidatePlan({ sets: [goodSet()] }).ok);
});

test('không phải mảng thì báo lỗi, không ném exception', () => {
  const r = app.styleValidatePlan(null);
  assert.strictEqual(r.ok, false);
  assert.ok(r.errors.length);
});

test('quá 5 bộ thì báo lỗi', () => {
  const r = app.styleValidatePlan([1,2,3,4,5,6].map(goodSet));
  assert.ok(r.errors.some(e => /tối đa 5/.test(e)));
});

test('phải đúng 4 look', () => {
  const s = goodSet(); s.looks = [goodLook(1), goodLook(2)];
  assert.ok(app.styleValidatePlan([s]).errors.some(e => /phải đúng 4/.test(e)));
});

test('phải đúng 3 video', () => {
  const s = goodSet(); s.videos = [goodVideo()];
  assert.ok(app.styleValidatePlan([s]).errors.some(e => /phải đúng 3/.test(e)));
});

test('clip dưới 6 thì báo lỗi', () => {
  const s = goodSet(); s.videos[0].clips = [0,1,2].map(goodClip);
  assert.ok(app.styleValidatePlan([s]).errors.some(e => /phải 6-8/.test(e)));
});

test('clip trên 8 thì báo lỗi', () => {
  const s = goodSet(); s.videos[0].clips = [0,1,2,3,4,5,6,7,8].map(goodClip);
  assert.ok(app.styleValidatePlan([s]).errors.some(e => /phải 6-8/.test(e)));
});

test('overlay rỗng thì báo lỗi', () => {
  const s = goodSet(); s.videos[0].clips[0].overlay = '   ';
  assert.ok(app.styleValidatePlan([s]).errors.some(e => /thiếu text overlay/.test(e)));
});

test('overlay dài quá 12 từ thì báo lỗi', () => {
  const s = goodSet(); s.videos[0].clips[0].overlay = 'một hai ba bốn năm sáu bảy tám chín mười mười một mười hai mười ba';
  assert.ok(app.styleValidatePlan([s]).errors.some(e => /12 từ/.test(e)));
});

test('góc máy lạ thì báo lỗi', () => {
  const s = goodSet(); s.videos[0].clips[0].angle = 'drone bay vòng quanh';
  assert.ok(app.styleValidatePlan([s]).errors.some(e => /góc máy/.test(e)));
});

test('thiếu tầng bài post thì báo lỗi', () => {
  const s = goodSet(); s.post.insight = '';
  assert.ok(app.styleValidatePlan([s]).errors.some(e => /tầng insight/.test(e)));
});

test('thiếu ảnh gốc thì báo lỗi', () => {
  const s = goodSet(); delete s.base;
  assert.ok(app.styleValidatePlan([s]).errors.some(e => /ảnh gốc/.test(e)));
});

console.log(failed ? `\n${failed} test FAIL\n` : '\nTất cả test PASS\n');
process.exit(failed ? 1 : 0);
```

- [ ] **Step 2: Chạy test để thấy nó fail**

Run: `node test/style-plan.test.js`
Expected: FAIL — `Không trích được khối STYLE PLAN VALIDATOR từ index.html`

- [ ] **Step 3: Viết hàm validate**

Chèn vào `index.html` **ngay trước** dòng `const VID_TALENTS=[`:

```js
/* ================= STYLE BRAIN — bộ não phối đồ ================= */
/* == STYLE PLAN VALIDATOR (test/style-plan.test.js trích đúng đoạn giữa 2 mốc này) == */
function styleValidatePlan(plan){
  const errors=[];
  const sets=Array.isArray(plan)?plan:(plan&&Array.isArray(plan.sets)?plan.sets:null);
  if(!sets||!sets.length)return {ok:false,errors:['AI không trả về bộ nào — thử lại hoặc rút gọn đầu vào']};
  if(sets.length>5)errors.push('AI trả về '+sets.length+' bộ, tối đa 5');
  sets.forEach((s,i)=>{
    const at='Bộ '+(i+1)+': ';
    if(!s||typeof s!=='object'){errors.push(at+'không phải object');return;}
    if(!String(s.styleName||'').trim())errors.push(at+'thiếu tên phong cách');
    if(!s.base||!String(s.base.prompt_en||'').trim())errors.push(at+'thiếu ảnh gốc (base.prompt_en)');
    const looks=Array.isArray(s.looks)?s.looks:[];
    if(looks.length!==4)errors.push(at+'có '+looks.length+' look, phải đúng 4');
    looks.forEach((l,li)=>{
      if(!l||!String(l.name||'').trim())errors.push(at+'look '+(li+1)+' thiếu tên phong cách');
      if(!l||!String(l.prompt_en||'').trim())errors.push(at+'look '+(li+1)+' thiếu prompt_en');
    });
    const vids=Array.isArray(s.videos)?s.videos:[];
    if(vids.length!==3)errors.push(at+'có '+vids.length+' video, phải đúng 3');
    vids.forEach((v,vi)=>{
      const cl=(v&&Array.isArray(v.clips))?v.clips:[];
      if(cl.length<6||cl.length>8)errors.push(at+'video '+(vi+1)+' có '+cl.length+' clip, phải 6-8');
      cl.forEach((c,ci)=>{
        const w='video '+(vi+1)+' clip '+(ci+1)+' ';
        if(!c||!String(c.prompt_en||'').trim())errors.push(at+w+'thiếu prompt_en');
        const ov=String((c&&c.overlay)||'').trim();
        if(!ov)errors.push(at+w+'thiếu text overlay');
        else if(ov.split(/\s+/).length>12)errors.push(at+w+'overlay dài quá 12 từ');
        if(!c||ANGLES.indexOf(c.angle)<0)errors.push(at+w+'góc máy không nằm trong danh sách cho phép');
      });
    });
    const p=(s.post&&typeof s.post==='object')?s.post:{};
    ['knowledge','emotion','insight'].forEach(k=>{if(!String(p[k]||'').trim())errors.push(at+'bài post thiếu tầng '+k);});
  });
  return {ok:!errors.length,errors:errors};
}
/* == END STYLE PLAN VALIDATOR == */
```

- [ ] **Step 4: Chạy lại test**

Run: `node test/style-plan.test.js`
Expected: PASS toàn bộ 13 test

- [ ] **Step 5: Kiểm tra cú pháp cả file**

Run: `node test/syntax.test.js`
Expected: `✓ script#1 (... ký tự) cú pháp OK`

- [ ] **Step 6: Commit**

```bash
git add index.html test/style-plan.test.js
git commit -m "feat(style): styleValidatePlan — chặn JSON rác từ AI trước khi vào state"
```

---

## Task 3: DNA thời trang — dữ liệu, prompt lock, UI

**Files:**
- Modify: `index.html` (chèn tiếp ngay sau khối validator của Task 2)

- [ ] **Step 1: Thêm định nghĩa field + hàm dựng lock tiếng Anh**

```js
const FASHION_FIELDS=[
 {k:'archetype',label:'Archetype phong cách',ph:'VD: gothic romantic × tailoring tối giản'},
 {k:'silhouette',label:'Dáng đồ / tỉ lệ',ph:'eo siết, chân váy xoè dài, vai cấu trúc'},
 {k:'palette',label:'Bảng màu',ph:'đen chủ đạo · đỏ rượu accent · bạc lạnh'},
 {k:'fabrics',label:'Chất liệu',ph:'ren, nhung, da lộn, voan'},
 {k:'accessories',label:'Phụ kiện đặc trưng',ph:'choker bạc, boots cao cổ, găng ren'},
 {k:'hairMakeup',label:'Tóc & makeup đi kèm',ph:'tóc đen dài, môi berry, mắt khói nhẹ'},
 {k:'avoid',label:'TỪ CẤM — không bao giờ mặc',ph:'pastel, hoạ tiết hoa nhí, đồ thể thao'}
];
/* Khoá phong cách bơm vào MỌI prompt ảnh/video của tab này. avoid đi vào dạng phủ định. */
function fashionDnaEN(){
  const d=S.fashionDna||{};
  const on=[['STYLE ARCHETYPE',d.archetype],['SILHOUETTE',d.silhouette],['COLOR PALETTE',d.palette],
    ['FABRICS',d.fabrics],['SIGNATURE ACCESSORIES',d.accessories],['HAIR & MAKEUP',d.hairMakeup]]
    .filter(x=>String(x[1]||'').trim()).map(x=>x[0]+': '+String(x[1]).trim()).join(' · ');
  const no=String(d.avoid||'').trim();
  return (on?(' FASHION DNA LOCK — '+on+'.'):'')+(no?(' NEVER include: '+no+'.'):'');
}
function fashionDnaFilled(){return FASHION_FIELDS.some(f=>String((S.fashionDna||{})[f.k]||'').trim());}
```

- [ ] **Step 2: Thêm UI khối DNA + lưu**

```js
function fashionDnaHTML(){
  const d=S.fashionDna||{};
  return `<div class="card">
    <h2>🧬 DNA thời trang của nhân vật</h2>
    <p class="hint" style="margin-top:2px">Bơm vào mọi ảnh, video và bài viết của tab này — thứ giữ cho các bộ sinh cách nhau vẫn cùng một gốc phong cách.</p>
    <div class="bar"><button class="btn gold" id="fdnaBtn" onclick="genFashionDna()" ${personaOK()?'':'disabled'}>✨ AI viết DNA thời trang</button>
      <button class="btn" onclick="saveFashionDna()">Lưu DNA</button></div>
    ${FASHION_FIELDS.map(f=>`<label style="margin-top:8px">${esc(f.label)}</label>
      <input data-fdna="${f.k}" value="${esc(d[f.k]||'')}" placeholder="${esc(f.ph)}">`).join('')}
  </div>`;
}
function saveFashionDna(){
  const d={};document.querySelectorAll('#main [data-fdna]').forEach(el=>{d[el.dataset.fdna]=el.value.trim();});
  S.fashionDna=d;save();toast('Đã lưu DNA thời trang');
}
async function genFashionDna(){
  if(!S.apiKey){toast('Chưa có API key');go('setup');return;}
  if(!personaOK()){toast('Cần nhân vật (bước ③)');return;}
  const b=document.getElementById('fdnaBtn');if(b){b.disabled=true;b.innerHTML='<span class="spinner"></span> Đang viết...';}
  const p=S.persona||{};
  const prompt=`Bạn là stylist trưởng. Từ hồ sơ nhân vật dưới đây, viết DNA THỜI TRANG riêng của cô/anh ấy.

NHÂN VẬT: ${p.name||''} · ${p.age||''} · ${p.gender||''}
Ngoại hình: ${p.ethnicityLook||''}
Thần thái: ${p.vibe||''}
Phong cách hình ảnh kênh: ${p.visualStyle||''}
Nghề/định vị: ${p.occupation||''} · Niche: ${p.niche||''}

Trả về DUY NHẤT JSON:
{"archetype":"","silhouette":"","palette":"","fabrics":"","accessories":"","hairMakeup":"","avoid":""}

LUẬT:
- Mỗi field 1 dòng ngắn, cụ thể, dùng được ngay làm chỉ dẫn cho stylist. Tiếng Việt.
- "archetype" nêu 1-2 trường phái thời trang có thật, ghép lại (VD: "gothic romantic × tailoring tối giản").
- "avoid" liệt kê 3-5 thứ nhân vật này KHÔNG BAO GIỜ mặc — phải mâu thuẫn thật với archetype.
- Không nhắc tên thương hiệu thật.`;
  try{
    const d=parseJSON(await geminiText(prompt,true));
    S.fashionDna=Object.assign({},S.fashionDna||{},d);save();
    renderStudio(document.getElementById('main'));toast('✓ Đã viết DNA thời trang — sửa lại cho đúng ý rồi Lưu');
  }catch(e){toast('Lỗi AI: '+(e.message||e));}
  finally{if(b){b.disabled=false;b.innerHTML='✨ AI viết DNA thời trang';}}
}
```

- [ ] **Step 3: Kiểm tra cú pháp**

Run: `node test/syntax.test.js`
Expected: `✓ script#1 ... cú pháp OK`

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat(style): DNA thời trang per nhân vật + AI viết nháp + lock tiếng Anh"
```

---

## Task 4: Tab `👠 Phối đồ` — vỏ tab và khối nhập tối đa 5 bộ

**Files:**
- Modify: `index.html` (`renderStudio` thêm nút tab + dispatch; chèn tiếp khối Style Brain)

- [ ] **Step 1: Thêm nút tab và dispatch**

Trong `renderStudio`, thêm nút **sau** dòng tab `product`:

```js
    <button class="tab ${t==='style'?'active':''}" onclick="studioTab('style')">👠 Phối đồ</button>
```

Và thêm dispatch **sau** dòng `else if(t==='product')renderProductSet(body);`:

```js
  else if(t==='style')renderStyleBrain(body);
```

- [ ] **Step 2: Thêm state tạm + khối nhập**

```js
const STYLE={inputs:[{kind:'wardrobe',key:'',text:''}],ratio:'4:5',busy:false,openId:'',exportIds:[]};
const STYLE_KINDS=[['wardrobe','👗 Món đồ có sẵn'],['text','✍️ Mô tả tự gõ'],['occasion','📅 Dịp mặc']];
function styleSrcItems(){
  const out=[];
  (S.wardrobe||[]).forEach(w=>out.push({key:'wb:'+w.id,name:w.name||'Outfit',desc:w.masterPrompt||w.name||''}));
  (S.products||[]).forEach(p=>{if(p.imgKey)out.push({key:p.imgKey,name:p.name||'Sản phẩm',desc:p.desc||p.name||''});});
  return out;
}
function styleAddInput(){if(STYLE.inputs.length>=5){toast('Tối đa 5 bộ một lần');return;}STYLE.inputs.push({kind:'wardrobe',key:'',text:''});renderStyleBrain(document.getElementById('studioBody'));}
function styleDelInput(i){STYLE.inputs.splice(i,1);if(!STYLE.inputs.length)STYLE.inputs.push({kind:'wardrobe',key:'',text:''});renderStyleBrain(document.getElementById('studioBody'));}
function styleSetKind(i,k){STYLE.inputs[i].kind=k;renderStyleBrain(document.getElementById('studioBody'));}
function styleReadInputs(){
  document.querySelectorAll('#styleInputs [data-si]').forEach(el=>{
    const i=parseInt(el.dataset.si,10);if(!STYLE.inputs[i])return;
    if(el.dataset.f==='key')STYLE.inputs[i].key=el.value;else STYLE.inputs[i].text=el.value;
  });
  const r=document.getElementById('styleRatio');if(r)STYLE.ratio=r.value;
}
function styleInputsHTML(){
  const items=styleSrcItems();
  return `<div class="card">
    <h2>👠 Tạo bộ phối đồ <span class="hint">(tối đa 5 bộ / lần)</span></h2>
    ${fashionDnaFilled()?'':'<div class="note" style="border-color:var(--gold);color:var(--gold)">💡 Chưa có DNA thời trang — nên viết trước để 5 bộ đồng nhất phong cách.</div>'}
    <div id="styleInputs">${STYLE.inputs.map((it,i)=>`<div class="card" style="margin-top:10px;padding:12px">
      <div class="bar" style="justify-content:space-between"><b>Bộ ${i+1}</b>
        <button class="btn ghost sm" onclick="styleDelInput(${i})">✕</button></div>
      <div>${STYLE_KINDS.map(k=>`<span class="chip" style="${it.kind===k[0]?'border-color:var(--gold);color:var(--gold)':''}" onclick="styleReadInputs();styleSetKind(${i},'${k[0]}')">${k[1]}</span>`).join(' ')}</div>
      ${it.kind==='wardrobe'
        ? `<select data-si="${i}" data-f="key" style="margin-top:8px">${items.length?items.map(x=>`<option value="${esc(x.key)}" ${it.key===x.key?'selected':''}>${esc(x.name)}</option>`).join(''):'<option value="">— chưa có món đồ nào trong Tủ đồ / Kho SP —</option>'}</select>`
        : `<input data-si="${i}" data-f="text" value="${esc(it.text)}" placeholder="${it.kind==='occasion'?'VD: đi làm ngày mưa, hẹn hò tối, du lịch biển':'VD: đầm đen dài ren tay phồng'}" style="margin-top:8px">`}
    </div>`).join('')}</div>
    <div class="bar" style="margin-top:10px;flex-wrap:wrap">
      <button class="btn ghost sm" onclick="styleReadInputs();styleAddInput()">+ Thêm bộ</button>
      <div><label style="margin:0 0 2px">Tỉ lệ ảnh</label><select id="styleRatio">${['1:1','4:5','9:16'].map(r=>`<option value="${r}" ${STYLE.ratio===r?'selected':''}>${r}</option>`).join('')}</select></div>
      <button class="btn gold" id="stylePlanBtn" onclick="styleGenPlan()" ${personaOK()?'':'disabled'}>🧠 Sinh kế hoạch ${STYLE.inputs.length} bộ</button>
    </div>
    <div id="stylePlanErr" class="note" style="display:none;border-color:var(--coral);color:#ffb3b3"></div>
  </div>`;
}
```

- [ ] **Step 3: Thêm hàm render tab (bản tạm, chưa có danh sách bộ)**

```js
function renderStyleBrain(b){
  b.innerHTML=fashionDnaHTML()+styleInputsHTML()+'<div id="styleSetList"></div>';
  renderStyleSets();
}
function renderStyleSets(){const el=document.getElementById('styleSetList');if(el)el.innerHTML='';}
```

- [ ] **Step 4: Kiểm tra cú pháp**

Run: `node test/syntax.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat(style): tab Phối đồ + khối nhập tối đa 5 bộ (3 kiểu đầu vào)"
```

---

## Task 5: Giai đoạn 1 — sinh kế hoạch

**Files:**
- Modify: `index.html` (chèn tiếp khối Style Brain)

- [ ] **Step 1: Viết hàm dựng prompt**

```js
function styleSourceLine(it,i){
  if(it.kind==='wardrobe'){const x=styleSrcItems().find(s=>s.key===it.key);
    return (i+1)+'. MÓN ĐỒ CÓ SẴN: "'+((x&&x.name)||'món đồ')+'"'+((x&&x.desc)?(' — '+x.desc):'');}
  if(it.kind==='occasion')return (i+1)+'. DỊP MẶC: '+(it.text||'đời thường');
  return (i+1)+'. MÔ TẢ: '+(it.text||'một bộ đồ hợp nhân vật');
}
function stylePlanPrompt(inputs){
  const p=S.persona||{};const d=S.fashionDna||{};
  const lang=(typeof CC!=='undefined'&&CC.lang==='en')?'English':'tiếng Việt';
  return `Bạn là giám đốc sáng tạo thời trang kiêm biên kịch video ngắn.

NHÂN VẬT: ${p.name||''} · ${p.gender||''} ${p.age||''} · ${p.ethnicityLook||''} · thần thái: ${p.vibe||''}
DNA THỜI TRANG (bắt buộc bám):
- Archetype: ${d.archetype||'(chưa có — tự suy từ nhân vật)'}
- Dáng đồ: ${d.silhouette||''} · Bảng màu: ${d.palette||''} · Chất liệu: ${d.fabrics||''}
- Phụ kiện: ${d.accessories||''} · Tóc/makeup: ${d.hairMakeup||''}
- TUYỆT ĐỐI KHÔNG: ${d.avoid||'(không có)'}

ĐẦU VÀO ${inputs.length} BỘ:
${inputs.map(styleSourceLine).join('\n')}

Với MỖI bộ, tạo:
A. 1 ảnh gốc: nhân vật mặc món đồ đó ĐƠN GIẢN nhất, nền sạch, đủ thấy toàn bộ trang phục.
B. ĐÚNG 4 look phối cùng món đồ đó theo 4 phong cách KHÁC NHAU RÕ RỆT, phong cách nào cũng phải nằm trong DNA thời trang. Mỗi look kèm 1 câu "why" giải thích nguyên tắc phối (tiếng Việt).
C. ĐÚNG 3 video 10 giây dạy người xem phối đồ. Mỗi video 6-8 clip quick-cut, MỖI CLIP MỘT GÓC MÁY KHÁC NHAU, chuyển mượt.
D. 1 bài đăng 3 tầng giá trị.

Trả về DUY NHẤT JSON:
{"sets":[{
 "styleName":"tên phong cách chung của bộ",
 "base":{"prompt_en":"mô tả ảnh gốc bằng tiếng Anh"},
 "looks":[{"name":"tên phong cách look","why":"nguyên tắc phối, tiếng Việt","prompt_en":"mô tả ảnh bằng tiếng Anh"}],
 "videos":[{"title":"","hook":"câu hook mở đầu","audio":"mô tả nhạc nền tiếng Anh","clips":[
   {"seq":1,"angle":"PHẢI copy nguyên văn 1 giá trị trong DANH SÁCH GÓC MÁY","action":"hành động trong clip, tiếng Anh","overlay":"chữ hiện trên màn hình, TỐI ĐA 12 TỪ, ${lang}","prompt_en":"mô tả cảnh quay bằng tiếng Anh"}]}],
 "post":{"knowledge":"","emotion":"","insight":"","caption":"","hashtags":"#..."}
}]}

DANH SÁCH GÓC MÁY (chỉ được dùng đúng các chuỗi này):
${ANGLES.map(a=>'- '+a).join('\n')}

LUẬT BẮT BUỘC:
- Đúng 4 look, đúng 3 video, mỗi video 6-8 clip. Sai số lượng là hỏng.
- overlay KHÔNG ĐƯỢC rỗng và không quá 12 từ.
- prompt_en tả HÀNH ĐỘNG và BỐI CẢNH, KHÔNG tả khuôn mặt nhân vật (ảnh tham chiếu lo phần đó).
- 3 tầng bài post viết bằng ${lang}: "knowledge" = nguyên tắc phối áp dụng được ngay (tỉ lệ/màu/chất liệu); "emotion" = tả khoảnh khắc và góc máy bắt mắt, cảm giác khi mặc; "insight" = chi tiết ít người biết (gốc gác món đồ, mẹo, lỗi thường gặp). Không tầng nào được rỗng.
- Không nhắc tên thương hiệu thật, không claim y khoa.`;
}
```

- [ ] **Step 2: Viết hàm gọi AI + validate + ghi state**

```js
async function styleGenPlan(){
  if(!S.apiKey){toast('Chưa có API key');go('setup');return;}
  if(!personaOK()){toast('Cần nhân vật (bước ③)');return;}
  styleReadInputs();
  const inputs=STYLE.inputs.slice(0,5);
  const err=document.getElementById('stylePlanErr');if(err)err.style.display='none';
  const b=document.getElementById('stylePlanBtn');if(b){b.disabled=true;b.innerHTML='<span class="spinner"></span> Đang dựng kế hoạch...';}
  try{
    const plan=parseJSON(await geminiText(stylePlanPrompt(inputs),true));
    const v=styleValidatePlan(plan);
    if(!v.ok){
      if(err){err.style.display='block';err.innerHTML='<b>AI trả sai cấu trúc — chưa lưu gì cả:</b><br>'+v.errors.slice(0,8).map(esc).join('<br>');}
      toast('Kế hoạch không hợp lệ — bấm sinh lại');return;
    }
    const sets=Array.isArray(plan)?plan:plan.sets;
    sets.forEach((s,i)=>{
      const src=inputs[i]||inputs[inputs.length-1];
      S.styleSets.unshift({id:uid(),createdAt:_today10(),ratio:STYLE.ratio,
        source:{kind:src.kind,key:src.key||'',text:src.text||''},
        styleName:s.styleName,base:{prompt_en:s.base.prompt_en,gid:''},
        looks:s.looks.map(l=>({name:l.name,why:l.why||'',prompt_en:l.prompt_en,gid:''})),
        videos:s.videos,post:s.post});
    });
    while(S.styleSets.length>20){const old=S.styleSets.pop();await styleDropImages(old);}
    save();renderStyleBrain(document.getElementById('studioBody'));
    toast('✓ Xong kế hoạch '+sets.length+' bộ — xem lại rồi bấm render ảnh');
  }catch(e){
    if(err){err.style.display='block';err.textContent='Lỗi AI: '+(e.message||e);}
    toast('Lỗi AI: '+(e.message||e));
  }finally{if(b){b.disabled=false;b.innerHTML='🧠 Sinh kế hoạch '+STYLE.inputs.length+' bộ';}}
}
async function styleDropImages(set){
  if(!set)return;
  const gids=[set.base&&set.base.gid].concat((set.looks||[]).map(l=>l.gid)).filter(Boolean);
  for(const g of gids){try{await mediaDel('g:'+g);}catch(e){}}
  S.gallery=(S.gallery||[]).filter(x=>gids.indexOf(x.id)<0);
}
```

- [ ] **Step 3: Kiểm tra cú pháp**

Run: `node test/syntax.test.js`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat(style): giai đoạn 1 — sinh kế hoạch 5 bộ, validate trước khi ghi state"
```

---

## Task 6: Hiển thị từng bộ (lưới ảnh dùng lazyThumb)

**Files:**
- Modify: `index.html` (thay hàm tạm `renderStyleSets` từ Task 4)

- [ ] **Step 1: Thay hàm tạm bằng bản thật**

Xoá dòng tạm `function renderStyleSets(){const el=document.getElementById('styleSetList');if(el)el.innerHTML='';}` và thay bằng:

```js
function styleSetCardHTML(s){
  const imgs=[{t:'Gốc',g:s.base.gid,n:'Mặc đơn giản'}].concat((s.looks||[]).map((l,i)=>({t:'Look '+(i+1),g:l.gid,n:l.name})));
  const done=imgs.filter(x=>x.g).length;
  return `<div class="card" style="margin-top:14px">
    <div class="bar" style="justify-content:space-between;flex-wrap:wrap">
      <div><b>${esc(s.styleName)}</b> <span class="hint">· ${esc(s.createdAt)} · ${done}/5 ảnh</span></div>
      <div class="bar" style="margin:0">
        <label class="hint" style="margin:0"><input type="checkbox" data-sx="${s.id}" ${STYLE.exportIds.indexOf(s.id)>=0?'checked':''} onchange="styleToggleExport('${s.id}')"> xuất</label>
        <button class="btn blue sm" id="stylerender_${s.id}" onclick="styleRenderSet('${s.id}')">🖼 Render 5 ảnh</button>
        <button class="btn ghost sm" onclick="styleDelSet('${s.id}')">✕</button>
      </div>
    </div>
    <div class="imgrid">${imgs.map(x=>`<div class="imgcard">
      ${x.g?`<img data-ik="g:${x.g}" loading="lazy" style="aspect-ratio:3/4;object-fit:cover" alt="">`:`<div style="aspect-ratio:3/4;display:flex;align-items:center;justify-content:center;font-size:22px;color:#5b7187">👗</div>`}
      <div class="ov" style="opacity:1;background:linear-gradient(transparent,rgba(0,0,0,.6))"><span style="font-size:10px;padding:3px 5px">${esc(x.t)} · ${esc(x.n||'')}</span></div></div>`).join('')}</div>
    <div id="styleerr_${s.id}" class="hint" style="color:var(--coral)"></div>
    <details style="margin-top:10px"><summary class="hint">🎬 3 prompt video (${(s.videos||[]).length}) — bấm xem</summary>
      ${(s.videos||[]).map((v,vi)=>`<div class="note" style="margin-top:8px"><b>Video ${vi+1}: ${esc(v.title||'')}</b> <span class="hint">${esc(v.hook||'')}</span>
        ${(v.clips||[]).map(c=>`<div style="margin-top:6px;padding-left:8px;border-left:2px solid var(--line)">
          <div class="hint">Clip ${c.seq} · ${esc(c.angle)} · overlay: <b>${esc(c.overlay)}</b></div>
          <div style="font-size:12px">${esc(c.prompt_en)}</div></div>`).join('')}
        <button class="btn ghost sm" style="margin-top:8px" onclick="styleCopyVideo('${s.id}',${vi})">Copy prompt video ${vi+1}</button></div>`).join('')}
    </details>
    <details style="margin-top:8px"><summary class="hint">📝 Bài đăng 3 tầng giá trị</summary>
      <div class="note" style="margin-top:8px">
        <b>① Kiến thức:</b> ${esc(s.post.knowledge)}<br><br>
        <b>② Cảm xúc:</b> ${esc(s.post.emotion)}<br><br>
        <b>③ Độc đáo:</b> ${esc(s.post.insight)}<br><br>
        <b>Caption:</b> ${esc(s.post.caption||'')}<br><b>Hashtag:</b> ${esc(s.post.hashtags||'')}
      </div>
      <button class="btn ghost sm" style="margin-top:8px" onclick="styleCopyPost('${s.id}')">Copy bài đăng</button>
    </details>
  </div>`;
}
function renderStyleSets(){
  const el=document.getElementById('styleSetList');if(!el)return;
  const list=S.styleSets||[];
  if(!list.length){el.innerHTML='<div class="hint" style="text-align:center;margin-top:14px">Chưa có bộ nào — nhập đầu vào rồi bấm Sinh kế hoạch.</div>';return;}
  el.innerHTML=`<div class="bar" style="margin-top:16px;flex-wrap:wrap">
      <button class="btn gold" onclick="styleFlowPack()">⬇ Xuất flow-pack cho Flow</button>
      <button class="btn ghost" onclick="styleDlOriginals()">⬇ Tải ảnh gốc</button>
      <span class="hint" style="align-self:center">${list.length} bộ đã lưu (giữ tối đa 20)</span>
    </div>`+list.map(styleSetCardHTML).join('');
  /* Lưới ảnh: chỉ thumb, không bao giờ mediaGet trong vòng lặp — xem mục "Luật ảnh" trong README. */
  el.querySelectorAll('img[data-ik]').forEach(im=>lazyThumb(im,im.getAttribute('data-ik')));
}
function styleToggleExport(id){const i=STYLE.exportIds.indexOf(id);if(i<0)STYLE.exportIds.push(id);else STYLE.exportIds.splice(i,1);}
async function styleDelSet(id){
  const s=(S.styleSets||[]).find(x=>x.id===id);if(!s)return;
  await styleDropImages(s);
  S.styleSets=(S.styleSets||[]).filter(x=>x.id!==id);
  STYLE.exportIds=STYLE.exportIds.filter(x=>x!==id);
  save();renderStyleBrain(document.getElementById('studioBody'));toast('Đã xoá bộ');
}
function styleCopyVideo(id,vi){
  const s=(S.styleSets||[]).find(x=>x.id===id);if(!s)return;const v=(s.videos||[])[vi];if(!v)return;
  const t=(v.clips||[]).map(c=>'[Clip '+c.seq+' · '+c.angle+' · overlay: "'+c.overlay+'"]\n'+c.prompt_en).join('\n\n');
  if(navigator.clipboard)navigator.clipboard.writeText(t);toast('Đã copy prompt video '+(vi+1));
}
function styleCopyPost(id){
  const s=(S.styleSets||[]).find(x=>x.id===id);if(!s)return;const p=s.post||{};
  const t=['① KIẾN THỨC\n'+p.knowledge,'② CẢM XÚC\n'+p.emotion,'③ ĐỘC ĐÁO\n'+p.insight,p.caption||'',p.hashtags||''].filter(Boolean).join('\n\n');
  if(navigator.clipboard)navigator.clipboard.writeText(t);toast('Đã copy bài đăng');
}
```

- [ ] **Step 2: Kiểm tra cú pháp**

Run: `node test/syntax.test.js`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat(style): card từng bộ — lưới ảnh lazyThumb, xem prompt video, copy bài đăng"
```

---

## Task 7: Giai đoạn 2 — render 5 ảnh tuần tự

**Files:**
- Modify: `index.html` (chèn tiếp); `GAL_KINDS`

- [ ] **Step 1: Thêm loại ảnh mới vào bộ lọc thư viện**

```js
const GAL_KINDS=[['all','Tất cả'],['shot','Photoshoot'],['product','Bộ ảnh SP'],['content','Ảnh bài'],['wardrobe','Outfit'],['style','Phối đồ']];
```

- [ ] **Step 2: Viết hàm render ảnh**

```js
function styleImgPrompt(sceneEN,ratio){
  const r=CC_RATIOS[ratio]||CC_RATIOS['4:5'];
  return sceneEN+'.'+fashionDnaEN()+' Photorealistic fashion photography, natural skin texture, sharp fabric detail, '+r+'. Keep the same face as the reference image.';
}
async function styleRefs(set){
  const refs=[];
  const face=await getRef();if(face)refs.push(face);
  /* Ảnh món đồ đặt CUỐI: geminiImageMulti khi bị chặn sẽ bỏ dần ref từ đầu và giữ ref cuối
     lâu nhất → ưu tiên giữ đúng món đồ. */
  if(set.source&&set.source.kind==='wardrobe'&&set.source.key){
    const u=await mediaGet(set.source.key);if(u)refs.push(u);
  }
  return refs;
}
async function styleRenderSet(id){
  if(!S.apiKey){toast('Chưa có API key');go('setup');return;}
  const s=(S.styleSets||[]).find(x=>x.id===id);if(!s)return;
  const btn=document.getElementById('stylerender_'+id);
  const errBox=document.getElementById('styleerr_'+id);if(errBox)errBox.textContent='';
  const refs=await styleRefs(s);
  const jobs=[{label:'ảnh gốc',get:()=>s.base,scene:s.base.prompt_en}]
    .concat((s.looks||[]).map((l,i)=>({label:'look '+(i+1),get:()=>s.looks[i],scene:l.prompt_en})));
  const errs=[];
  /* Tuần tự: mỗi ảnh Gemini trả về là 1-7MB base64, chạy song song là dội RAM. */
  for(let i=0;i<jobs.length;i++){
    const j=jobs[i];
    if(btn){btn.disabled=true;btn.innerHTML='<span class="spinner"></span> '+(i+1)+'/'+jobs.length;}
    try{
      const u=await geminiImageMulti(styleImgPrompt(j.scene,s.ratio),refs);
      const gid=await addToGallery(u,s.styleName+' — '+j.label,'style');
      j.get().gid=gid;save();
    }catch(e){errs.push(j.label+': '+(e.message||e));}
  }
  if(btn){btn.disabled=false;btn.innerHTML='🖼 Render 5 ảnh';}
  renderStyleBrain(document.getElementById('studioBody'));
  const box=document.getElementById('styleerr_'+id);
  if(box&&errs.length)box.innerHTML='Lỗi: '+errs.map(esc).join(' · ');
  toast(errs.length?('Xong, '+errs.length+' ảnh lỗi'):'✓ Đã render 5 ảnh');
}
```

- [ ] **Step 3: Kiểm tra cú pháp**

Run: `node test/syntax.test.js`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat(style): render 5 ảnh/bộ tuần tự, ảnh lỗi không làm hỏng cả bộ"
```

---

## Task 8: Xuất flow-pack + test trong Chrome

**Files:**
- Modify: `index.html`
- Test: `test/style-pack.test.html` (tạo mới)

- [ ] **Step 1: Viết test fail trước**

Tạo `test/style-pack.test.html`:

```html
<!doctype html>
<meta charset="utf-8">
<title>style-pack test</title>
<body><pre id="out">running...</pre>
<script>
/* Nạp app vào iframe rồi gọi thẳng styleBuildPack() với dữ liệu giả.
   Kiểm tra flow-pack đúng schema và ảnh nhúng ĐÃ được thu nhỏ.
   Chạy: chrome --headless --dump-dom test/style-pack.test.html */
const lines=[];let failed=0;
function ok(c,m){lines.push((c?'  PASS ':'  FAIL ')+m);if(!c)failed++;}

async function main(){
  let html=await (await fetch('../index.html')).text();
  html=html.replace(/<head>/i,'<head><script>window.__errs=[];window.addEventListener("error",function(e){window.__errs.push(e.message)});<\/script>');
  const f=document.createElement('iframe');f.style.cssText='width:1200px;height:900px;border:0';
  document.body.appendChild(f);
  await new Promise(res=>{f.onload=res;f.srcdoc=html;});
  const w=f.contentWindow;
  await new Promise(r=>setTimeout(r,1500));
  ok((w.__errs||[]).length===0,'app boot không lỗi'+((w.__errs||[]).length?': '+w.__errs.join(' | '):''));

  // Ảnh giả cỡ thật để chứng minh khâu thu nhỏ có tác dụng.
  const cv=w.document.createElement('canvas');cv.width=1400;cv.height=2100;
  const ctx=cv.getContext('2d');const im=ctx.createImageData(1400,2100);
  for(let i=0;i<im.data.length;i+=4){im.data[i]=Math.random()*255;im.data[i+1]=Math.random()*255;im.data[i+2]=Math.random()*255;im.data[i+3]=255;}
  ctx.putImageData(im,0,0);
  const big=cv.toDataURL('image/png');
  lines.push('Ảnh gốc giả lập: '+(big.length/1024/1024).toFixed(2)+' MB');

  const clips=[0,1,2,3,4,5].map(i=>({seq:i+1,angle:w.eval('ANGLES[0]'),action:'a',overlay:'Phối áo dài',prompt_en:'shot '+i}));
  const set={id:'s1',createdAt:'2026-08-09',ratio:'4:5',source:{kind:'text',key:'',text:'đầm đen'},
    styleName:'Gothic tối giản',
    base:{prompt_en:'plain',gid:'g1'},
    looks:[1,2,3,4].map(i=>({name:'Look '+i,why:'w',prompt_en:'p'+i,gid:'g'+(i+1)})),
    videos:[1,2,3].map(i=>({title:'V'+i,hook:'h',audio:'lo-fi',clips:clips})),
    post:{knowledge:'k',emotion:'e',insight:'i',caption:'c',hashtags:'#h'}};

  // styleBuildPack nhận hàm lấy ảnh để test không phụ thuộc IndexedDB
  const pack=await w.styleBuildPack([set],async()=>big);

  ok(pack.schema==='flow-pack/v1','schema đúng flow-pack/v1');
  ok(Array.isArray(pack.days)&&pack.days.length===3,'3 video → 3 ngày (được '+(pack.days||[]).length+')');
  ok(pack.days[0].shots.length===6,'video 6 clip → 6 shot (được '+pack.days[0].shots.length+')');
  ok(!!pack.days[0].shots[0].prompt_en,'shot có prompt_en');
  ok(pack.days[0].shots[0].overlay.text==='Phối áo dài','overlay giữ nguyên text');
  ok(!!pack.days[0].shots[0].goc_may,'shot có góc máy');
  ok(Array.isArray(pack.characters)&&pack.characters.length===1,'có 1 nhân vật');
  ok(pack.products.length===5,'5 ảnh của bộ → 5 reference (được '+pack.products.length+')');

  const embeds=[pack.characters[0].anh_base64].concat(pack.products.map(p=>p.anh_base64)).filter(Boolean);
  ok(embeds.length===6,'6 ảnh được nhúng');
  const biggest=Math.max.apply(null,embeds.map(x=>x.length));
  lines.push('Ảnh nhúng lớn nhất: '+(biggest/1024).toFixed(0)+' KB');
  ok(biggest<400*1024,'mọi ảnh nhúng đều dưới 400KB (đã thu nhỏ)');
  ok(biggest<big.length*0.2,'ảnh nhúng nhỏ hơn 20% ảnh gốc');

  const json=JSON.stringify(pack);
  lines.push('Cả file pack: '+(json.length/1024/1024).toFixed(2)+' MB');
  ok(json.length<20*1024*1024,'file pack dưới 20MB');

  f.remove();
}
main().then(()=>{document.getElementById('out').textContent='RESULT '+(failed?'FAIL':'PASS')+'\n'+lines.join('\n');})
      .catch(e=>{document.getElementById('out').textContent='RESULT FAIL (harness)\n  '+e.message;});
</script>
```

- [ ] **Step 2: Chạy test để thấy nó fail**

Run:
```bash
"/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu --allow-file-access-from-files --virtual-time-budget=90000 --dump-dom "file://$PWD/test/style-pack.test.html" | sed -n '/RESULT/,/<\/pre>/p'
```
Expected: `RESULT FAIL (harness)` — `w.styleBuildPack is not a function`

- [ ] **Step 3: Viết hàm dựng pack + hàm xuất**

```js
/* styleBuildPack tách riêng khỏi styleFlowPack để test được: nhận hàm lấy ảnh từ ngoài vào. */
async function styleBuildPack(sets,getImg){
  const p=S.persona||{};
  const face=await getImg('face');
  const products=[],days=[],nvShots=[];
  let pi=0,dn=0;
  for(const s of sets){
    const looks=[{name:'Mặc đơn giản',gid:s.base&&s.base.gid}].concat((s.looks||[]).map(l=>({name:l.name,gid:l.gid})));
    const mine=[];
    for(const l of looks){
      if(!l.gid)continue;
      pi++;const u=await getImg('g:'+l.gid);
      const ent={id:'SP'+pi,ten:(s.styleName+' — '+(l.name||'look')),mo_ta:'Ảnh tham chiếu look',
        upload_huong_dan:'Upload ảnh này vào Flow → ingredients cho các shot dùng nó',
        xuat_hien_o:[],prompt_anh:'',co_anh:!!u,anh_base64:u?await scaleDataUrl(u,1024):''};
      products.push(ent);mine.push(ent);
    }
    (s.videos||[]).forEach(v=>{
      dn++;const day='N'+dn;
      const shots=(v.clips||[]).map((c,ci)=>{
        const sid=day+'-S'+(ci+1);nvShots.push(sid);
        const ent=mine.length?mine[ci%mine.length]:null;
        if(ent)ent.xuat_hien_o.push(sid);
        return {seq:ci+1,thoi_luong:'10s',nhan_vat:['NV1'],san_pham:ent?[ent.id]:[],no_product:!ent,
          canh:'',cam_xuc:'',goc_may:c.angle||'',
          overlay:{text:c.overlay||'',do_hoa:'',sfx:'',nhac:v.audio||''},
          ly_do_gan:s.styleName||'',prompt_en:c.prompt_en||'',voiceover:''};
      });
      days.push({ngay:day,series:(s.styleName||'')+' — '+(v.title||''),
        voice:{ngon_ngu:'Vietnamese',ma_ngon_ngu:'vi-VN',phong_cach:''},arc_cam_xuc:[],shots:shots});
    });
  }
  return {schema:'flow-pack/v1',
    meta:{kenh:p.name?('@'+String(p.name).toLowerCase().replace(/[^a-z0-9]+/g,'')):'',doi_tuong:'',
      nen_tang:'TikTok/Reels',ti_le:'9:16',thoi_luong_shot:'10s',muc_tieu:'hướng dẫn phối đồ · thời trang',
      scene_upload:false,upload_entities:['characters','products'],
      voice:{ngon_ngu:'Vietnamese',ma_ngon_ngu:'vi-VN',phong_cach:'',ghi_chu:'Video KHÔNG voiceover — nhạc + overlay chữ; giữ mặt từ ảnh tham chiếu'},
      y_tuong_goc:'Style Brain — mỗi video 6-8 quick-cut dạy phối đồ theo DNA thời trang nhân vật',
      anh_nhan_vat_nhung:!!face,anh_san_pham_nhung:products.some(x=>x.anh_base64)},
    characters:[{id:'NV1',ten:p.name||'NV chính',mo_ta:'Nhân vật chính — giữ khuôn mặt nhất quán từ ảnh tham chiếu.',
      upload_huong_dan:'Upload ảnh nhân vật vào Flow → ingredients (giữ nguyên mọi shot)',
      xuat_hien_o:nvShots,prompt_anh:'',co_anh:!!face,anh_base64:face?await scaleDataUrl(face,1024):''}],
    products:products,scenes:[],days:days};
}
async function styleFlowPack(){
  const all=S.styleSets||[];
  let sets=all.filter(s=>STYLE.exportIds.indexOf(s.id)>=0);
  if(!sets.length)sets=all.filter(s=>(s.base&&s.base.gid)||(s.looks||[]).some(l=>l.gid));
  if(!sets.length){toast('Chưa bộ nào có ảnh — render ảnh trước đã');return;}
  toast('Đang dựng file...');
  const pack=await styleBuildPack(sets,async k=>k==='face'?(await getRef()):(await mediaGet(k)));
  dl('style-pack-'+_today10()+'.json',JSON.stringify(pack,null,1),'application/json');
  toast('✓ Đã xuất '+pack.days.length+' video');
}
async function styleDlOriginals(){
  const all=S.styleSets||[];
  const sets=STYLE.exportIds.length?all.filter(s=>STYLE.exportIds.indexOf(s.id)>=0):all;
  const gids=[];sets.forEach(s=>{if(s.base&&s.base.gid)gids.push(s.base.gid);(s.looks||[]).forEach(l=>{if(l.gid)gids.push(l.gid);});});
  if(!gids.length){toast('Chưa có ảnh nào');return;}
  /* Nạp trong hẹn giờ, không ôm sẵn cả loạt ảnh gốc trong RAM. */
  gids.forEach((g,i)=>setTimeout(async()=>{const u=await mediaGet('g:'+g);if(u)dlDataUrl('style-'+g+'.png',u);},160*(i+1)));
  toast('Đang tải '+gids.length+' ảnh gốc...');
}
```

- [ ] **Step 4: Chạy lại test**

Run:
```bash
"/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu --allow-file-access-from-files --virtual-time-budget=90000 --dump-dom "file://$PWD/test/style-pack.test.html" | sed -n '/RESULT/,/<\/pre>/p'
```
Expected: `RESULT PASS` với đủ 12 dòng PASS

- [ ] **Step 5: Commit**

```bash
git add index.html test/style-pack.test.html
git commit -m "feat(style): xuất flow-pack/v1 nhúng ảnh tham chiếu 1024px + tải ảnh gốc"
```

---

## Task 9: Smoke test, tài liệu, deploy

**Files:**
- Modify: `test/boot.test.html`, `README.md`

- [ ] **Step 1: Thêm assert hàm mới vào smoke test**

Trong `test/boot.test.html`, sửa mảng tên hàm thành:

```js
  for(const fn of ['mediaThumb','vidTalentChipsHTML','paintVidPicked','paintVidOutfitSel','vidOutfit','vidTalent','renderVideo','scaleDataUrl','renderStyleBrain','styleGenPlan','styleRenderSet','styleFlowPack','styleValidatePlan','styleBuildPack','genFashionDna']){
    ok(typeof w[fn]==='function','có hàm '+fn+'()');
  }
```

Và thêm assert state mới ngay sau dòng kiểm tra `S.content`:

```js
  ok(w.eval('Array.isArray(S.styleSets)'),'S.styleSets là mảng');
  ok(w.eval('typeof S.fashionDna')==='object','S.fashionDna là object');
```

- [ ] **Step 2: Chạy smoke test**

Run:
```bash
"/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu --allow-file-access-from-files --virtual-time-budget=90000 --dump-dom "file://$PWD/test/boot.test.html" | sed -n '/RESULT/,/<\/pre>/p'
```
Expected: `RESULT PASS`

- [ ] **Step 3: Cập nhật README**

Trong mục **Cách dùng**, sửa dòng 6 (bước ⑤ Studio ảnh) thêm tab mới vào cuối câu:

```
· **👠 Phối đồ** (1 món đồ/mô tả/dịp mặc → 5 ảnh + 3 prompt video 10s + bài đăng 3 tầng giá trị, tối đa 5 bộ/lần, xuất flow-pack cho Google Flow).
```

Trong mục **Kiểm thử**, thêm 2 lệnh:

```bash
node test/style-plan.test.js   # validate kế hoạch AI (số look/clip, overlay, góc máy)
"$CHROME" --headless=new --disable-gpu --allow-file-access-from-files --virtual-time-budget=90000 \
  --dump-dom "file://$PWD/test/style-pack.test.html"  # flow-pack đúng schema, ảnh nhúng đã thu nhỏ
```

- [ ] **Step 4: Chạy lại toàn bộ test**

Run:
```bash
node test/syntax.test.js && node test/char-fields.test.js && node test/style-plan.test.js
```
Expected: cả 3 PASS

- [ ] **Step 5: Commit và push**

```bash
git add test/boot.test.html README.md
git commit -m "test(style): smoke test hàm mới + README tab Phối đồ"
git fetch origin && git log --oneline HEAD..origin/main
```

Nếu `git log` in ra commit nào thì **dừng lại**, báo người dùng rằng session khác đã push (repo này có nhiều session làm song song) và hỏi cách xử lý trước khi push. Nếu không có gì:

```bash
git push origin main
```

- [ ] **Step 6: Xác nhận deploy thật**

```bash
until curl -s "https://haideman2025.github.io/muse-brand-os/index.html" | grep -q "renderStyleBrain"; do sleep 10; done; echo "DEPLOYED"
```
Expected: `DEPLOYED`

---

## Self-Review

**Spec coverage:**

| Yêu cầu trong spec | Task |
|---|---|
| 5 ảnh (1 gốc + 4 phối) | 5 (kế hoạch), 7 (render) |
| 3 prompt video 10s, 6-8 quick-cut, text overlay, góc máy khác nhau | 2 (validate), 5 (prompt), 6 (hiển thị) |
| Bài đăng 3 tầng giá trị | 2, 5, 6 |
| Tối đa 5 bộ cùng lúc | 4 (`styleAddInput` chặn >5), 2 (validate chặn >5) |
| 3 kiểu đầu vào | 4 (`STYLE_KINDS`), 5 (`styleSourceLine`) |
| DNA thời trang lưu theo nhân vật, sửa tay | 1, 3 |
| 2 giai đoạn | 5 (kế hoạch), 7 (render) |
| Xuất flow-pack nhúng ảnh 1024px | 8 |
| Tick chọn bộ để xuất | 6 (`styleToggleExport`), 8 |
| Tỉ lệ ảnh chọn được | 4 (`STYLE.ratio`), 7 (`styleImgPrompt`) |
| Luật bộ nhớ (lazyThumb, tuần tự, thu nhỏ trước khi nhúng) | 6, 7, 8 |
| Ảnh lỗi không làm hỏng cả bộ | 7 |
| Cap 20 bộ | 5 (`styleDropImages`) |
| Test | 1, 2, 8, 9 |

**Type consistency:** `styleSets[].base.gid` / `looks[].gid` dùng nhất quán ở Task 5-8; `styleBuildPack(sets,getImg)` nhận đúng 2 tham số ở cả test lẫn `styleFlowPack`; `STYLE.exportIds` dùng ở Task 6 và 8 cùng kiểu mảng id.

**Placeholder scan:** không có TBD/TODO; mọi step có code hoặc lệnh cụ thể.
