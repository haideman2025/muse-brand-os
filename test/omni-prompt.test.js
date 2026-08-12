/**
 * Test cho omniMasterPrompt — brief sáng tạo cho mô hình video omni (Google Flow).
 *
 * HAI RÀNG BUỘC SỐNG CÒN:
 * 1. KHÔNG được nhắc ảnh tham chiếu / nhận dạng khuôn mặt. Flow chặn thẳng với lý do
 *    "vi phạm chính sách về việc tạo video về người nổi tiếng". Chủ thể phải để chung chung,
 *    đúng luật đã có sẵn trong aiPromptSafe() của app.
 * 2. KHÔNG kịch bản hoá từng cut. Chỉ nêu "6-8 quick cuts" + ý tưởng + luật nối cut,
 *    còn nhịp/khuôn hình/góc máy để model tự sáng tạo.
 *
 * Chạy: node test/omni-prompt.test.js
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const m = SRC.match(/\/\* == OMNI MASTER PROMPT[\s\S]*?== END OMNI MASTER PROMPT == \*\//);
assert.ok(m, 'Không trích được khối OMNI MASTER PROMPT từ index.html');

const app = new Function(`${m[0]}\nreturn {omniMasterPrompt};`)();

let failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); }
  catch (e) { failed++; console.log(`  ✗ ${name}\n      ${e.message}`); }
}

function clip(i, extra) {
  return Object.assign({
    seq: i + 1, angle: 'medium shot', action: 'she adjusts the collar',
    camera: 'slow push in', sound: 'fabric rustle', overlay: 'Siết eo tạo tỉ lệ',
    end_state: 'facing three-quarter left, hand on collar', prompt_en: 'cinematic shot ' + i
  }, extra || {});
}
const video = { title: 'Lên đồ 10 giây', hook: 'Cùng một chiếc đầm, bốn cách mặc', audio: 'lo-fi beat', clips: [0, 1, 2, 3, 4, 5].map(i => clip(i)) };
const opts = {
  seconds: 10, ratio: '9:16',
  globalStyle: 'editorial fashion film, natural window daylight',
  wardrobe: 'black lace maxi dress, silver choker',
  dnaLock: ' FASHION DNA LOCK — ARCHETYPE: gothic romantic. NEVER include: pastel.'
};

console.log('\nomniMasterPrompt — brief sáng tạo, an toàn policy\n');

const out = app.omniMasterPrompt(video, opts);

/* ---- Nhóm 1: chống bị Flow chặn ---- */
test('KHÔNG nhắc ảnh tham chiếu', () => {
  assert.ok(!/reference image|reference photo|from the reference/i.test(out), 'còn nhắc ảnh tham chiếu');
});

test('KHÔNG mô tả nhận dạng khuôn mặt', () => {
  ['facial identity', 'facial features', 'exact face', 'same face', 'body proportions', 'likeness']
    .forEach(k => assert.ok(out.toLowerCase().indexOf(k) < 0, 'còn chứa "' + k + '"'));
});

test('KHÔNG nhắc người thật / người nổi tiếng', () => {
  assert.ok(/no real, famous or specific person/i.test(out), 'thiếu câu chặn người thật/nổi tiếng');
});

test('chủ thể để chung chung', () => {
  assert.ok(/generic/i.test(out), 'thiếu từ khoá chủ thể chung chung');
  assert.ok(/do not describe her face|no face description/i.test(out), 'thiếu lệnh cấm tả mặt');
});

/* ---- Nhóm 2: để AI tự sáng tạo ---- */
test('nêu 6-8 quick cuts chứ không chốt cứng số cut', () => {
  assert.ok(/6-8 quick cuts/i.test(out), 'thiếu "6-8 quick cuts"');
});

test('KHÔNG kịch bản hoá từng cut — không có mốc thời gian từng cảnh', () => {
  const stamps = out.match(/\[00:\d\d\.\d-00:\d\d\.\d\]/g) || [];
  assert.strictEqual(stamps.length, 0, 'vẫn còn ' + stamps.length + ' mốc thời gian từng cut');
  assert.ok(!/CAMERA: slow push in/.test(out), 'vẫn còn chỉ định chuyển động máy từng cut');
});

test('giao quyền nhịp/khuôn hình/góc máy cho model', () => {
  assert.ok(/you decide/i.test(out), 'thiếu lệnh giao quyền sáng tạo');
});

