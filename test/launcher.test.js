'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');

const SCRIPT = path.resolve(__dirname, '..', 'bin', 'ears-navigator');
const POSIX = process.platform !== 'win32';

const REQUIREMENTS = `---
status: approved
---

# Requirements Document

## Requirements

### R1 Probe

**User Story:** As a user, I want a probe, so that it works.

#### Acceptance Criteria

1. \`R1.AC1\` WHEN the probe runs, the system SHALL respond.
`;

function makeProject(parent) {
  const root = fs.mkdtempSync(path.join(parent, 'ears-project-'));
  writeSpecs(root);
  return root;
}

function writeSpecs(root) {
  const specs = path.join(root, '.walden', 'specs', 'probe');
  fs.mkdirSync(specs, { recursive: true });
  fs.writeFileSync(path.join(specs, 'requirements.md'), REQUIREMENTS, 'utf8');
}

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ears-launcher-'));
}

function makeFakeOpener(dir) {
  const binDir = path.join(dir, 'fakebin');
  const urlFile = path.join(dir, 'opened-urls.txt');
  fs.mkdirSync(binDir, { recursive: true });
  const opener = path.join(binDir, 'xdg-open');
  fs.writeFileSync(opener, `#!/bin/sh\nprintf '%s\\n' "$1" >> "${urlFile}"\n`, { mode: 0o755 });
  return { binDir, urlFile };
}

function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

function listenOn(port) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(port, () => resolve(server));
  });
}

function closeNet(server) {
  return new Promise((resolve) => {
    if (!server.listening) {
      resolve();
      return;
    }
    server.close(() => resolve());
  });
}

function httpGet(port, urlPath) {
  return new Promise((resolve, reject) => {
    const request = http.get({ host: '127.0.0.1', port, path: urlPath }, (response) => {
      let body = '';
      response.on('data', (chunk) => { body += chunk; });
      response.on('end', () => resolve({ status: response.statusCode, body }));
    });
    request.on('error', reject);
  });
}

function spawnLauncher({ cwd, args = [], env = {} }) {
  const child = spawn('bash', [SCRIPT, ...args], {
    cwd,
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const output = { stdout: '', stderr: '' };
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (chunk) => { output.stdout += chunk; });
  child.stderr.on('data', (chunk) => { output.stderr += chunk; });
  return { child, output };
}

function waitFor(predicate, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const timer = setInterval(() => {
      if (predicate()) {
        clearInterval(timer);
        resolve();
        return;
      }
      if (Date.now() - started > timeout) {
        clearInterval(timer);
        reject(new Error('timeout waiting for condition'));
      }
    }, 25);
  });
}

function waitForExit(child) {
  if (child.exitCode !== null) {
    return Promise.resolve(child.exitCode);
  }
  return new Promise((resolve) => child.once('exit', (code) => resolve(code)));
}

async function stop(child) {
  if (child.exitCode !== null) {
    return;
  }
  child.kill('SIGTERM');
  const result = await Promise.race([
    waitForExit(child),
    new Promise((resolve) => setTimeout(() => resolve('timeout'), 2000)),
  ]);
  if (result === 'timeout') {
    child.kill('SIGKILL');
    await waitForExit(child);
  }
}

function listeningPort(output) {
  const match = output.stdout.match(/listening on http:\/\/localhost:(\d+)/);
  return match ? Number(match[1]) : null;
}

