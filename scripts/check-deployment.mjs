// Vérifie une publication réelle : portail de mot de passe, script, paquet chiffré.
// Échoue bruyamment quand le domaine, le DNS ou l'hébergement ne servent plus le site.
const VAULT_PATTERN = /application-[a-f0-9]{16}\.bin/;
import {pathToFileURL} from 'node:url';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function text(response) {
  return new Response(response.body).text();
}

export async function checkDeployment(baseUrl, {fetchImpl = globalThis.fetch, attempts = 6, delayMs = 10000, log = console.log} = {}) {
  if (typeof baseUrl !== 'string' || !/^https?:\/\//.test(baseUrl)) throw Error('A URL with http:// or https:// is required');
  const base = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const started = Date.now();
      const page = await fetchImpl(base, {redirect: 'follow', headers: {'Cache-Control': 'no-cache'}});
      if (page.status !== 200) throw Error('Portal status ' + page.status + ' for ' + page.url);
      const html = await text(page);
      if (!/id="password"/.test(html)) throw Error('The published page is not the password portal');
      if (/id="root"/.test(html)) throw Error('The published page contains the plaintext application');
      const scriptUrl = new URL((html.match(/<script[^>]*type="module"[^>]*src="([^"]+)"/) || [])[1] || '', base);
      if (!scriptUrl.href) throw Error('The portal does not reference a module script');
      const script = await fetchImpl(scriptUrl, {redirect: 'follow'});
      if (script.status !== 200) throw Error('Portal script status ' + script.status);
      const vaultName = (await text(script)).match(VAULT_PATTERN)?.[0];
      if (!vaultName) throw Error('The portal script does not reference an encrypted payload');
      const vaultUrl = new URL('./' + vaultName, base);
      const vault = await fetchImpl(vaultUrl, {method: 'HEAD', redirect: 'follow'});
      if (vault.status !== 200) throw Error('Encrypted payload status ' + vault.status);
      const size = Number(vault.headers.get('content-length') || 0);
      if (size && size < 1024 * 1024) throw Error('Encrypted payload looks truncated: ' + size + ' bytes');
      log('Deployment verified in ' + (Date.now() - started) + ' ms: ' + base + ' serves the gate and ' + vaultName + (size ? ' (' + size + ' bytes)' : ''));
      return {url: base, vault: vaultUrl.href, size};
    } catch (error) {
      lastError = error;
      if (attempt === attempts) break;
      log('Check ' + attempt + '/' + attempts + ' failed: ' + error.message + '; retrying in ' + delayMs + ' ms');
      await sleep(delayMs);
    }
  }
  throw Error('Published site is unreachable or incomplete: ' + lastError.message);
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  checkDeployment(process.argv[2], {
    attempts: Number(process.env.CHECK_ATTEMPTS || 6),
    delayMs: Number(process.env.CHECK_DELAY_MS || 10000),
  }).catch(error => { console.error(error.message); process.exitCode = 1; });
}
