/**
 * Test cho captionPrompt và directorIdeasPrompt.
 *
 * captionPrompt: mỗi tài nguyên (ảnh/video) kèm tiêu đề + bài đăng ngắn + hashtag + câu mô tả
 * nội dung cho thuật toán nền tảng đọc hiểu.
 *
 * directorIdeasPrompt: AI đóng vai đạo diễn, sinh ý tưởng phim làm đầu vào trước khi viết kịch bản.
 * Ràng buộc sống còn: TÁO BẠO nhưng phải nằm trong vùng Gemini/Flow còn chịu render — đẩy quá là
 * request trả lỗi safety, tính năng thành vô dụng.
 *
 * Chạy: node test/caption.test.js
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const m = SRC.match(/\/\* == CAPTION & DIRECTOR[\s\S]*?== END CAPTION & DIRECTOR == \*\//);
assert.ok(m, 'Không trích được khối CAPTION & DIRECTOR từ index.html');

const app = new Function(`${m[0]}\nreturn {captionPrompt, directorIdeasPrompt};`)();

let failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); }
  catch (e) { failed++; console.log(`  ✗ ${name}\n      ${e.message}`); }
}

const persona = { name: 'An Hạ', voiceTone: 'thủ thỉ, thẳng thắn', pov: 'phụ nữ mặc cho chính mình', niche: 'thời trang', signaturePhrases: 'cứ mặc đi đã' };

console.log('\ncaptionPrompt — bộ caption đăng mạng xã hội\n');

const cap = app.captionPrompt({ persona: persona, what: 'ảnh look gothic tối giản', lang: 'vi' });

test('yêu cầu đủ 4 phần trong schema JSON', () => {
  ['title', 'post', 'hashtags'].forEach(k => assert.ok(cap.indexOf('"' + k + '"') >= 0, 'thiếu field ' + k));
});

test('viết bằng giọng chính nhân vật, không phải người ngoài tả', () => {
  assert.ok(cap.indexOf('An Hạ') >= 0, 'thiếu tên nhân vật');
  assert.ok(cap.indexOf('thủ thỉ, thẳng thắn') >= 0, 'thiếu chất giọng');
  assert.ok(/CHÍNH nhân vật|chính nhân vật đang đăng/i.test(cap), 'không nêu viết bằng giọng nhân vật');
});

test('nêu rõ tài nguyên đang viết caption cho cái gì', () => {
  assert.ok(cap.indexOf('ảnh look gothic tối giản') >= 0, 'thiếu bối cảnh tài nguyên');
});

test('KHÔNG còn phần mô tả cho thuật toán (người dùng đã bỏ)', () => {
  assert.ok(cap.indexOf('"alt"') < 0, 'schema vẫn còn field alt');
  assert.ok(!/thuật toán nền tảng/i.test(cap), 'prompt vẫn nhắc mô tả cho thuật toán');
});

test('ràng buộc độ dài tiêu đề và số hashtag', () => {
  assert.ok(/\d+ từ/.test(cap), 'thiếu giới hạn độ dài tiêu đề');
  assert.ok(/\d+\s*-\s*\d+ tag|\d+–\d+ tag/.test(cap), 'thiếu số lượng hashtag');
});

test('đổi ngôn ngữ sang tiếng Anh', () => {
  const en = app.captionPrompt({ persona: persona, what: 'x', lang: 'en' });
  assert.ok(/English/.test(en), 'không đổi sang English');
});

test('giữ luật tuân thủ của repo', () => {
  assert.ok(/y khoa/i.test(cap), 'thiếu cấm claim y khoa');
  assert.ok(/thương hiệu thật/i.test(cap), 'thiếu cấm tên thương hiệu thật');
});

test('gọi không truyền gì vẫn ra prompt, không lòi undefined', () => {
  const c = app.captionPrompt();
  assert.ok(c.length > 100 && c.indexOf('undefined') < 0);
});

console.log('\ndirectorIdeasPrompt — đạo diễn sáng tạo ý tưởng phim\n');

const dir = app.directorIdeasPrompt({ persona: persona, n: 5, hasPhotos: 0, lang: 'vi' });

test('đặt vai đạo diễn có gu, không phải người viết quảng cáo', () => {
  assert.ok(/đạo diễn/i.test(dir), 'thiếu vai đạo diễn');
});

test('ra đúng số ý tưởng yêu cầu', () => {
  assert.ok(dir.indexOf('5 ý tưởng') >= 0, 'không nêu số ý tưởng');
  const d3 = app.directorIdeasPrompt({ persona: persona, n: 3 });
  assert.ok(d3.indexOf('3 ý tưởng') >= 0, 'không đổi theo n');
});

test('mỗi ý tưởng có tên phim, logline và twist', () => {
  ['ten_phim', 'logline', 'twist'].forEach(k => assert.ok(dir.indexOf('"' + k + '"') >= 0, 'thiếu field ' + k));
});

test('ép TÁO BẠO, cấm ý tưởng an toàn nhàm', () => {
  assert.ok(/táo bạo|liều|dám/i.test(dir), 'không đẩy về hướng táo bạo');
  assert.ok(/an toàn nhàm|sáo|quen thuộc|nhạt/i.test(dir), 'không cấm ý tưởng nhạt');
});

test('nêu RÕ ranh giới render được — đây là chỗ hỏng nếu viết ẩu', () => {
  assert.ok(/khoả thân|khỏa thân|nudity/i.test(dir), 'không nêu ranh giới khoả thân');
  assert.ok(/khiêu dâm/i.test(dir), 'không nêu ranh giới khiêu dâm');
  assert.ok(/ẩn dụ|gợi|căng thẳng|ánh sáng/i.test(dir), 'không chỉ hướng đi thay thế (ẩn dụ/tension/ánh sáng)');
});

test('bám nhân vật', () => {
  assert.ok(dir.indexOf('An Hạ') >= 0, 'thiếu nhân vật');
});

test('có ảnh tham chiếu thì bảo AI đọc ảnh', () => {
  const withPics = app.directorIdeasPrompt({ persona: persona, n: 5, hasPhotos: 3 });
  assert.ok(/3 ảnh/.test(withPics), 'không nêu số ảnh gửi kèm');
  assert.ok(/nhìn|đọc ảnh|quan sát/i.test(withPics), 'không bảo AI quan sát ảnh');
  assert.ok(!/\b0 ảnh\b/.test(dir), 'không có ảnh mà vẫn nhắc số ảnh');
});

test('không ảnh thì không nhắc gì tới ảnh tham chiếu', () => {
  assert.ok(!/ảnh gửi kèm|ảnh tham chiếu/i.test(dir), 'nhắc ảnh trong khi không có ảnh nào');
});

test('gọi không truyền gì vẫn chạy', () => {
  const d = app.directorIdeasPrompt();
  assert.ok(d.length > 100 && d.indexOf('undefined') < 0);
});

console.log(failed ? `\n${failed} test FAIL\n` : '\nTất cả test PASS\n');
process.exit(failed ? 1 : 0);
