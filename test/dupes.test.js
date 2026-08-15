/**
 * Chặn hai hàm trùng tên trong index.html.
 *
 * App là MỘT file ~300k ký tự, mọi hàm nằm chung một scope. Hai hàm cùng tên thì bản khai báo
 * sau ĐÈ bản trước, im lặng, không lỗi cú pháp, không cảnh báo. Lỗi thật đã xảy ra:
 * clonePrompt() bị định nghĩa 2 lần (dòng 989 phân tích ảnh, dòng 1485 sinh ảnh) → onSelfie()
 * gửi nhầm prompt-sinh-ảnh vào API-đọc-ảnh, Digital Twin phân tích ra rác.
 *
 * Chạy: node test/dupes.test.js
 */
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

const re = /^\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/gm;
const seen = {};
let m;
while ((m = re.exec(SRC))) {
  const line = SRC.slice(0, m.index).split('\n').length;
  (seen[m[1]] = seen[m[1]] || []).push(line);
}

const names = Object.keys(seen);
const dups = names.filter(k => seen[k].length > 1);

console.log(`\nHàm trùng tên trong index.html (${names.length} hàm)\n`);
if (dups.length) {
  dups.forEach(k => console.log(`  ✗ ${k}() khai báo ${seen[k].length} lần — dòng ${seen[k].join(', ')} (bản cuối đè các bản trước)`));
  console.log(`\n${dups.length} tên bị trùng\n`);
  process.exit(1);
}
console.log('  ✓ không có hàm nào trùng tên\n');
process.exit(0);
