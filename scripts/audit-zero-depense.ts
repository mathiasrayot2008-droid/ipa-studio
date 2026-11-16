/**
 * Audit « zéro dépense » (test L) — reproductible : `npm run audit:zero`. Échoue (code 1) à la moindre entorse.
 * Vérifie sur le dépôt réellement suivi par git (pas sur ce qu'on croit y avoir mis) :
 *  1. aucune dépendance de service payant / d'API payante (npm ls --all complet, pas seulement package.json) ;
 *  2. firebase.json ne déclare ni Functions, ni Storage, ni Hosting, ni Extensions (rien qui exige l'offre Blaze) ;
 *  3. aucun secret ni clé d'API dans les fichiers suivis ;
 *  4. les seuls hôtes externes contactés par le code de l'appli sont ceux de la liste blanche ;
 *  5. les workflows n'utilisent que des exécuteurs GitHub standard gratuits (ubuntu-latest) ;
 *  6. rien de privé (Schooding, solutions, spécifications) n'est suivi par git.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const sh = (cmd: string, args: string[]) => execFileSync(cmd, args, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
const tracked = sh('git', ['ls-files']).split('\n').filter((f) => f && existsSync(f));
const results: { ok: boolean; label: string; detail: string }[] = [];
const check = (label: string, ok: boolean, detail: string) => results.push({ ok, label, detail });

// 1. dépendances
const PAID = [
  /^@anthropic-ai\//, /^openai$/, /^@openai\//, /^stripe$/, /^@stripe\//, /^@paypal\//, /^braintree/, /^aws-sdk$/, /^@aws-sdk\//,
  /^@google-cloud\//, /^firebase-admin$/, /^firebase-functions$/, /^@vercel\//, /^@sentry\//, /^algoliasearch$/, /^@supabase\//,
  /^twilio$/, /^@sendgrid\//, /^@mailchimp\//, /^mongodb$/, /^@planetscale\//, /^cohere-ai$/, /^@mistralai\//, /^replicate$/,
];
/** `npm ls` sort avec un code ≠ 0 dès qu'une dépendance homologue est « invalide » (--legacy-peer-deps) mais écrit quand même l'arbre complet. */
const npmLs = (extra: string[]): string => { try { return sh('npm', ['ls', '--all', '--json', '--legacy-peer-deps', ...extra]); } catch (e) { return String((e as { stdout?: string }).stdout ?? '{}'); } };
const namesOf = (extra: string[]) => {
  const out = new Set<string>();
  const tree = JSON.parse(npmLs(extra) || '{}') as { dependencies?: Record<string, { dependencies?: unknown }> };
  const walk = (d: Record<string, { dependencies?: unknown }> | undefined) => { for (const [n, v] of Object.entries(d ?? {})) { out.add(n); walk(v.dependencies as never); } };
  walk(tree.dependencies);
  return out;
};
const prod = namesOf(['--omit=dev']);
const all = namesOf([]);
const paidProd = [...prod].filter((n) => PAID.some((p) => p.test(n)));
check('Code livré aux étudiants : aucune dépendance de service payant', paidProd.length === 0, paidProd.length ? paidProd.join(', ') : `${prod.size} paquets d’exécution examinés`);
// Outils de développement : `firebase-tools` (émulateurs locaux) embarque des bibliothèques @google-cloud/* ; ce sont des
// bibliothèques inertes (aucun appel sans identifiants + facturation) et elles ne sont JAMAIS dans le build livré.
const paidDev = [...all].filter((n) => !prod.has(n) && PAID.some((p) => p.test(n)));
const unexpectedDev = paidDev.filter((n) => !n.startsWith('@google-cloud/'));
check('Outils de développement : seules les bibliothèques @google-cloud/* de firebase-tools (émulateurs), absentes du build', unexpectedDev.length === 0, paidDev.length ? `${paidDev.length} paquets de développement (${paidDev.slice(0, 4).join(', ')}…)` : 'aucun');
const direct = JSON.parse(readFileSync('package.json', 'utf8')) as { dependencies?: Record<string, string> };
check('Dépendances directes d’exécution', true, Object.keys(direct.dependencies ?? {}).join(', '));

// 2. firebase.json
const fb = JSON.parse(readFileSync('firebase.json', 'utf8')) as Record<string, unknown>;
const forbidden = ['functions', 'storage', 'hosting', 'extensions', 'dataconnect', 'apphosting'].filter((k) => k in fb);
check('firebase.json : seulement Firestore + émulateurs (rien qui exige Blaze)', forbidden.length === 0, forbidden.length ? `présent : ${forbidden.join(', ')}` : `clés : ${Object.keys(fb).join(', ')}`);

