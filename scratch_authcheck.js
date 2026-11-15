// Verifica que el servidor RECHAZA cookies sin firma o con firma inválida.
const base = 'http://localhost:3000';

async function call(label, path, cookie, extra = {}) {
  const headers = { ...(cookie ? { Cookie: `dooplex_session=${cookie}` } : {}), ...extra };
  const res = await fetch(base + path, { headers });
  const txt = (await res.text()).slice(0, 140).replace(/\s+/g, ' ');
  console.log(`${label.padEnd(46)} -> ${res.status} ${txt}`);
}

(async () => {
  // Formato antiguo: base64 plano (el que permitía falsificar el rol admin)
  const legacy = Buffer.from(JSON.stringify({ id: 1, role: 'admin', name: 'x' })).toString('base64');
  // Formato nuevo pero con firma inventada
  const payload = Buffer.from(JSON.stringify({ id: 1, role: 'admin', exp: 9999999999 })).toString('base64url');
  const badSig = `${payload}.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`;
  // Firma válida de un payload distinto (reutilizar firma ajena)
  const noSig = `${payload}.`;

  await call('sin cookie  /api/auth/me', '/api/auth/me', null);
  await call('cookie antigua (base64) /api/auth/me', '/api/auth/me', legacy);
  await call('firma inventada /api/auth/me', '/api/auth/me', badSig);
  await call('firma vacía /api/auth/me', '/api/auth/me', noSig);
  await call('cookie antigua /api/favorites', '/api/favorites', legacy);
  await call('cookie antigua /api/admin/plans (GET admin subs)', '/api/admin/subscriptions', legacy);
  await call('firma inventada /api/admin/subscriptions', '/api/admin/subscriptions', badSig);
  await call('Bearer sin firma válida /api/admin/subscriptions', '/api/admin/subscriptions', null, {
    Authorization: 'Bearer ' + Buffer.from('{"alg":"HS256"}').toString('base64url') + '.' +
      Buffer.from('{"sub":1,"role":"admin"}').toString('base64url') + '.firmafalsa',
  });
})();
