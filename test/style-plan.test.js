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
// Phải ôm cả dấu mở/đóng comment, không thì đoạn cắt ra là JS không hợp lệ.
const m = SRC.match(/\/\* == STYLE PLAN VALIDATOR[\s\S]*?== END STYLE PLAN VALIDATOR == \*\//);
assert.ok(m, 'Không trích được khối STYLE PLAN VALIDATOR từ index.html');

const ang = SRC.match(/const ANGLES=\[[^\]]*\];/);
assert.ok(ang, 'Không trích được ANGLES');

const app = new Function(`${ang[0]}\n${m[0]}\nreturn {styleValidatePlan, ANGLES};`)();

let failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); }
  catch (e) { failed++; console.log(`  ✗ ${name}\n      ${e.message}`); }
}

// Dựng 1 bộ hợp lệ làm gốc, mỗi test bẻ đúng 1 chỗ.
function goodClip(i) {
  return {
    seq: i + 1, angle: app.ANGLES[i % app.ANGLES.length], action: 'walk', overlay: 'Phối áo khoác dài',
    camera: 'slow push in', sound: 'fabric rustle',
    end_state: 'facing camera three-quarter left, hand on collar',
    prompt_en: 'a cinematic shot'
  };
}
function goodVideo() { return { title: 'V', hook: 'h', audio: 'lo-fi', clips: [0, 1, 2, 3, 4, 5].map(goodClip) }; }
function goodLook(i) { return { name: 'Look ' + i, why: 'vì DNA', prompt_en: 'styled shot ' + i }; }
function goodSet() {
  return {
    styleName: 'Gothic tối giản',
    base: { prompt_en: 'plain outfit shot' },
    looks: [1, 2, 3, 4].map(goodLook),
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
  const r = app.styleValidatePlan([1, 2, 3, 4, 5, 6].map(goodSet));
  assert.ok(r.errors.some(e => /tối đa 5/.test(e)));
});

test('mặc định phải đúng 4 look', () => {
  const s = goodSet(); s.looks = [goodLook(1), goodLook(2)];
  assert.ok(app.styleValidatePlan([s]).errors.some(e => /phải đúng 4/.test(e)));
});

/* Luồng "ảnh thật của tôi" cho up 2-6 ảnh → số look thay đổi theo số ảnh, nên validator
   nhận số look mong đợi từ ngoài. */
test('truyền số look mong đợi thì ép theo số đó', () => {
  const s = goodSet(); s.looks = [goodLook(1), goodLook(2)];
  const r = app.styleValidatePlan([s], 2);
  assert.ok(r.ok, 'phải hợp lệ với expectLooks=2, lỗi: ' + r.errors.join(' | '));
});

test('truyền số look mong đợi mà AI trả sai thì báo đúng số', () => {
  const s = goodSet(); // 4 look
  assert.ok(app.styleValidatePlan([s], 5).errors.some(e => /phải đúng 5/.test(e)));
});

test('expectLooks không hợp lệ thì quay về mặc định 4', () => {
  const s = goodSet();
  assert.ok(app.styleValidatePlan([s], 0).ok, 'expectLooks=0 phải dùng mặc định 4');
  assert.ok(app.styleValidatePlan([s], 'x').ok, 'expectLooks sai kiểu phải dùng mặc định 4');
});

test('phải đúng 3 video', () => {
  const s = goodSet(); s.videos = [goodVideo()];
  assert.ok(app.styleValidatePlan([s]).errors.some(e => /phải đúng 3/.test(e)));
});

test('clip dưới 6 thì báo lỗi', () => {
  const s = goodSet(); s.videos[0].clips = [0, 1, 2].map(goodClip);
  assert.ok(app.styleValidatePlan([s]).errors.some(e => /phải 6-8/.test(e)));
});

test('clip trên 8 thì báo lỗi', () => {
  const s = goodSet(); s.videos[0].clips = [0, 1, 2, 3, 4, 5, 6, 7, 8].map(goodClip);
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

/* end_state là tuỳ chọn: prompt Omni chỉ nêu luật nối cut MỘT LẦN rồi để model tự dựng nhịp,
   nên không ép AI viết trạng thái kết thúc cho từng cut. Ép thêm ràng buộc chỉ làm tăng tỉ lệ
   AI trả sai schema mà chẳng đổi được gì ở đầu ra. */
test('thiếu end_state KHÔNG bị coi là lỗi (để AI tự sáng tạo nhịp)', () => {
  const s = goodSet();
  s.videos.forEach(v => v.clips.forEach(c => { delete c.end_state; delete c.camera; delete c.sound; }));
  const r = app.styleValidatePlan([s]);
  assert.ok(r.ok, 'phải hợp lệ, lỗi: ' + r.errors.join(' | '));
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