test('R1.AC6 — launcher reports only the effective URL', { skip: !POSIX }, async () => {
  const project = makeProject(os.tmpdir());
  const temp = makeTempDir();
  const { binDir, urlFile } = makeFakeOpener(temp);
  const base = await findFreePort();
  const blocker = await listenOn(base);
  const { child, output } = spawnLauncher({
    cwd: project,
    env: { PORT: String(base), PATH: `${binDir}:${process.env.PATH}` },
  });

  try {
    await waitFor(() => listeningPort(output) !== null);
    const port = listeningPort(output);
    assert.ok(port > base, `expected fallback port > ${base}, got ${port}`);
    assert.ok(!new RegExp(`localhost:${base}(?!\\d)`).test(output.stdout), 'base URL must not be printed');

    const response = await httpGet(port, '/api/projects');
    assert.equal(response.status, 200);
    assert.ok(JSON.parse(response.body).projects.includes('probe'));

    await waitFor(() => fs.existsSync(urlFile) && fs.readFileSync(urlFile, 'utf8').includes(`http://localhost:${port}`));
  } finally {
    await stop(child);
    await closeNet(blocker);
    fs.rmSync(project, { recursive: true, force: true });
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('R3.AC1 — launcher walks up from a nested directory', { skip: !POSIX }, async () => {
  const project = makeProject(os.tmpdir());
  const nested = path.join(project, 'a', 'b');
  const temp = makeTempDir();
  const { binDir } = makeFakeOpener(temp);
  const port = await findFreePort();
  fs.mkdirSync(nested, { recursive: true });
  const { child, output } = spawnLauncher({
    cwd: nested,
    env: { PORT: String(port), PATH: `${binDir}:${process.env.PATH}` },
  });

  try {
    await waitFor(() => listeningPort(output) !== null);
    assert.ok(output.stdout.includes(`Specs dir : ${project}/.walden/specs`));
  } finally {
    await stop(child);
    fs.rmSync(project, { recursive: true, force: true });
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('R3.AC5 — launcher prefers the nearest ancestor', { skip: !POSIX }, async () => {
  const project = makeProject(os.tmpdir());
  const inner = path.join(project, 'a');
  writeSpecs(inner);
  const nested = path.join(inner, 'b');
  const temp = makeTempDir();
  const { binDir } = makeFakeOpener(temp);
  const port = await findFreePort();
  fs.mkdirSync(nested, { recursive: true });
  const { child, output } = spawnLauncher({
    cwd: nested,
    env: { PORT: String(port), PATH: `${binDir}:${process.env.PATH}` },
  });

  try {
    await waitFor(() => listeningPort(output) !== null);
    assert.ok(output.stdout.includes(`Specs dir : ${inner}/.walden/specs`));
  } finally {
    await stop(child);
    fs.rmSync(project, { recursive: true, force: true });
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('R3.AC2 — launcher fails explicitly when no specs dir is found', { skip: !POSIX }, async () => {
  const temp = makeTempDir();
  const { binDir } = makeFakeOpener(temp);
  const { child, output } = spawnLauncher({
    cwd: temp,
    env: { PORT: String(await findFreePort()), PATH: `${binDir}:${process.env.PATH}` },
  });

  try {
    const code = await waitForExit(child);
    assert.notEqual(code, 0);
    assert.match(output.stderr, /cannot find a Walden specs directory/);
    assert.ok(!output.stdout.includes('listening on http://localhost:'));
  } finally {
    await stop(child);
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('R3.AC3 — launcher honors an explicit project path', { skip: !POSIX }, async () => {
  const project = makeProject(os.tmpdir());
  const temp = makeTempDir();
  const { binDir } = makeFakeOpener(temp);
  const port = await findFreePort();
  const { child, output } = spawnLauncher({
    cwd: temp,
    args: [project],
    env: { PORT: String(port), PATH: `${binDir}:${process.env.PATH}` },
  });

  try {
    await waitFor(() => listeningPort(output) !== null);
    assert.ok(output.stdout.includes(`Specs dir : ${project}/.walden/specs`));
  } finally {
    await stop(child);
    fs.rmSync(project, { recursive: true, force: true });
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('R3.AC6 — launcher rejects a non-existent explicit path', { skip: !POSIX }, async () => {
  const temp = makeTempDir();
  const { binDir } = makeFakeOpener(temp);
  const missing = path.join(temp, 'does-not-exist');
  const { child, output } = spawnLauncher({
    cwd: temp,
    args: [missing],
    env: { PORT: String(await findFreePort()), PATH: `${binDir}:${process.env.PATH}` },
  });

  try {
    const code = await waitForExit(child);
    assert.notEqual(code, 0);
    assert.match(output.stderr, /does not exist or is not a readable directory/);
    assert.ok(!output.stdout.includes('listening on http://localhost:'));
  } finally {
    await stop(child);
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('R3.AC4 — launcher resolves its own path through a symlink', { skip: !POSIX }, async () => {
  const project = makeProject(os.tmpdir());
  const temp = makeTempDir();
  const { binDir } = makeFakeOpener(temp);
  const link = path.join(temp, 'ears-navigator');
  fs.symlinkSync(SCRIPT, link);
  const port = await findFreePort();
  const child = spawn('bash', [link], {
    cwd: project,
    env: { ...process.env, PORT: String(port), PATH: `${binDir}:${process.env.PATH}` },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const output = { stdout: '', stderr: '' };
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (chunk) => { output.stdout += chunk; });
  child.stderr.on('data', (chunk) => { output.stderr += chunk; });

  try {
    await waitFor(() => listeningPort(output) !== null);
    assert.ok(output.stdout.includes(`Specs dir : ${project}/.walden/specs`));
  } finally {
    await stop(child);
    fs.rmSync(project, { recursive: true, force: true });
    fs.rmSync(temp, { recursive: true, force: true });
  }
});
