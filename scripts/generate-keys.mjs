// Run once:  npm run keys
// Creates the license signing key pair and a JWT secret, and prints how to use them.
import { webcrypto as crypto } from 'node:crypto'

const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
  'sign',
  'verify',
])

const privateJwk = await crypto.subtle.exportKey('jwk', pair.privateKey)
const publicJwk = await crypto.subtle.exportKey('jwk', pair.publicKey)

for (const jwk of [privateJwk, publicJwk]) {
  delete jwk.key_ops
  delete jwk.ext
}

const jwtSecret = Buffer.from(crypto.getRandomValues(new Uint8Array(48))).toString('base64url')

console.log(`
=====================================================================
 1) LOCAL  ->  create a file named  .dev.vars  in the project root
    and paste these 3 lines (change the admin password!)
=====================================================================
ADMIN_PASSWORD=choose-a-strong-admin-password
JWT_SECRET=${jwtSecret}
LICENSE_PRIVATE_KEY=${JSON.stringify(privateJwk)}

=====================================================================
 2) PRODUCTION  ->  run these 3 commands (each asks you to paste a value)
=====================================================================
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put JWT_SECRET             (paste the JWT_SECRET value above)
npx wrangler secret put LICENSE_PRIVATE_KEY    (paste the one-line JSON above)

=====================================================================
 3) PUBLIC KEY  ->  safe to put inside the React app (it can only verify)
=====================================================================
${JSON.stringify(publicJwk)}

KEEP LICENSE_PRIVATE_KEY SECRET and never commit .dev.vars.
If it leaks, anyone can forge licenses. If you lose it, all licenses must be re-issued.
`)