/**
 * Test cho bộ chống trùng lặp ý tưởng.
 *
 * Bệnh cũ: outfitIdeasPrompt/sceneConceptPrompt không hề biết tủ đồ đang có gì, lại còn tự mồi
 * sẵn 4 nhãn phong cách ("đời thường sang, dạo phố, dạ tiệc, editorial") → mỗi lần bấm là AI
 * xuất phát từ số 0 với cùng một prompt, cho ra cùng một phân phối kết quả.
 *
 * Chữa bằng 2 thứ, test khoá cả 2:
 *   avoidBlock()   — liệt kê thứ ĐÃ CÓ và cấm lặp
 *   divAxisBlock() — ép mỗi ý tưởng rơi vào một tổ hợp trục KHÁC NHAU
 *
 * Chạy: node test/diversity.test.js
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const m = SRC.match(/\/\* == CREATIVE DIVERSITY[\s\S]*?== END CREATIVE DIVERSITY == \*\//);
assert.ok(m, 'Không trích được khối CREATIVE DIVERSITY từ index.html');

const app = new Function(`${m[0]}\nreturn {DIV_AXES, LIFE_AXES, divAxisBlock, lifeAxisBlock, avoidBlock};`)();

let failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); }
  catch (e) { failed++; console.log(`  ✗ ${name}\n      ${e.message}`); }
}

console.log('\nChống trùng lặp ý tưởng\n');

/* ---- avoidBlock ---- */
test('avoidBlock rỗng khi chưa có gì', () => {
  assert.strictEqual(app.avoidBlock('ĐÃ CÓ', []), '');
  assert.strictEqual(app.avoidBlock('ĐÃ CÓ', null), '');
});

test('avoidBlock liệt kê và cấm lặp', () => {
  const b = app.avoidBlock('ĐÃ CÓ TRONG TỦ ĐỒ', ['Đầm đen ren', 'Blazer kem']);
  assert.ok(b.indexOf('ĐÃ CÓ TRONG TỦ ĐỒ') >= 0, 'thiếu tiêu đề');
  assert.ok(b.indexOf('Đầm đen ren') >= 0 && b.indexOf('Blazer kem') >= 0, 'thiếu mục');
  assert.ok(/không.*lặp|TRÁNH|không được trùng/i.test(b), 'thiếu lệnh cấm lặp');
});

test('avoidBlock chặn danh sách quá dài (khỏi phình prompt)', () => {
  const many = Array.from({ length: 500 }, (_, i) => 'Bộ số ' + i);
  const b = app.avoidBlock('ĐÃ CÓ', many, 40);
  assert.ok((b.match(/•/g) || []).length <= 40, 'không cắt bớt danh sách');
});

test('avoidBlock bỏ mục rỗng', () => {
  const b = app.avoidBlock('ĐÃ CÓ', ['', null, 'Áo dài', undefined]);
  assert.strictEqual((b.match(/•/g) || []).length, 1);
});

/* ---- divAxisBlock ---- */
const block10 = app.divAxisBlock(10);

test('divAxisBlock ra đúng số dòng theo số ý tưởng', () => {
  assert.strictEqual(block10.trim().split('\n').filter(l => /^Bộ \d+:/.test(l.trim())).length, 10);
});

test('mỗi trục có giá trị KHÁC NHAU giữa các bộ (chống trùng thật sự)', () => {
  const lines = block10.trim().split('\n').filter(l => /^Bộ \d+:/.test(l.trim()));
  Object.keys(app.DIV_AXES).forEach(k => {
    const pool = app.DIV_AXES[k];
    const used = lines.map(l => pool.find(v => l.indexOf(v) >= 0)).filter(Boolean);
    const uniq = new Set(used);
    // Trục nào có đủ giá trị thì 10 bộ phải dùng 10 giá trị khác nhau.
    const expect = Math.min(lines.length, pool.length);
    assert.ok(uniq.size >= expect, `trục "${k}": chỉ ${uniq.size} giá trị khác nhau, cần ${expect}`);
  });
});

