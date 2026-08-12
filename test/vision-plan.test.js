/**
 * Test cho styleVisionPrompt — prompt bảo Gemini NHÌN bộ ảnh thật rồi viết kế hoạch.
 *
 * Rủi ro lớn nhất của luồng này là AI bịa: mô tả món đồ không có trong ảnh, hoặc trả sai
 * số look so với số ảnh đã up. Prompt phải chặn cả hai.
 *
 * Chạy: node test/vision-plan.test.js
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const m = SRC.match(/\/\* == STYLE VISION PROMPT[\s\S]*?== END STYLE VISION PROMPT == \*\//);
assert.ok(m, 'Không trích được khối STYLE VISION PROMPT từ index.html');

const ang = SRC.match(/const ANGLES=\[[^\]]*\];/);
assert.ok(ang, 'Không trích được ANGLES');

// Prompt đọc S.persona / S.fashionDna / CC.lang / ANGLES → dựng bản giả tối thiểu.
const env = `
  const S={persona:{name:'An Hạ',gender:'Nữ',age:26,ethnicityLook:'phụ nữ Á Đông',vibe:'thanh lịch'},
           fashionDna:{archetype:'thanh lịch tối giản',palette:'trắng kem',avoid:'đồ thể thao'}};
  const CC={lang:'vi'};
  ${ang[0]}
  ${m[0]}
  return {styleVisionPrompt, ANGLES};
`;
const app = new Function(env)();

let failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); }
  catch (e) { failed++; console.log(`  ✗ ${name}\n      ${e.message}`); }
}

console.log('\nstyleVisionPrompt — bắt AI nhìn ảnh thật, không bịa\n');

const p5 = app.styleVisionPrompt(5, 0);

test('nêu đúng tổng số ảnh gửi kèm', () => {
  assert.ok(/5 ẢNH THẬT|5 ảnh thật/i.test(p5), 'không nêu số ảnh');
});

test('chỉ rõ ảnh nào là ảnh gốc', () => {
  assert.ok(/Ảnh số 1 là ẢNH GỐC/i.test(p5), 'không chỉ rõ ảnh gốc');
});

test('chốt số look phải bằng số ảnh trừ ảnh gốc', () => {
  assert.ok(/đúng 4 look/i.test(p5), 'không ép đúng 4 look cho 5 ảnh');
});

test('ảnh gốc ở giữa bộ thì đánh số đúng', () => {
  const p = app.styleVisionPrompt(6, 2);
  assert.ok(/Ảnh số 3 là ẢNH GỐC/i.test(p), 'sai số thứ tự ảnh gốc');
  assert.ok(/đúng 5 look/i.test(p), 'sai số look cho 6 ảnh');
});

test('bộ nhỏ nhất 2 ảnh → 1 look', () => {
  const p = app.styleVisionPrompt(2, 0);
  assert.ok(/đúng 1 look/i.test(p), 'sai số look cho 2 ảnh');
});

test('CẤM bịa món đồ không có trong ảnh', () => {
  assert.ok(/không.*(bịa|tự nghĩ|không có trong ảnh)/i.test(p5), 'thiếu lệnh cấm bịa');
});

test('bắt bám đúng THỨ TỰ ảnh', () => {
  assert.ok(/thứ tự/i.test(p5), 'thiếu ràng buộc thứ tự look ↔ ảnh');
});

test('vẫn nhồi DNA thời trang và TỪ CẤM', () => {
  assert.ok(p5.indexOf('thanh lịch tối giản') >= 0, 'mất archetype');
  assert.ok(p5.indexOf('đồ thể thao') >= 0, 'mất TỪ CẤM');
});

test('vẫn yêu cầu 3 video và bài 3 tầng', () => {
  assert.ok(/3 video/i.test(p5), 'thiếu yêu cầu 3 video');
  ['knowledge', 'emotion', 'insight'].forEach(k => assert.ok(p5.indexOf(k) >= 0, 'thiếu tầng ' + k));
});

test('giữ luật policy: không tả mặt, không nhắc người nổi tiếng', () => {
  assert.ok(/không.*tả khuôn mặt|KHÔNG được tả khuôn mặt/i.test(p5), 'thiếu lệnh cấm tả mặt');
});

test('nêu 6-8 quick cut cho mỗi video', () => {
  assert.ok(/6-8/.test(p5), 'thiếu 6-8 quick cut');
});

console.log(failed ? `\n${failed} test FAIL\n` : '\nTất cả test PASS\n');
process.exit(failed ? 1 : 0);
