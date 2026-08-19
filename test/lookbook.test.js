/**
 * Test cho lookShotListPrompt — AI đạo diễn hình ảnh dựng shot list cho bộ look book.
 *
 * Bệnh của Photoshoot cũ: người dùng điền MỘT pose, MỘT bối cảnh rồi chụp N tấm → N tấm
 * na ná nhau, chỉ khác góc máy. Look book phải là bộ ảnh của một nhiếp ảnh gia thật:
 * mỗi khung một cỡ cảnh, một pose, một hướng sáng, một tâm trạng khác nhau.
 *
 * Chạy: node test/lookbook.test.js
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const div = SRC.match(/\/\* == CREATIVE DIVERSITY[\s\S]*?== END CREATIVE DIVERSITY == \*\//);
const look = SRC.match(/\/\* == LOOKBOOK DIRECTOR[\s\S]*?== END LOOKBOOK DIRECTOR == \*\//);
assert.ok(div, 'Không trích được khối CREATIVE DIVERSITY');
assert.ok(look, 'Không trích được khối LOOKBOOK DIRECTOR');
const ang = SRC.match(/const ANGLES=\[[^\]]*\];/);
assert.ok(ang, 'Không trích được ANGLES');

const env = `
  const S={persona:{name:'An Hạ',gender:'Nữ',age:26,vibe:'thanh lịch sắc lạnh'},
           fashionDna:{archetype:'tối giản hiện đại',palette:'trắng kem',avoid:'đồ thể thao'}};
  ${ang[0]}
  ${div[0]}
  ${look[0]}
  return {SHOT_AXES, shotAxisBlock, lookShotListPrompt};
`;
const app = new Function(env)();

let failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); }
  catch (e) { failed++; console.log(`  ✗ ${name}\n      ${e.message}`); }
}

console.log('\nlookShotListPrompt — đạo diễn hình ảnh cho bộ look book\n');

const outfits = ['Đầm trắng trễ vai', 'Blazer nâu xếp lớp'];
const p8 = app.lookShotListPrompt(8, outfits);

test('nêu đúng số khung cần dựng', () => {
  assert.ok(p8.indexOf('8 khung') >= 0, 'không nêu số khung');
  assert.ok(app.lookShotListPrompt(4, outfits).indexOf('4 khung') >= 0, 'không đổi theo n');
});

test('liệt kê đúng các trang phục đã chọn làm tham chiếu', () => {
  outfits.forEach(o => assert.ok(p8.indexOf(o) >= 0, 'thiếu outfit "' + o + '"'));
});

test('mỗi khung phải có đủ 6 thành phần đạo diễn', () => {
  ['goc_may', 'co_canh', 'pose', 'anh_sang', 'boi_canh', 'tam_trang']
    .forEach(k => assert.ok(p8.indexOf('"' + k + '"') >= 0, 'thiếu field ' + k));
});

test('có prompt_en để đi thẳng vào máy sinh ảnh', () => {
  assert.ok(p8.indexOf('"prompt_en"') >= 0, 'thiếu prompt_en');
});

test('ÉP mỗi khung khác nhau — đây là điểm chết của bản cũ', () => {
  assert.ok(/KHÔNG.*(lặp|trùng)|không được lặp/i.test(p8), 'không cấm lặp khung');
  assert.ok(/TRỤC BẮT BUỘC|trục/i.test(p8), 'không gắn trục đa dạng');
});

test('góc máy phải lấy từ danh sách cho phép', () => {
  assert.ok(/DANH SÁCH GÓC MÁY/i.test(p8), 'thiếu danh sách góc máy');
});

test('nhồi DNA thời trang và TỪ CẤM', () => {
  assert.ok(p8.indexOf('tối giản hiện đại') >= 0, 'mất archetype');
  assert.ok(p8.indexOf('đồ thể thao') >= 0, 'mất TỪ CẤM');
});

test('đặt vai nhiếp ảnh gia, không phải máy tả ảnh', () => {
  assert.ok(/nhiếp ảnh|photographer|đạo diễn hình ảnh/i.test(p8), 'thiếu vai nhiếp ảnh gia');
});

test('giữ luật an toàn nền tảng', () => {
  assert.ok(/khoả thân|khỏa thân|nudity|an toàn/i.test(p8), 'thiếu ràng buộc an toàn');
});

test('không có outfit nào vẫn dựng được prompt', () => {
  const p = app.lookShotListPrompt(6, []);
  assert.ok(p.length > 200 && p.indexOf('undefined') < 0, 'lòi undefined hoặc rỗng');
});

test('gọi không tham số vẫn chạy', () => {
  const p = app.lookShotListPrompt();
  assert.ok(p.length > 200 && p.indexOf('undefined') < 0);
});

console.log('\nshotAxisBlock — trục ép mỗi khung một kiểu\n');

test('ra đúng số khung', () => {
  const lines = app.shotAxisBlock(8).trim().split('\n').filter(l => /^Khung \d+:/.test(l.trim()));
  assert.strictEqual(lines.length, 8);
});

test('mỗi trục dùng giá trị khác nhau giữa các khung', () => {
  const lines = app.shotAxisBlock(6).trim().split('\n').filter(l => /^Khung \d+:/.test(l.trim()));
  Object.keys(app.SHOT_AXES).forEach(k => {
    const pool = app.SHOT_AXES[k];
    const used = lines.map(l => pool.find(v => l.indexOf(v) >= 0)).filter(Boolean);
    assert.ok(new Set(used).size >= Math.min(lines.length, pool.length), 'trục "' + k + '" bị lặp');
  });
});

test('bộ trục phủ đủ mặt của một buổi chụp thật', () => {
  const keys = Object.keys(app.SHOT_AXES);
  ['cỡ cảnh', 'pose', 'ánh sáng'].forEach(need => {
    assert.ok(keys.some(k => k.indexOf(need) >= 0), 'thiếu trục "' + need + '"');
  });
  keys.forEach(k => assert.ok(app.SHOT_AXES[k].length >= 6, 'trục "' + k + '" quá nghèo'));
});

test('xin 0 khung thì rỗng', () => {
  assert.strictEqual(app.shotAxisBlock(0), '');
});

console.log(failed ? `\n${failed} test FAIL\n` : '\nTất cả test PASS\n');
process.exit(failed ? 1 : 0);
