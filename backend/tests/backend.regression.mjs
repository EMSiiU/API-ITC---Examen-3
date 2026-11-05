import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Standalone audit: real application, fake outbound dependencies, no real .env.
Object.assign(process.env, {
  NODE_ENV: 'test', PORT: '3000', FRONTEND_ORIGIN: 'http://localhost:5173',
  SESSION_COOKIE_NAME: 'audit_session', SESSION_TTL_HOURS: '8',
  COOKIE_SECURE: 'false', COOKIE_SAME_SITE: 'lax',
  SUPABASE_URL: 'https://audit-db.invalid', SUPABASE_SECRET_KEY: 'audit-only-not-a-real-key',
  SII_TOKEN_ENCRYPTION_KEY: randomBytes(32).toString('base64'),
  SII_API_BASE_URL: 'https://audit-sii.invalid', SII_REQUEST_TIMEOUT_MS: '40',
  DOTENV_CONFIG_PATH: fileURLToPath(new URL('./nonexistent-audit-env', import.meta.url)),
});
const base = new URL('../src/', import.meta.url).href;
const backendDirectory = fileURLToPath(new URL('../', import.meta.url));
const nativeFetch = globalThis.fetch.bind(globalThis);
const rows = new Map();
const token = 'AUDIT-INSTITUTIONAL-TOKEN-NOT-REAL';
const credentials = { email: 'audit@example.test', password: 'audit-password-not-real' };
const uuidPattern = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;
let mode, counts, server, address, encrypt, decrypt;
const results = [];
const errors = [];
const oldError = console.error;
console.error = (...args) => errors.push(args.map(String).join(' '));
const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json', ...headers },
});
const envelope = data => ({ code: 200, flag: true, data });
const period = { clave_periodo: '26/2', anio: 2026, descripcion_periodo: 'Audit period' };
const subject = {
  id_grupo: 1, letra_grupo: 'A', nombre_materia: 'Audit subject', clave_materia: 'TEST-1',
  clave_turno: 'TEST', nombre_plan: 'Audit program', letra_nivel: 'L',
};
const scheduleSubject = { ...subject };
for (const day of ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']) {
  scheduleSubject[day] = null;
  scheduleSubject[day + '_clave_salon'] = null;
}
scheduleSubject.lunes = '09:00-11:00';
const bodies = {
  '/api/movil/estudiante': envelope({ numero_control: 'TEST', semestre: '9', creditos_acumulados: '100' }),
  '/api/movil/estudiante/kardex': envelope({ porcentaje_avance: 50, kardex: [{
    nombre_materia: 'Audit subject', clave_materia: 'TEST-1', periodo: '26/V',
    creditos: '5', calificacion: 'AC', descripcion: 'Audit', semestre: 1,
  }] }),
  '/api/movil/estudiante/calificaciones': envelope([{ periodo: period, materias: [{
    materia: subject, calificaiones: [
      { id_calificacion: 1, numero_calificacion: 1, calificacion: '0' },
      { id_calificacion: 2, numero_calificacion: 2, calificacion: null },
    ],
  }] }]),
  '/api/movil/estudiante/horarios': envelope([{ periodo: period, horario: [scheduleSubject] }]),
};
function reset() {
  rows.clear(); errors.length = 0;
  mode = { sii: 'ok', db: 'ok' };
  counts = { sii: 0, db: 0, inserts: 0, updates: 0 };
}
globalThis.fetch = async (input, init) => {
  const url = new URL(input instanceof Request ? input.url : String(input));
  if (url.hostname === '127.0.0.1') return nativeFetch(input, init);
  const request = new Request(input, init);
  if (url.hostname === 'audit-db.invalid') {
    counts.db++;
    assert.equal(url.pathname, '/rest/v1/app_sessions');
    // A non-retryable API error keeps fault injection deterministic; SDK retry latency is outside this test.
    if (mode.db === 'all') return json({ message: 'Audit database error', code: 'AUDIT' }, 400);
    const id = (url.searchParams.get('id') ?? '').replace(/^eq\./, '');
    if (id && !uuidPattern.test(id)) {
      return json({ code: '22P02', message: 'invalid input syntax for type uuid' }, 400);
    }
    if (request.method === 'POST') {
      counts.inserts++;
      if (mode.db === 'insert') return json({ message: 'Audit insert failed' }, 500);
      const body = await request.json();
      const row = { ...body, student_identifier: null, revoked_at: null,
        created_at: new Date().toISOString(), last_seen_at: new Date().toISOString() };
      rows.set(row.id, row);
      return json(row, 201);
    }
    if (request.method === 'PATCH') {
      counts.updates++;
      const update = await request.json();
      if ((mode.db === 'touch' && update.last_seen_at) || (mode.db === 'revoke' && update.revoked_at)) {
        return json({ message: 'Audit update failed' }, 500);
      }
      const row = rows.get(id);
      if (row && row.revoked_at === null) Object.assign(row, update);
      return new Response(null, { status: 204 });
    }
    assert.equal(request.method, 'GET');
    const row = rows.get(id);
    const expiresFilter = url.searchParams.get('expires_at');
    const active = row && row.revoked_at === null && expiresFilter?.startsWith('gt.')
      && new Date(row.expires_at) > new Date(expiresFilter.slice(3));
    return json(active ? [row] : []);
  }
  if (url.hostname === 'audit-sii.invalid') {
    counts.sii++;
    if (mode.sii === 'network') throw new TypeError('Audit network unavailable');
    if (mode.sii === 'timeout') {
      return new Promise((resolve, reject) => {
        if (request.signal.aborted) return reject(request.signal.reason);
        request.signal.addEventListener('abort', () => reject(request.signal.reason), { once: true });
      });
    }
    if (typeof mode.sii === 'number') return json({ message: 'Audit upstream error' }, mode.sii);
    if (mode.sii === 'html') return new Response('<html>Audit response</html>', { status: 200 });
    if (mode.sii === 'invalid') return json({ unexpected: true });
    if (mode.sii === 'business-error') return json({ code: 401, flag: false, data: {} });
    if (url.pathname === '/api/login') {
      assert.equal(request.method, 'POST');
      assert.deepEqual(await request.json(), credentials);
      return json({ status: 200, flag: 'success', message: { login: { token } } });
    }
    assert.equal(request.headers.get('Authorization'), 'Bearer ' + token);
    assert.equal(request.method, 'GET');
    assert(url.pathname in bodies, 'unexpected institutional route');
    return json(bodies[url.pathname]);
  }
  throw new Error('External network blocked by audit harness');
};
async function test(name, fn) {
  reset();

  try { await fn(); results.push({ name, pass: true }); }
  catch (error) { results.push({ name, pass: false, reason: error.message }); }
}
function seed(changes = {}) {
  const id = randomUUID();
  rows.set(id, { id, sii_token_ciphertext: encrypt(token, id), student_identifier: null,
    created_at: new Date().toISOString(), last_seen_at: new Date(0).toISOString(),
    expires_at: new Date(Date.now() + 3600000).toISOString(), revoked_at: null, ...changes });
  return id;
}
async function call(path, options = {}) {
  const { cookie, body, headers: extraHeaders, ...other } = options;
  const headers = new Headers(extraHeaders);
  if (cookie !== undefined) headers.set('Cookie', cookie);
  if (body !== undefined) headers.set('Content-Type', 'application/json');
  const response = await nativeFetch(address + path, {
    signal: AbortSignal.timeout(6000), ...other, headers, ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const text = await response.text();
  let data; try { data = JSON.parse(text); } catch { data = null; }
  assert(!text.includes(token), 'institutional token leaked');
  assert(!text.includes(process.env.SUPABASE_SECRET_KEY), 'server key leaked');
  return { status: response.status, headers: response.headers, text, data };
}
const cookie = id => 'audit_session=' + encodeURIComponent(id);
const paths = ['/student/profile', '/student/kardex', '/student/grades', '/student/schedule'];
try {
  const crypto = await import(base + 'modules/auth/token-crypto.ts');
  encrypt = crypto.encryptSiiToken; decrypt = crypto.decryptSiiToken;
  const { app } = await import(base + 'app.ts');
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
  address = 'http://127.0.0.1:' + server.address().port;

  await test('health public and no external calls', async () => {
    assert.equal((await call('/health')).status, 200); assert.equal(counts.db + counts.sii, 0);
  });
  for (const body of [{}, { email: 'invalid', password: 'x' }, { email: credentials.email, password: '' }, null]) {
    await test('login input validation ' + JSON.stringify(body), async () => {
      assert.equal((await call('/auth/login', { method: 'POST', body })).status, 400);
      assert.equal(counts.db + counts.sii, 0);
    });
  }
  await test('login encrypted persistence and HttpOnly cookie', async () => {
    const r = await call('/auth/login', { method: 'POST', body: credentials });
    assert.equal(r.status, 200); assert.deepEqual(r.data, { authenticated: true });
    const setCookie = r.headers.get('set-cookie');
    assert.match(setCookie, /HttpOnly/); assert.match(setCookie, /SameSite=Lax/); assert.match(setCookie, /Path=\//);
    assert.match(setCookie, /Max-Age=28800/); assert(!setCookie.includes('Secure'));
    const row = [...rows.values()][0]; assert(uuidPattern.test(row.id));
    assert(row.sii_token_ciphertext.startsWith('v1.')); assert(!row.sii_token_ciphertext.includes(token));
    assert.equal(decrypt(row.sii_token_ciphertext, row.id), token);
  });
  for (const [upstream, expected] of [[401,401],[422,401],[500,503],['network',503],['timeout',503],['html',502],['invalid',502]]) {
    await test('login upstream ' + upstream + ' -> ' + expected, async () => {
      mode.sii = upstream;
      const r = await call('/auth/login', { method: 'POST', body: credentials });
      assert.equal(r.status, expected); assert.equal(rows.size,0); assert(!r.headers.get('set-cookie'));
    });
  }
  await test('login persistence failure -> safe 500', async () => {
    mode.db = 'insert'; const r = await call('/auth/login', { method: 'POST', body: credentials });
    assert.equal(r.status,500); assert(!r.headers.get('set-cookie'));
  });
  for (const path of ['/auth/session', ...paths]) {
    await test(path + ' missing cookie -> 401 without dependencies', async () => {
      assert.equal((await call(path)).status,401); assert.equal(counts.db + counts.sii,0);
    });
    for (const state of ['unknown','expired','revoked']) {
      await test(path + ' ' + state + ' session -> 401 without SII', async () => {
        const id = state === 'unknown' ? randomUUID() : seed(state === 'expired'
          ? { expires_at: new Date(Date.now()-1000).toISOString() }
          : { revoked_at: new Date().toISOString() });
        const r = await call(path, { cookie: cookie(id) });
        assert.equal(r.status,401); assert.match(r.headers.get('set-cookie'), /Expires=/); assert.equal(counts.sii,0);
      });
    }
  }
  await test('malformed non-UUID cookie -> 401', async () => {
    const r = await call('/auth/session', { cookie: cookie('not-a-uuid') }); assert.equal(r.status,401);
    assert.equal(counts.db,0); assert(r.headers.get('set-cookie'));
  });
  await test('malformed non-UUID logout -> idempotent 204', async () => {
    assert.equal((await call('/auth/logout', { method:'POST', cookie:cookie('not-a-uuid') })).status,204);
    assert.equal(counts.db,0);
  });
  await test('valid local session touches activity without SII', async () => {
    const id = seed(); const r = await call('/auth/session', { cookie:cookie(id) });
    assert.equal(r.status,200); assert.deepEqual(r.data,{ authenticated:true });
    assert.equal(counts.sii,0); assert.equal(counts.updates,1);
  });
  for (const failure of ['all','touch']) {
    await test('session database ' + failure + ' -> safe 500', async () => {
      const id=seed(); mode.db=failure;
      assert.equal((await call('/auth/session',{cookie:cookie(id)})).status,500); assert.equal(counts.sii,0);
    });
  }
  await test('corrupt encrypted token denied without SII', async () => {
    const id=seed({sii_token_ciphertext:'broken'});
    assert.equal((await call('/auth/session',{cookie:cookie(id)})).status,500); assert.equal(counts.sii,0);
  });
  for (const path of paths) {
    await test(path+' authorized -> normalized 200', async () => {
      const id=seed(); const r=await call(path,{cookie:cookie(id)}); assert.equal(r.status,200);
      const data = r.data[Object.keys(r.data)[0]]; assert(!('data' in data)); assert.equal(counts.sii,1);
      if(path.endsWith('/grades')) {
        assert.equal(data.periods[0].subjects[0].assessments[0].grade,0);
        assert.equal(data.periods[0].subjects[0].assessments[1].grade,null);
      }
      if(path.endsWith('/kardex')) { assert.equal(data.subjects[0].grade,null); assert.equal(data.subjects[0].gradeLabel,'AC'); }
      if(path.endsWith('/schedule')) assert.deepEqual(data.periods[0].subjects[0].sessions,[{day:1,startTime:'09:00',endTime:'11:00',classroom:null}]);
    });
    for (const [upstream,expected] of [[401,401],[403,401],[500,503],['network',503],['timeout',503],['html',502],['invalid',502]]) {
      await test(path+' upstream '+upstream+' -> '+expected, async () => {
        const id=seed(); mode.sii=upstream; const r=await call(path,{cookie:cookie(id)}); assert.equal(r.status,expected);
        if(expected===401) { assert(rows.get(id).revoked_at); assert(r.headers.get('set-cookie')); }
      });
    }
    await test(path+' SII rejected + revocation unavailable -> JSON 500',async () => {
      const id=seed(); mode.sii=401; mode.db='revoke'; const r=await call(path,{cookie:cookie(id)});
      assert.equal(r.status,500); assert(r.headers.get('content-type').includes('application/json'),'expected JSON error, received HTML');
      assert(r.headers.get('set-cookie'),'cookie should be cleared on institutional rejection');
    });
  }
  await test('profile business failure inside HTTP 200 is rejected',async()=>{
    const id=seed(); mode.sii='business-error'; const r=await call('/student/profile',{cookie:cookie(id)});
    assert.notEqual(r.status,200,'failure envelope accepted as a successful profile');
  });
  await test('logout without cookie idempotent 204',async()=>{
    assert.equal((await call('/auth/logout',{method:'POST'})).status,204); assert.equal(counts.db,0);
  });
  await test('logout revokes, clears cookie and denies reuse',async()=>{
    const id=seed(); const r=await call('/auth/logout',{method:'POST',cookie:cookie(id)});
    assert.equal(r.status,204); assert(rows.get(id).revoked_at); assert(r.headers.get('set-cookie'));
    assert.equal((await call('/auth/session',{cookie:cookie(id)})).status,401);
  });
  await test('logout persistence failure still clears browser cookie',async()=>{
    const id=seed(); mode.db='revoke'; const r=await call('/auth/logout',{method:'POST',cookie:cookie(id)});
    assert.equal(r.status,500); assert(r.headers.get('set-cookie'),'logout failure left browser cookie intact');
  });
  await test('allowed origin CORS includes credentials',async()=>{
    const r=await call('/health',{headers:{Origin:'http://localhost:5173'}});
    assert.equal(r.headers.get('access-control-allow-origin'),'http://localhost:5173');
    assert.equal(r.headers.get('access-control-allow-credentials'),'true');
  });
  await test('foreign origin cannot read via CORS',async()=>{
    const r=await call('/health',{headers:{Origin:'https://foreign.invalid'}});
    assert.notEqual(r.headers.get('access-control-allow-origin'),'https://foreign.invalid');
  });
  await test('foreign-origin state-changing request rejected server-side',async()=>{
    const id=seed(); const r=await call('/auth/logout',{method:'POST',cookie:cookie(id),headers:{Origin:'https://foreign.invalid'}});
    assert.equal(r.status,403); assert.equal(rows.get(id).revoked_at,null);
  });
  await test('malformed incoming JSON -> JSON 400',async()=>{
    const r=await call('/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:undefined,
      // call() permits a raw body through the underlying helper only below.
    });
    assert.equal(r.status,400);
    const response=await nativeFetch(address+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:'{broken'});
    await response.text(); assert.equal(response.status,400);
    assert(response.headers.get('content-type').includes('application/json'),'invalid JSON returned HTML rather than API JSON');
  });
  await test('oversized JSON -> JSON 413',async()=>{
    const r=await call('/auth/login',{method:'POST',body:{...credentials,padding:'x'.repeat(20000)}});
    assert.equal(r.status,413); assert(r.headers.get('content-type').includes('application/json'),'oversized request returned HTML');
    assert.equal(counts.sii,0);
  });
  await test('encryption randomness and binding to session ID',async()=>{
    const id=randomUUID(), a=encrypt(token,id), b=encrypt(token,id);
    assert.notEqual(a,b); assert.equal(decrypt(a,id),token); assert.throws(()=>decrypt(a,randomUUID()));
    const parts=a.split('.'); const bytes=Buffer.from(parts[3],'base64url'); bytes[0]^=1; parts[3]=bytes.toString('base64url');
    assert.throws(()=>decrypt(parts.join('.'),id));
  });
  await test('complete session lifecycle: login, session, four resources, logout, rejected reuse', async()=>{
    const login=await call('/auth/login',{method:'POST',body:credentials});
    assert.equal(login.status,200);
    const sessionCookie=login.headers.get('set-cookie').split(';')[0];
    assert.equal((await call('/auth/session',{cookie:sessionCookie})).status,200);
    for(const path of paths) assert.equal((await call(path,{cookie:sessionCookie})).status,200);
    assert.equal((await call('/auth/logout',{method:'POST',cookie:sessionCookie})).status,204);
    for(const path of ['/auth/session',...paths]) assert.equal((await call(path,{cookie:sessionCookie})).status,401);
  });
  await test('foreign-origin login rejected before credentials reach SII', async()=>{
    const r=await call('/auth/login',{method:'POST',body:credentials,headers:{Origin:'https://foreign.invalid'}});
    assert.equal(r.status,403); assert.equal(counts.db+counts.sii,0);
  });
  await test('allowed-origin login still works', async()=>{
    const r=await call('/auth/login',{method:'POST',body:credentials,headers:{Origin:'http://localhost:5173'}});
    assert.equal(r.status,200);
  });
  for(const origin of ['null','http://localhost:5173.foreign.invalid']) {
    await test('opaque or lookalike origin rejected: '+origin, async()=>{
      assert.equal((await call('/auth/logout',{method:'POST',headers:{Origin:origin}})).status,403);
      assert.equal(counts.db+counts.sii,0);
    });
  }
  await test('foreign Referer fallback rejected',async()=>{
    assert.equal((await call('/auth/logout',{method:'POST',headers:{Referer:'https://foreign.invalid/page'}})).status,403);
  });
  await test('trusted Referer fallback accepted',async()=>{
    assert.equal((await call('/auth/logout',{method:'POST',headers:{Referer:'http://localhost:5173/dashboard'}})).status,204);
  });
  await test('cross-site browser metadata without Origin rejected',async()=>{
    assert.equal((await call('/auth/logout',{method:'POST',headers:{'Sec-Fetch-Site':'cross-site'}})).status,403);
  });
  await test('allowed-origin CORS preflight remains functional',async()=>{
    const r=await call('/auth/login',{method:'OPTIONS',headers:{Origin:'http://localhost:5173','Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'content-type'}});
    assert.equal(r.status,204); assert.equal(r.headers.get('access-control-allow-origin'),'http://localhost:5173');
  });
  await test('profile success envelope with empty identity rejected',async()=>{
    const id=seed(); const previous=bodies['/api/movil/estudiante'];
    bodies['/api/movil/estudiante']=envelope({});
    try { assert.equal((await call('/student/profile',{cookie:cookie(id)})).status,502); }
    finally { bodies['/api/movil/estudiante']=previous; }
  });
  await test('unknown route has safe JSON 404',async()=>{
    const r=await call('/audit-missing'); assert.equal(r.status,404); assert.deepEqual(r.data,{message:'Route not found.'});
  });
  for (const [name, overrides, accepted] of [
    ['production rejects insecure cookie', { NODE_ENV:'production', COOKIE_SECURE:'false' }, false],
    ['SameSite=None rejects insecure cookie', { COOKIE_SAME_SITE:'none', COOKIE_SECURE:'false' }, false],
    ['production secure cross-site cookie configuration', { NODE_ENV:'production', COOKIE_SECURE:'true', COOKIE_SAME_SITE:'none' }, true],
    ['invalid encryption key rejected', { SII_TOKEN_ENCRYPTION_KEY:'invalid' }, false],
    ['invalid upstream timeout rejected', { SII_REQUEST_TIMEOUT_MS:'0' }, false],
  ]) {
    await test(name, async()=>{
      const program = `const {sessionCookieOptions:c}=await import('${base}modules/auth/session-cookie.ts'); if(!c.httpOnly) process.exit(2); if(process.env.NODE_ENV==='production' && !c.secure) process.exit(3);`;
      const child = spawnSync(process.execPath, ['--import','tsx','--input-type=module','-e',program], {
        cwd:backendDirectory, env:{...process.env,...overrides}, timeout:10000, encoding:'utf8',
      });
      assert(!child.error,'configuration subprocess failed to run');
      assert.equal(child.status===0,accepted);
    });
  }
} finally {
  if(server) await new Promise(resolve=>server.close(resolve));
  console.error=oldError;
  globalThis.fetch=nativeFetch;
}
const failed=results.filter(r=>!r.pass);
console.log(JSON.stringify({scope:'Real Express HTTP and application modules; Supabase/SII controlled test responses only; zero real accounts or external services accessed',total:results.length,passed:results.length-failed.length,failed:failed.length,failures:failed},null,2));


if (failed.length > 0) process.exitCode = 1;