test('hai lần gọi ra tổ hợp khác nhau (không cố định)', () => {
  const a = app.divAxisBlock(6), b = app.divAxisBlock(6);
  assert.notStrictEqual(a, b, 'hai lần gọi ra y hệt nhau — vẫn sẽ trùng ý tưởng');
});

test('nhận hàm ngẫu nhiên từ ngoài để test tất định', () => {
  const fixed = () => 0; // luôn lấy phần tử đầu của pool còn lại
  const a = app.divAxisBlock(3, fixed), b = app.divAxisBlock(3, fixed);
  assert.strictEqual(a, b, 'cùng nguồn ngẫu nhiên phải ra cùng kết quả');
});

test('mọi trục đều xuất hiện trong dòng mô tả', () => {
  const first = block10.trim().split('\n').filter(l => /^Bộ \d+:/.test(l.trim()))[0];
  Object.keys(app.DIV_AXES).forEach(k => {
    const hit = app.DIV_AXES[k].some(v => first.indexOf(v) >= 0);
    assert.ok(hit, 'dòng đầu thiếu trục "' + k + '"');
  });
});

test('xin nhiều hơn số giá trị của trục vẫn chạy, không lặp vô hạn', () => {
  const big = app.divAxisBlock(50);
  assert.strictEqual(big.trim().split('\n').filter(l => /^Bộ \d+:/.test(l.trim())).length, 50);
});

test('xin 0 bộ thì trả chuỗi rỗng', () => {
  assert.strictEqual(app.divAxisBlock(0).trim(), '');
});

test('bộ trục đủ giàu để không quẩn quanh', () => {
  const keys = Object.keys(app.DIV_AXES);
  assert.ok(keys.length >= 5, 'cần ít nhất 5 trục, có ' + keys.length);
  keys.forEach(k => assert.ok(app.DIV_AXES[k].length >= 6, 'trục "' + k + '" chỉ có ' + app.DIV_AXES[k].length + ' giá trị, cần ≥6'));
  const total = keys.reduce((n, k) => n * app.DIV_AXES[k].length, 1);
  assert.ok(total > 100000, 'không gian tổ hợp quá nhỏ: ' + total);
});

/* ---- lifeAxisBlock: chống lặp "một ngày của tôi" ở vlog ---- */
test('lifeAxisBlock ra đúng số vlog', () => {
  const b = app.lifeAxisBlock(5);
  assert.strictEqual(b.trim().split('\n').filter(l => /^Vlog \d+:/.test(l.trim())).length, 5);
});

test('mỗi vlog chạm một góc đời sống khác nhau', () => {
  const lines = app.lifeAxisBlock(6).trim().split('\n').filter(l => /^Vlog \d+:/.test(l.trim()));
  Object.keys(app.LIFE_AXES).forEach(k => {
    const pool = app.LIFE_AXES[k];
    const used = lines.map(l => pool.find(v => l.indexOf(v) >= 0)).filter(Boolean);
    assert.ok(new Set(used).size >= Math.min(lines.length, pool.length), `trục đời sống "${k}" bị lặp`);
  });
});

test('trục đời sống phủ được các mặt của một cuộc sống thật', () => {
  const keys = Object.keys(app.LIFE_AXES);
  assert.ok(keys.length >= 5, 'cần ít nhất 5 trục đời sống, có ' + keys.length);
  keys.forEach(k => assert.ok(app.LIFE_AXES[k].length >= 6, 'trục "' + k + '" quá nghèo'));
});

test('lifeAxisBlock xin 0 thì rỗng', () => {
  assert.strictEqual(app.lifeAxisBlock(0), '');
});

console.log(failed ? `\n${failed} test FAIL\n` : '\nTất cả test PASS\n');
process.exit(failed ? 1 : 0);
