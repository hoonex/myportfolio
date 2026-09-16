import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const sourcesPath = path.join(root, 'portfolio-sources.json');
const snapshotsPath = path.join(root, 'portfolio-snapshots.json');
const mode = process.argv.includes('--write') ? 'write' : 'validate';

const readJson = async file => JSON.parse(await fs.readFile(file, 'utf8'));
const isSha = value => /^[0-9a-f]{40}$/i.test(value || '');
const isIso = value => !Number.isNaN(Date.parse(value || ''));

function validateSources(doc) {
  if (doc?.schema !== 1 || !doc.projects || typeof doc.projects !== 'object') throw new Error('invalid portfolio-sources.json');
  for (const [key, item] of Object.entries(doc.projects)) {
    if (!/^[a-z0-9-]+$/.test(key)) throw new Error(`invalid project key: ${key}`);
    if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(item.repository || '')) throw new Error(`invalid repository: ${key}`);
    if (!item.ref || typeof item.ref !== 'string') throw new Error(`missing ref: ${key}`);
  }
}

function validateSnapshots(doc, sources) {
  if (doc?.schema !== 1 || !doc.projects || typeof doc.projects !== 'object') throw new Error('invalid portfolio-snapshots.json');
  for (const [key, source] of Object.entries(sources.projects)) {
    const snap = doc.projects[key];
    if (!snap) throw new Error(`missing snapshot: ${key}`);
    if (snap.repository !== source.repository || snap.ref !== source.ref) throw new Error(`source mismatch: ${key}`);
    if (!isSha(snap.sha) || snap.shortSha !== snap.sha.slice(0, 7)) throw new Error(`invalid sha: ${key}`);
    if (!isIso(snap.date)) throw new Error(`invalid date: ${key}`);
    if (!/^https:\/\/github\.com\//.test(snap.url || '')) throw new Error(`invalid url: ${key}`);
  }
}

function projectComparable(projects) {
  return JSON.stringify(projects);
}

async function fetchRef({repository, ref}, token) {
  const headers = {'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'hj-portfolio-sync'};
  if (token) headers.Authorization = `Bearer ${token}`;
  const encodedRef = ref.split('/').map(encodeURIComponent).join('/');
  const branchUrl = `https://api.github.com/repos/${repository}/branches/${encodedRef}`;
  let response = await fetch(branchUrl, {headers});
  let payload;
  if (response.ok) {
    payload = await response.json();
    return payload.commit;
  }
  if (response.status !== 404) throw new Error(`${repository}@${ref}: ${response.status}`);
  const commitUrl = `https://api.github.com/repos/${repository}/commits/${encodeURIComponent(ref)}`;
  response = await fetch(commitUrl, {headers});
  if (!response.ok) throw new Error(`${repository}@${ref}: ${response.status}`);
  return await response.json();
}

const sources = await readJson(sourcesPath);
const snapshots = await readJson(snapshotsPath);
validateSources(sources);
validateSnapshots(snapshots, sources);

if (mode === 'validate') {
  console.log(`portfolio snapshots valid: ${Object.keys(sources.projects).length} projects`);
  process.exit(0);
}

const token = process.env.GITHUB_TOKEN || '';
const nextProjects = {};
for (const [key, source] of Object.entries(sources.projects)) {
  const commit = await fetchRef(source, token);
  const sha = commit.sha;
  const info = commit.commit || commit;
  const date = info.committer?.date || info.author?.date;
  const message = String(info.message || '').split('\n')[0].trim();
  if (!isSha(sha) || !isIso(date)) throw new Error(`incomplete GitHub commit data: ${key}`);
  nextProjects[key] = {
    repository: source.repository,
    ref: source.ref,
    sha,
    shortSha: sha.slice(0, 7),
    date,
    message,
    url: `https://github.com/${source.repository}/commit/${sha}`
  };
}

if (projectComparable(snapshots.projects) === projectComparable(nextProjects)) {
  console.log('portfolio snapshots already current');
  process.exit(0);
}

const next = {schema:1, generatedAt:new Date().toISOString(), projects:nextProjects};
validateSnapshots(next, sources);
await fs.writeFile(snapshotsPath, `${JSON.stringify(next, null, 2)}\n`);
console.log(`portfolio snapshots updated: ${Object.keys(nextProjects).length} projects`);