test('vẫn giữ Ý TƯỞNG của video (hook + beat nội dung)', () => {
  assert.ok(out.indexOf('Cùng một chiếc đầm, bốn cách mặc') >= 0, 'mất hook');
  assert.ok(out.indexOf('she adjusts the collar') >= 0, 'mất beat nội dung');
});

/* ---- Nhóm 3: giữ thứ giá trị từ công thức tham khảo ---- */
test('giữ LUẬT nối cut (đà chuyển động liên tục)', () => {
  assert.ok(/continue EXACTLY from where the previous cut ended/i.test(out), 'thiếu luật nối cut');
  assert.ok(/same position, same facing/i.test(out), 'thiếu chi tiết bàn giao');
});

test('giữ khoá trang phục và DNA thời trang (không phải nhận dạng người)', () => {
  assert.ok(out.indexOf('black lace maxi dress') >= 0, 'mất khoá trang phục');
  assert.ok(/NEVER include: pastel/.test(out), 'mất DNA thời trang');
});

test('giữ text overlay đúng nguyên văn', () => {
  assert.ok(out.indexOf('"Siết eo tạo tỉ lệ"') >= 0, 'mất text overlay');
});

test('giữ khối ràng buộc phủ định', () => {
  assert.ok(/NEGATIVE:/.test(out), 'thiếu NEGATIVE');
  ['no extra people', 'no wardrobe change', 'no unmotivated jump cuts', 'no action reset']
    .forEach(k => assert.ok(out.indexOf(k) >= 0, 'thiếu ràng buộc "' + k + '"'));
});

test('bật chữ (mặc định): khối phủ định KHÔNG cấm chữ', () => {
  const neg = out.slice(out.indexOf('NEGATIVE:'));
  assert.ok(!/no text|no subtitle|no on-screen text/i.test(neg), 'khối phủ định không được cấm chữ');
});

/* ---- Nhóm 3b: người dùng tắt chữ để tự edit ---- */
const noText = app.omniMasterPrompt(video, Object.assign({}, opts, { drawText: false }));

test('tắt chữ: KHÔNG còn khối ON-SCREEN TEXT', () => {
  assert.ok(noText.indexOf('ON-SCREEN TEXT') < 0, 'vẫn còn khối ON-SCREEN TEXT');
  assert.ok(noText.indexOf('"Siết eo tạo tỉ lệ"') < 0, 'vẫn còn nội dung chữ trong prompt');
});

test('tắt chữ: khối phủ định CẤM hẳn chữ trong khung hình', () => {
  const neg = noText.slice(noText.indexOf('NEGATIVE:'));
  assert.ok(/no on-screen text/i.test(neg), 'thiếu lệnh cấm chữ');
  assert.ok(/no subtitles/i.test(neg), 'thiếu lệnh cấm phụ đề');
});

test('tắt chữ: mọi thứ còn lại giữ nguyên', () => {
  assert.ok(/6-8 quick cuts/.test(noText), 'mất số cut');
  assert.ok(/continue EXACTLY from where the previous cut ended/.test(noText), 'mất luật nối cut');
  assert.ok(noText.indexOf('black lace maxi dress') >= 0, 'mất khoá trang phục');
  assert.ok(noText.indexOf('she adjusts the collar') >= 0, 'mất beat nội dung');
  assert.ok(!/reference image|facial identity/i.test(noText), 'lọt câu bị Flow chặn');
});

/* ---- Nhóm 4: bền với dữ liệu thiếu ---- */
test('bộ dữ liệu CŨ thiếu camera/sound/end_state vẫn dựng được', () => {
  const old = { clips: [0, 1, 2].map(i => ({ seq: i + 1, overlay: 'x' + i, prompt_en: 'p' + i })) };
  const o = app.omniMasterPrompt(old, opts);
  assert.ok(o.length > 100, 'phải ra prompt');
  assert.ok(o.indexOf('undefined') < 0, 'lòi undefined ra prompt');
});

test('không có clip nào thì vẫn trả về chuỗi, không ném lỗi', () => {
  const o = app.omniMasterPrompt({ clips: [] }, opts);
  assert.ok(typeof o === 'string' && o.length > 0);
  assert.ok(o.indexOf('undefined') < 0);
});

test('gọi không truyền opts vẫn chạy', () => {
  const o = app.omniMasterPrompt(video);
  assert.ok(/6-8 quick cuts/i.test(o));
  assert.ok(o.indexOf('undefined') < 0);
});

console.log(failed ? `\n${failed} test FAIL\n` : '\nTất cả test PASS\n');
process.exit(failed ? 1 : 0);