// 3. secrets
const SECRET = [/AIza[0-9A-Za-z_-]{35}/, /sk-[A-Za-z0-9]{20,}/, /sk-ant-[A-Za-z0-9_-]{20,}/, /ghp_[A-Za-z0-9]{30,}/, /github_pat_[A-Za-z0-9_]{30,}/, /-----BEGIN [A-Z ]*PRIVATE KEY-----/, /AKIA[0-9A-Z]{16}/, /xox[bp]-[A-Za-z0-9-]{20,}/];
const text = tracked.filter((f) => !/\.(png|jar|ico|woff2?|jpg|jpeg|gif)$/.test(f) && !f.startsWith('public/bank/') && f !== 'package-lock.json' && f !== 'scripts/audit-zero-depense.ts');
const leaks: string[] = [];
for (const f of text) { const t = readFileSync(f, 'utf8'); for (const re of SECRET) if (re.test(t)) leaks.push(`${f} (${re})`); }
check('Aucun secret ni clé d’API dans les fichiers suivis', leaks.length === 0, leaks.length ? leaks.join('; ') : `${text.length} fichiers texte examinés`);

// 4. hôtes externes
const ALLOWED = new Set([
  'cjrtnc.leaningtech.com',        // runtime CheerpJ (licence Community, gratuit)
  'cheerpj.com',                   // lien d'attribution « Built with CheerpJ » (Réglages → À propos), jamais appelé par le code
  'claude.ai',                     // bouton « Comprendre mon erreur » : ouvre claude.ai/new?q=… (aucune API, aucune clé)
  'www.schooding.fr', 'schooding.fr', // texte de documentation uniquement (liens affichés, jamais appelés)
  'repo1.maven.org',               // documentation/scripts de build locaux (jars)
  'www.w3.org', 'localhost', '127.0.0.1', 'firebaseapp.com',
]);
const URL_RE = /https?:\/\/([a-z0-9.-]+\.[a-z]{2,}|localhost|127\.0\.0\.1)/gi;
const hosts = new Map<string, Set<string>>();
for (const f of tracked.filter((x) => /^(src|public\/(runner\.html|sw\.js|manifest\.webmanifest)|index\.html)/.test(x) && /\.(ts|tsx|html|js|webmanifest|css)$/.test(x))) {
  for (const m of readFileSync(f, 'utf8').matchAll(URL_RE)) { const h = m[1]!.toLowerCase(); (hosts.get(h) ?? hosts.set(h, new Set()).get(h)!).add(f); }
}
const unknown = [...hosts.keys()].filter((h) => !ALLOWED.has(h) && ![...ALLOWED].some((a) => h.endsWith(`.${a}`)));
check('Hôtes externes du code applicatif : liste blanche uniquement', unknown.length === 0, unknown.length ? unknown.map((h) => `${h} ← ${[...hosts.get(h)!].join(', ')}`).join('; ') : [...hosts.keys()].sort().join(', '));

// 5. workflows
const wf = tracked.filter((f) => f.startsWith('.github/workflows/'));
const runners = wf.flatMap((f) => [...readFileSync(f, 'utf8').matchAll(/runs-on:\s*(\S+)/g)].map((m) => m[1]!));
check('Workflows : exécuteurs GitHub standard gratuits uniquement', runners.length > 0 && runners.every((r) => r === 'ubuntu-latest'), [...new Set(runners)].join(', '));
const secretsUsed = wf.flatMap((f) => [...readFileSync(f, 'utf8').matchAll(/secrets\.([A-Z_]+)/g)].map((m) => m[1]!)).filter((s) => s !== 'GITHUB_TOKEN');
check('Workflows : aucun secret payant requis', secretsUsed.length === 0, secretsUsed.length ? secretsUsed.join(', ') : 'aucun');

// 6. contenu privé
const priv = tracked.filter((f) => f.startsWith('private/') || /schooding-(bank|export|solutions|report)/.test(f) || f.startsWith('bank/schooding/'));
check('Rien de privé (Schooding, solutions, spécifications) suivi par git', priv.length === 0 && existsSync('.gitignore') && /^private\/$/m.test(readFileSync('.gitignore', 'utf8')), priv.length ? priv.join(', ') : 'private/ est ignoré');

for (const r of results) console.log(`${r.ok ? '✓' : '✗'} ${r.label}\n    ${r.detail}`);
const bad = results.filter((r) => !r.ok).length;
console.log(bad ? `\n${bad} entorse(s) à la règle zéro dépense.` : '\nAudit zéro dépense : OK.');
process.exit(bad ? 1 : 0);
