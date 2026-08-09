/**
 * Test cho omniMasterPrompt — dựng 1 prompt hoàn chỉnh cho mô hình video omni.
 *
 * Công thức (học từ tài liệu tham khảo):
 *   quy cách chung + khoá chủ thể + đơn vị cảnh × N + liên tục xuyên cảnh + ràng buộc phủ định
 * Mấu chốt là END STATE của từng cut: bàn giao vị trí, hướng mặt, vật trong tay, đà chuyển động
 * cho cut kế tiếp — thứ làm 6-8 quick-cut mượt thay vì giật cục.
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
const video = { title: 'V1', hook: 'h', audio: 'lo-fi beat', clips: [0, 1, 2, 3, 4, 5].map(i => clip(i)) };
const opts = {
  seconds: 10, ratio: '9:16',
  globalStyle: 'editorial fashion film, natural window daylight',
  subject: 'Use the woman from the reference image as the main subject. Maintain her EXACT facial identity.',
  immutables: 'black lace maxi dress, silver choker',
  dnaLock: ' FASHION DNA LOCK — ARCHETYPE: gothic romantic. NEVER include: pastel.'
};

console.log('\nomniMasterPrompt — prompt hoàn chỉnh 5 khối cho omni\n');

const out = app.omniMasterPrompt(video, opts);

test('khối 1 — quy cách chung: thời lượng, tỉ lệ, số cut', () => {
  assert.ok(/10-second/.test(out), 'thiếu thời lượng');
  assert.ok(/9:16/.test(out), 'thiếu tỉ lệ');
  assert.ok(/6 quick cuts/.test(out), 'thiếu số cut');
});

test('khối 1 — phong cách toàn cục', () => {
  assert.ok(/GLOBAL STYLE: editorial fashion film/.test(out));
});

test('khối 2 — khoá chủ thể + hạng mục bất biến', () => {
  assert.ok(/SUBJECT LOCK:/.test(out), 'thiếu SUBJECT LOCK');
  assert.ok(/EXACT facial identity/.test(out), 'thiếu khoá nhận dạng');
  assert.ok(/IMMUTABLE ITEMS: black lace maxi dress/.test(out), 'thiếu hạng mục bất biến');
});

test('khối 2 — DNA thời trang được nhồi vào', () => {
  assert.ok(/FASHION DNA LOCK/.test(out) && /NEVER include: pastel/.test(out));
});

test('khối 3 — đủ 6 đơn vị cảnh, mốc thời gian tăng dần', () => {
  const stamps = out.match(/\[00:\d\d\.\d-00:\d\d\.\d\]/g) || [];
  assert.strictEqual(stamps.length, 6, 'được ' + stamps.length + ' mốc thời gian');
  assert.ok(/\[00:00\.0-/.test(stamps[0]), 'mốc đầu phải từ 00:00.0, được ' + stamps[0]);
  assert.ok(/-00:10\.0\]/.test(stamps[5]), 'mốc cuối phải kết thúc 00:10.0, được ' + stamps[5]);
});

test('khối 3 — mỗi cảnh có góc máy, chuyển động máy, âm thanh', () => {
  assert.ok(/CAMERA: slow push in/.test(out));
  assert.ok(/SOUND: fabric rustle/.test(out));
  assert.ok(/medium shot/.test(out));
});

test('khối 3 — END STATE có mặt (mấu chốt nối cut)', () => {
  const n = (out.match(/END STATE:/g) || []).length;
  assert.ok(n >= 5, 'chỉ có ' + n + ' END STATE, phải ít nhất 5 (cut cuối không cần)');
});

test('khối 3 — text overlay ghi thành lời thoại màn hình, bọc nháy kép', () => {
  assert.ok(/ON-SCREEN TEXT: "Siết eo tạo tỉ lệ"/.test(out));
});

test('khối 4 — liên tục xuyên cảnh, nêu rõ nối từ END STATE trước', () => {
  assert.ok(/CONTINUITY:/.test(out), 'thiếu CONTINUITY');
  assert.ok(/previous cut's END STATE/.test(out), 'thiếu luật nối từ END STATE');
});

test('khối 5 — ràng buộc phủ định', () => {
  assert.ok(/NEGATIVE:/.test(out), 'thiếu NEGATIVE');
  ['no extra people', 'no identity swap', 'no wardrobe change', 'no unmotivated jump cuts', 'no action reset']
    .forEach(k => assert.ok(out.indexOf(k) >= 0, 'thiếu ràng buộc "' + k + '"'));
});

test('người dùng chọn cho model vẽ chữ → KHÔNG cấm chữ trong khối phủ định', () => {
  const neg = out.slice(out.indexOf('NEGATIVE:'));
  assert.ok(!/no text|no subtitle|no on-screen text/i.test(neg), 'khối phủ định không được cấm chữ');
});

test('bộ dữ liệu CŨ thiếu camera/sound/end_state vẫn dựng được, không lòi undefined', () => {
  const old = { clips: [0, 1, 2, 3, 4, 5].map(i => ({ seq: i + 1, angle: 'medium shot', overlay: 'x', prompt_en: 'p' + i })) };
  const o = app.omniMasterPrompt(old, opts);
  assert.ok(o.length > 100, 'phải ra prompt');
  assert.ok(o.indexOf('undefined') < 0, 'lòi undefined ra prompt');
  assert.ok(o.indexOf('CAMERA:') < 0, 'không được bịa CAMERA khi dữ liệu trống');
});

test('không có clip nào thì vẫn trả về chuỗi, không ném lỗi', () => {
  const o = app.omniMasterPrompt({ clips: [] }, opts);
  assert.ok(typeof o === 'string' && o.length > 0);
});

test('gọi không truyền opts vẫn chạy', () => {
  const o = app.omniMasterPrompt(video);
  assert.ok(/TIMELINE/.test(o));
});

console.log(failed ? `\n${failed} test FAIL\n` : '\nTất cả test PASS\n');
process.exit(failed ? 1 : 0);
