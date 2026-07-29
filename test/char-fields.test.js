/**
 * Test hồi quy cho lỗi "S.content.unshift is not a function".
 *
 * Trích NGUYÊN VĂN các định nghĩa CHAR_FIELDS / blankChar / activeChar từ index.html
 * rồi chạy thật, để test bám vào code sản phẩm chứ không phải bản chép tay.
 *
 * Chạy: node test/char-fields.test.js
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function extract(re, label) {
  const m = SRC.match(re);
  assert.ok(m, `Không trích được ${label} từ index.html — có phải code đã đổi cấu trúc?`);
  return m[0];
}

// Lưu ý: file lưu CRLF, mà `.` trong regex JS không khớp \r → phải dùng [^\n]*
const srcCharFields = extract(/const CHAR_FIELDS=\[[^\]]*\];/, 'CHAR_FIELDS');
const srcArrayFields = SRC.match(/const CHAR_ARRAY_FIELDS=\[[^\]]*\];/);
const srcBlankChar = extract(/function blankChar\(name\)\{[^\n]*\n/, 'blankChar()');
const srcActiveChar = extract(/function activeChar\(\)\{[^\n]*\n/, 'activeChar()');

// Dựng lại môi trường tối thiểu mà 3 hàm trên cần.
const sandbox = `
  function _today10(){return '2026-07-29';}
  ${srcCharFields}
  ${srcArrayFields ? srcArrayFields[0] : ''}
  ${srcBlankChar}
  let S = {v:2, activeId:'ch_test', characters:{}};
  ${srcActiveChar}
  return {CHAR_FIELDS, blankChar, activeChar, S};
`;
const app = new Function(sandbox)();

let failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); }
  catch (e) { failed++; console.log(`  ✗ ${name}\n      ${e.message}`); }
}

console.log('\nCHAR_FIELDS ↔ blankChar/activeChar phải nhất quán về kiểu dữ liệu\n');

// Các field bắt buộc là MẢNG. Thêm field mảng mới thì thêm vào đây.
const ARRAY_FIELDS = ['gallery', 'wardrobe', 'vlogLog', 'content'];

test('blankChar() khởi tạo mọi field mảng thành []', () => {
  const c = app.blankChar('X');
  for (const k of ARRAY_FIELDS) {
    assert.ok(Array.isArray(c[k]), `blankChar().${k} là ${JSON.stringify(c[k])}, phải là []`);
  }
});

test('activeChar() vá field thiếu thành đúng kiểu mảng', () => {
  app.S.characters = { ch_test: app.blankChar('X') };
  for (const k of ARRAY_FIELDS) delete app.S.characters.ch_test[k]; // giả lập state cũ chưa có field
  const c = app.activeChar();
  for (const k of ARRAY_FIELDS) {
    assert.ok(Array.isArray(c[k]), `activeChar() vá .${k} thành ${JSON.stringify(c[k])}, phải là []`);
  }
});

test('activeChar() sửa được state ĐÃ LƯU sai kiểu ({} thay vì [])', () => {
  app.S.characters = { ch_test: app.blankChar('X') };
  for (const k of ARRAY_FIELDS) app.S.characters.ch_test[k] = {}; // state hỏng trong localStorage của user
  const c = app.activeChar();
  for (const k of ARRAY_FIELDS) {
    assert.ok(Array.isArray(c[k]), `activeChar() để nguyên .${k} = ${JSON.stringify(c[k])}, phải coerce về []`);
  }
});

test('.unshift() chạy được trên content của nhân vật mới (lỗi user gặp)', () => {
  app.S.characters = { ch_test: app.blankChar('X') };
  const c = app.activeChar();
  c.content = c.content || [];
  c.content.unshift({ id: 'set1' }); // ← đây là dòng nổ TypeError khi content là {}
  assert.strictEqual(c.content.length, 1);
});

test('mọi field mảng nằm trong CHAR_FIELDS', () => {
  for (const k of ARRAY_FIELDS) {
    assert.ok(app.CHAR_FIELDS.includes(k), `CHAR_FIELDS thiếu '${k}' → không được lưu/đồng bộ`);
  }
});

console.log(failed ? `\n${failed} test FAIL\n` : '\nTất cả test PASS\n');
process.exit(failed ? 1 : 0);
