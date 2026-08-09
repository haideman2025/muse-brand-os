/**
 * Kiểm tra mọi khối <script> trong index.html vẫn parse được.
 * App là 1 file HTML không có build step nên lỗi cú pháp = trang trắng, không có ai báo trước.
 *
 * Chạy: node test/syntax.test.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const blocks = [...SRC.matchAll(/<script>([\s\S]*?)<\/script>/g)];

if (!blocks.length) { console.log('  ✗ Không tìm thấy khối <script> nào'); process.exit(1); }

let bad = 0;
blocks.forEach((b, i) => {
  try { new vm.Script(b[1]); console.log(`  ✓ script#${i + 1} (${b[1].length} ký tự) cú pháp OK`); }
  catch (e) { bad++; console.log(`  ✗ script#${i + 1} LỖI CÚ PHÁP: ${e.message}`); }
});
process.exit(bad ? 1 : 0);
