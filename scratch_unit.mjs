import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

// Stub mínimo de 'next/headers' para poder importar db.ts fuera de Next
register(
  'data:text/javascript,' +
    encodeURIComponent(`
      export async function resolve(spec, ctx, next) {
        if (spec === 'next/headers') return { url: 'data:text/javascript,export const cookies = async () => ({ get: () => undefined });', shortCircuit: true };
        return next(spec, ctx);
      }
    `),
  pathToFileURL('./')
);

process.env.JWT_SECRET = 'secreto-de-prueba-solo-para-test-1234567890';
const db = await import('./src/lib/db.ts');

const ok = (name, cond) => console.log(`${cond ? 'OK  ' : 'FALLO'} ${name}`);

// 1. Ida y vuelta de una cookie legítima
const cookie = db.signSessionCookie({ id: 7, name: 'Ana', role: 'user' });
const back = db.verifySessionCookie(cookie);
ok('cookie legítima se acepta', back && back.id === 7 && back.role === 'user');

// 2. Manipular el rol dentro del payload conservando la firma
const [payload, sig] = cookie.split('.');
const tampered = JSON.parse(Buffer.from(payload, 'base64url').toString());
tampered.role = 'admin';
const tamperedCookie = Buffer.from(JSON.stringify(tampered)).toString('base64url') + '.' + sig;
ok('rol alterado con firma original se rechaza', db.verifySessionCookie(tamperedCookie) === null);

// 3. Cookie firmada con OTRO secreto (p. ej. el que estaba público en GitHub)
import crypto from 'node:crypto';
const forgedPayload = Buffer.from(JSON.stringify({ id: 1, role: 'admin', exp: 9999999999 })).toString('base64url');
const oldSecretSig = crypto.createHmac('sha256', 'dooplex-jwt-secret-key-2026').update(`session.${forgedPayload}`).digest('base64url');
ok('firmada con el secreto antiguo público se rechaza', db.verifySessionCookie(`${forgedPayload}.${oldSecretSig}`) === null);

// 4. Expiración
const expired = db.signSessionCookie({ id: 7, role: 'user' }, -10);
ok('cookie expirada se rechaza', db.verifySessionCookie(expired) === null);

// 5. Formato antiguo base64 plano
ok('formato antiguo base64 se rechaza', db.verifySessionCookie(Buffer.from('{"id":1,"role":"admin"}').toString('base64')) === null);

// 6. JWT: válido y falsificado
const jwt = db.createAccessToken({ sub: 9, role: 'user' }, 60);
ok('JWT legítimo se acepta', db.verifyAccessToken(jwt)?.sub === 9);
const [h, b, s] = jwt.split('.');
const forgedBody = Buffer.from(JSON.stringify({ sub: 9, role: 'admin', exp: 9999999999 })).toString('base64url');
ok('JWT con payload alterado se rechaza', db.verifyAccessToken(`${h}.${forgedBody}.${s}`) === null);
ok('JWT expirado se rechaza', db.verifyAccessToken(db.createAccessToken({ sub: 9 }, -5)) === null);

// 7. Cifrado de la cookie del instalador: ida y vuelta + clave distinta falla
const enc = db.encryptDbConfig({ host: 'h', port: 3306, user: 'u', password: 'p', database: 'd' });
ok('cookie del instalador descifra con el mismo secreto', db.decryptDbConfig(enc)?.host === 'h');
process.env.JWT_SECRET = 'otro-secreto-distinto-1234567890abcdef';
ok('cookie del instalador NO descifra con otro secreto', db.decryptDbConfig(enc) === null);
