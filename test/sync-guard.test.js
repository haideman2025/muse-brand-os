/**
 * Test cho khoá chống đẩy đồng bộ chồng lên nhau.
 *
 * Bệnh cũ: mỗi save() hẹn một lượt đẩy sau 2s, KHÔNG có khoá. Blob S.characters của người dùng
 * nhiều nhân vật nặng vài MB nên một lượt đẩy lâu hơn 2s → lượt sau khởi động khi lượt trước còn
 * bay, mang baseVersion đã cũ → máy chủ 409 → app tưởng thiết bị khác vừa sửa, nuốt blob máy chủ
 * và hiện toast. Lặp liên tục trong lúc đang sinh ảnh, và có thể xoá mất ảnh vừa tạo.
 *
 * Chạy: node test/sync-guard.test.js
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const m = SRC.match(/\/\* == SYNC PUSH GUARD[\s\S]*?== END SYNC PUSH GUARD == \*\//);
assert.ok(m, 'Không trích được khối SYNC PUSH GUARD từ index.html');

let failed = 0;
function test(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then(() => console.log(`  ✓ ${name}`))
    .catch(e => { failed++; console.log(`  ✗ ${name}\n      ${e.message}`); });
}

// Dựng môi trường giả: đếm số lượt đẩy thật sự chạy và số lượt chạy CHỒNG nhau.
function makeEnv(pushMs) {
  const state = { started: 0, done: 0, concurrentMax: 0, live: 0, toasts: [] };
  const env = `
    let __pushTimer=null;
    function syncCode(){return 'CODE';}
    function toast(m){state.toasts.push(m);}
    async function syncPushNow(){
      state.started++; state.live++;
      state.concurrentMax=Math.max(state.concurrentMax,state.live);
      await new Promise(r=>setTimeout(r,${pushMs}));
      state.live--; state.done++;
    }
    ${m[0]}
    return {schedulePush, runPush, syncToastOnce, state};
  `;
  return new Function('state', env)(state);
}
const wait = ms => new Promise(r => setTimeout(r, ms));

(async function () {
  console.log('\nKhoá chống đẩy đồng bộ chồng lên nhau\n');

  await test('nhiều lượt gọi liên tiếp KHÔNG chạy chồng nhau', async () => {
    const app = makeEnv(120);
    for (let i = 0; i < 6; i++) { app.runPush(); }
    await wait(600);
    assert.strictEqual(app.state.concurrentMax, 1, 'có ' + app.state.concurrentMax + ' lượt đẩy chạy cùng lúc — đây chính là nguyên nhân 409');
  });

  await test('lượt gọi khi đang bay được ghi nợ và đẩy đúng MỘT lần sau đó', async () => {
    const app = makeEnv(150);
    app.runPush();                 // lượt 1 chạy
    await wait(20);
    app.runPush(); app.runPush(); app.runPush();  // 3 lượt trong lúc đang bay → gộp thành 1
    await wait(700);
    assert.strictEqual(app.state.started, 2, 'chạy ' + app.state.started + ' lượt, phải đúng 2 (1 lượt đầu + 1 lượt gộp)');
  });

  await test('không có nợ thì không đẩy thừa', async () => {
    const app = makeEnv(50);
    app.runPush();
    await wait(400);
    assert.strictEqual(app.state.started, 1, 'chạy ' + app.state.started + ' lượt, phải đúng 1');
  });

  await test('lượt đẩy lỗi vẫn nhả khoá, không kẹt vĩnh viễn', async () => {
    const state = { started: 0, toasts: [] };
    const app = new Function('state', `
      let __pushTimer=null;
      function syncCode(){return 'CODE';}
      function toast(m){state.toasts.push(m);}
      async function syncPushNow(){state.started++;throw new Error('mạng lỗi');}
      ${m[0]}
      return {runPush, state};
    `)(state);
    try { await app.runPush(); } catch (e) { /* lỗi nổi lên là chấp nhận */ }
    await wait(50);
    await app.runPush().catch(() => {});
    await wait(50);
    assert.ok(app.state.started >= 2, 'khoá bị kẹt sau khi đẩy lỗi — chỉ chạy được ' + app.state.started + ' lượt');
  });

  await test('toast xung đột bị chặn spam — tối đa 1 lần mỗi phút', async () => {
    const app = makeEnv(10);
    for (let i = 0; i < 5; i++) app.syncToastOnce('☁️ xung đột');
    assert.strictEqual(app.state.toasts.length, 1, 'hiện ' + app.state.toasts.length + ' toast, phải đúng 1');
  });

  await test('schedulePush gộp nhiều save liên tiếp thành một lượt hẹn', async () => {
    const app = makeEnv(30);
    for (let i = 0; i < 10; i++) app.schedulePush();
    await wait(2400);
    assert.strictEqual(app.state.started, 1, '10 lần save phải gộp thành 1 lượt đẩy, được ' + app.state.started);
  });

  console.log(failed ? `\n${failed} test FAIL\n` : '\nTất cả test PASS\n');
  process.exit(failed ? 1 : 0);
})();
