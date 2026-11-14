import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const adminsPath = path.join(root, 'admins.txt');
const rulesPath = path.join(root, 'firestore.rules');

const raw = fs.readFileSync(adminsPath, 'utf8');
const emails = raw
  .split(/\r?\n/)
  .map((l) => l.trim().toLowerCase())
  .filter((l) => l.length > 0 && !l.startsWith('#') && /^[^\s@']+@[^\s@']+\.[^\s@']+$/.test(l));

const formatted = emails.map((e) => `'${e}'`).join(',\n        ');
const rules = fs.readFileSync(rulesPath, 'utf8');

const updated = rules.replace(
  /function isAdmin\(\) \{[\s\S]*?\n    \}/,
  `function isAdmin() {\n      return isVerifiedUser() && request.auth.token.email in [\n        ${formatted || "'prodigyeditshelp@gmail.com'"}\n      ];\n    }`
);

fs.writeFileSync(rulesPath, updated, 'utf8');
console.log(`Synced ${emails.length} admin email(s) from admins.txt into firestore.rules.`);
