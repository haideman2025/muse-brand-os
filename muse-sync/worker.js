/**
 * Muse Brand OS → Sync backend (Cloudflare Worker + D1)
 *
 * Đăng nhập bằng ACCESS CODE (admin cấp) + đồng bộ workspace đa thiết bị.
 * - Code = bearer token, gửi qua header `x-muse-code` (hoặc ?code= cho sendBeacon).
 * - Conflict detection nguyên tử bằng cột `version` (CAS: UPDATE ... WHERE version=?).
 * - KHÔNG lưu API key Gemini của user — key đó local-only ở client.
 * - blob = JSON.stringify(S.characters) (chỉ TEXT, KHÔNG ảnh — ảnh để Phase 2/R2).
 *
 * Bindings (wrangler.toml): [[d1_databases]] binding="DB" → bảng accounts (schema.sql)
 * Secret: ADMIN_TOKEN (wrangler secret put ADMIN_TOKEN) → bảo vệ /admin/*
 * Deploy: cd muse-sync && wrangler deploy
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,x-muse-code,x-admin-token',
  'Access-Control-Max-Age': '86400',
};
const json = (d, s) => new Response(JSON.stringify(d), { status: s || 200, headers: { 'Content-Type': 'application/json', ...CORS } });
const now = () => new Date().toISOString();

/** sinh access code ngẫu nhiên, dễ đọc (không nhầm 0/O, 1/l) */
function genCode() {
  const A = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const b = new Uint8Array(20);
  crypto.getRandomValues(b);
  let s = '';
  for (let i = 0; i < b.length; i++) { s += A[b[i] % A.length]; if (i % 5 === 4 && i < b.length - 1) s += '-'; }
  return 'MB-' + s; // ví dụ: MB-ABCDE-FGHJK-MNPQR-STUVW
}

