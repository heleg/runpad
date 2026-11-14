import { readFile, writeFile, mkdir, rm, readdir, cp } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { spawnSync } from 'node:child_process';
import { watch } from 'node:fs';

const [task = 'inventory', ...args] = process.argv.slice(2);
function option(name, fallback) {
  const index = args.indexOf(`--${name}`);
  return args.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3)
    ?? (index >= 0 ? args[index + 1] : fallback);
}
const manifest = JSON.parse(await readFile('package.json', 'utf8'));
const output = resolve('.mock-output');
const log = (message) => console.log(`[${manifest.name}:${task}] ${message}`);
async function files(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (['node_modules', '.git', '.idea', '.agents', '.aws', '.codex', '.mock-output'].includes(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await files(path));
    else if (entry.isFile()) result.push(path);
  }
  return result.sort();
}
async function save(name, data) {
  await mkdir(output, { recursive: true });
  await writeFile(join(output, name), JSON.stringify(data, null, 2) + '\n');
  log(`Wrote ${join(output, name)}`);
}
async function inventory() {
  return Promise.all((await files('src')).map(async (path) => {
    const data = await readFile(path);
    return { path, bytes: data.length, sha256: createHash('sha256').update(data).digest('hex') };
  }));
}
async function build() {
  await mkdir(output, { recursive: true });
  await cp('src', join(output, 'dist'), { recursive: true });
  const title = option('title', manifest.name);
  const escape = (value) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
  await writeFile(join(output, 'index.html'), `<!doctype html><html lang="en"><meta charset="utf-8"><title>${escape(title)}</title><h1>${escape(title)}</h1><pre id="output"></pre><script type="module">import * as data from './dist/index.js'; document.querySelector('#output').textContent = JSON.stringify(data, null, 2);</script></html>\n`);
  await save('build.json', { name: manifest.name, mode: option('mode', 'development'), files: await inventory() });
}
async function syntax() {
  for (const path of (await files('src')).filter((path) => /\.[cm]?js$/.test(path))) {
    const result = spawnSync(process.execPath, ['--check', path], { stdio: 'inherit' });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`Syntax check failed: ${path}`);
  }
  log('Source syntax is valid.');
}
async function runTests() {
  const result = spawnSync(process.execPath, ['--test', 'test/workspace.test.js'], { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error('Tests failed.');
}

if (task === 'clean') {
  await rm(output, { recursive: true, force: true });
  log('Removed generated files.');
} else if (task === 'build' || task.startsWith('build:') || task.endsWith(':build')) {
  await build();
} else if (['dev', 'start', 'preview', 'storybook'].includes(task)) {
  await build();
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://localhost');
      if (url.pathname === '/health') {
        response.setHeader('Content-Type', 'application/json');
        response.end(JSON.stringify({ status: 'ok', workspace: manifest.name }));
        return;
      }
      const path = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
      if (path !== 'index.html' && path !== 'dist/index.js') {
        response.writeHead(404).end('Not found');
        return;
      }
      response.setHeader('Content-Type', path.endsWith('.js') ? 'text/javascript' : 'text/html');
      response.end(await readFile(join(output, path)));
    } catch (error) {
      response.writeHead(500).end('Unable to read build output');
      console.error(error);
    }
  });
  const port = Number(option('port', '0'));
  server.on('error', (error) => { console.error(error); process.exitCode = 1; });
  server.listen(port, '127.0.0.1', () => log(`Serving http://127.0.0.1:${server.address().port}`));
  let rebuilding = Promise.resolve();
  const watcher = task === 'dev' ? watch('src', () => {
    rebuilding = rebuilding.then(build).catch(console.error);
  }) : undefined;
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => {
    watcher?.close();
    server.close();
    server.closeAllConnections();
  });
} else if (task === 'test:watch') {
  await runTests();
  const watcher = watch('src', () => runTests().catch(console.error));
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => watcher.close());
} else if (task === 'test' || task.startsWith('test:')) {
  await runTests();
} else if (['lint', 'check', 'check:syntax', 'validate', 'check:generated', 'check:links'].includes(task)) {
  await syntax();
  if (task === 'lint') {
    for (const path of (await files('src')).filter((path) => path.endsWith('.js'))) {
      if (/[^\S\n]+$/m.test(await readFile(path, 'utf8'))) throw new Error(`Trailing whitespace: ${path}`);
    }
  }
} else if (task.startsWith('format')) {
  for (const path of (await files('.')).filter((path) => path.endsWith('.json'))) {
    const current = await readFile(path, 'utf8');
    const formatted = JSON.stringify(JSON.parse(current), null, 2) + '\n';
    if (task === 'format:check' && current !== formatted) throw new Error(`Needs formatting: ${path}`);
    if (task === 'format') await writeFile(path, formatted);
  }
  log('JSON formatting completed.');
} else if (task === 'demo:fail') {
  throw new Error('Intentional failure for exit-code testing.');
} else if (task === 'bench' || task === 'demo:slow') {
  const count = Number(option('iterations', '10000'));
  if (!Number.isInteger(count) || count < 1 || count > 1000000) throw new Error('Invalid iteration count');
  const start = performance.now();
  for (let i = 0; i < count; i++) createHash('sha256').update(`${manifest.name}:${i}`).digest('hex');
  await save('benchmark.json', { iterations: count, elapsedMs: performance.now() - start });
} else if (task === 'demo:stderr') {
  console.error('Diagnostic output: writing a source inventory.');
  await save('inventory.json', await inventory());
} else if (task.startsWith('db:') || task === 'seed') {
  const path = join(output, 'database.json');
  let database = { schemaVersion: 1, users: [] };
  try { database = JSON.parse(await readFile(path, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (task === 'db:reset') database = { schemaVersion: 1, users: [] };
  if (task === 'db:migrate') database.schemaVersion = 2;
  if (task === 'db:seed' || task === 'seed') database.users = Array.from({ length: 10 }, (_, i) => ({ id: i + 1, name: `User ${i + 1}` }));
  await save('database.json', database);
} else if (['generate', 'tokens:generate', 'schema:generate', 'openapi:generate'].includes(task)) {
  await save('generated.json', { workspace: manifest.name, exports: Object.keys(await import(resolve('src/index.js'))), dependencies: manifest.dependencies ?? {}, files: await inventory() });
} else if (['jobs:replay', 'queue:drain', 'fixtures:replay'].includes(task)) {
  const path = join(output, 'queue.json');
  let queue;
  try { queue = JSON.parse(await readFile(path, 'utf8')); } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    queue = Array.from({ length: 5 }, (_, id) => ({ id, payload: `Job ${id}` }));
  }
  await save('processed-jobs.json', queue.map((job) => ({ ...job, digest: createHash('sha256').update(job.payload).digest('hex') })));
  await save('queue.json', []);
} else if (['analyze', 'inventory'].includes(task)) {
  await save(option('report', 'inventory.json'), await inventory());
} else {
  throw new Error(`Unknown task: ${task}`);
}