/** migration idempotent: thêm cột tracking nếu chưa có (gọi ở admin) */
async function ensureSchema(env) {
  try { await env.DB.prepare("CREATE TABLE IF NOT EXISTS accounts (code TEXT PRIMARY KEY, name TEXT, blob TEXT, version INTEGER NOT NULL DEFAULT 0, created_at TEXT, updated_at TEXT)").run(); } catch (e) {}
  const cols = [
    "ALTER TABLE accounts ADD COLUMN last_seen TEXT",
    "ALTER TABLE accounts ADD COLUMN plan TEXT DEFAULT 'life'",
    "ALTER TABLE accounts ADD COLUMN note TEXT",
    "ALTER TABLE accounts ADD COLUMN pushes INTEGER DEFAULT 0",
    "ALTER TABLE accounts ADD COLUMN expires_at TEXT",
  ];
  for (const sql of cols) { try { await env.DB.prepare(sql).run(); } catch (e) { /* duplicate column → bỏ qua */ } }
}
async function accMeta(env, code) {
  try { const r = await env.DB.prepare('SELECT plan,expires_at FROM accounts WHERE code=?').bind(code).first(); return { plan: (r && r.plan) || 'life', expiresAt: (r && r.expires_at) || null }; }
  catch (e) { return { plan: 'life', expiresAt: null }; }
}
/** ghi nhận hoạt động — KHÔNG được làm vỡ sync nếu cột chưa migrate */
async function touch(env, code, isPush) {
  try {
    if (isPush) await env.DB.prepare('UPDATE accounts SET last_seen=?, pushes=COALESCE(pushes,0)+1 WHERE code=?').bind(now(), code).run();
    else await env.DB.prepare('UPDATE accounts SET last_seen=? WHERE code=?').bind(now(), code).run();
  } catch (e) { /* cột chưa tồn tại → bỏ qua tới khi admin mở (ensureSchema) */ }
}

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    if (!env.DB) return json({ error: 'D1 chưa cấu hình (binding DB).' }, 500);

    const path = url.pathname;
    try {
      // ---------- ADMIN ----------
      if (path.startsWith('/admin/')) {
        const adm = (req.headers.get('x-admin-token') || '').trim();
        if (!env.ADMIN_TOKEN || adm !== env.ADMIN_TOKEN.trim()) return json({ error: 'Sai admin token.' }, 401);
        await ensureSchema(env);

        // Tạo mã mới
        if (path === '/admin/codes' && req.method === 'POST') {
          const body = await req.json().catch(() => ({}));
          const name = (body.name || '').toString().slice(0, 120) || 'Tài khoản mới';
          const plan = (body.plan || 'life').toString().slice(0, 20);
          const note = (body.note || '').toString().slice(0, 300);
          let code = genCode();
          for (let i = 0; i < 3; i++) {
            const ex = await env.DB.prepare('SELECT code FROM accounts WHERE code=?').bind(code).first();
            if (!ex) break; code = genCode();
          }
          await env.DB.prepare('INSERT INTO accounts (code,name,blob,version,created_at,updated_at,last_seen,plan,note,pushes) VALUES (?,?,NULL,0,?,?,NULL,?,?,0)')
            .bind(code, name, now(), now(), plan, note).run();
          return json({ code, name, plan, note });
        }

        // Danh sách + thống kê
        if (path === '/admin/overview' && req.method === 'GET') {
          const r = await env.DB.prepare('SELECT code,name,version,created_at,updated_at,last_seen,plan,note,pushes FROM accounts ORDER BY COALESCE(last_seen,updated_at,created_at) DESC').all();
          const rows = r.results || [];
          const t = Date.now(), D = 24 * 3600e3;
          const within = (ts, ms) => ts && (t - Date.parse(ts)) <= ms && (t - Date.parse(ts)) >= 0;
          const accounts = rows.map(a => ({ code: a.code, name: a.name, version: a.version, createdAt: a.created_at, updatedAt: a.updated_at, lastSeen: a.last_seen || null, plan: a.plan || 'life', note: a.note || '', pushes: a.pushes || 0, used: !!a.last_seen || (a.version > 0) }));
          const stats = { total: accounts.length, activated: accounts.filter(a => a.used).length, active24h: accounts.filter(a => within(a.lastSeen, D)).length, totalPushes: accounts.reduce((s, a) => s + (a.pushes || 0), 0), serverTime: now() };
          return json({ stats, accounts });
        }

        // Xoá / thu hồi mã
        if (path === '/admin/code/delete' && req.method === 'POST') {
          const b = await req.json().catch(() => ({}));
          if (!b.code) return json({ error: 'Thiếu code.' }, 400);
          const r = await env.DB.prepare('DELETE FROM accounts WHERE code=?').bind(b.code).run();
          return json({ ok: true, deleted: (r.meta && r.meta.changes) || 0 });
        }

        return json({ error: 'not found' }, 404);
      }

      // ---------- USER (cần access code) ----------
      const code = req.headers.get('x-muse-code') || url.searchParams.get('code') || '';
      if (!code) return json({ error: 'Thiếu mã đăng nhập.' }, 401);
      const acc = await env.DB.prepare('SELECT code,name,blob,version FROM accounts WHERE code=?').bind(code).first();
      if (!acc) return json({ error: 'Mã không hợp lệ.' }, 401);

      if (path === '/auth' && req.method === 'POST') {
        await touch(env, code, false);
        const m = await accMeta(env, code);
        return json({ ok: true, name: acc.name, version: acc.version, plan: m.plan, expiresAt: m.expiresAt });
      }

      if (path === '/pull' && req.method === 'GET') {
        await touch(env, code, false);
        const m = await accMeta(env, code);
        return json({ blob: acc.blob ? JSON.parse(acc.blob) : null, version: acc.version, name: acc.name, plan: m.plan, expiresAt: m.expiresAt });
      }

      if (path === '/push' && req.method === 'POST') {
        const body = await req.json().catch(() => ({}));
        const base = Number(body.baseVersion);
        if (body.blob == null || !Number.isFinite(base)) return json({ error: 'Thiếu blob/baseVersion.' }, 400);
        const blobStr = JSON.stringify(body.blob);
        const next = acc.version + 1;
        // CAS nguyên tử: chỉ ghi khi version còn khớp baseVersion
        const r = await env.DB.prepare('UPDATE accounts SET blob=?, version=version+1, updated_at=? WHERE code=? AND version=?')
          .bind(blobStr, now(), code, base).run();
        const changed = (r.meta && r.meta.changes) || 0;
        if (changed === 1) { await touch(env, code, true); return json({ ok: true, version: next }); }
        // xung đột: thiết bị khác đã push trước → trả bản server cho client (server-wins)
        return json({ conflict: true, serverBlob: acc.blob ? JSON.parse(acc.blob) : null, version: acc.version }, 409);
      }

      return json({ error: 'not found' }, 404);
    } catch (e) {
      return json({ error: String((e && e.message) || e) }, 502);
    }
  },
};
