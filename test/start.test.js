'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const http = require('node:http');
const net = require('node:net');
const express = require('express');
const {
  resolveBasePort,
  openBrowser,
  start,
} = require('../src/start');

function makeLogger() {
  const lines = { log: [], warn: [], error: [] };
  return {
    lines,
    log: (message) => lines.log.push(message),
    warn: (message) => lines.warn.push(message),
    error: (message) => lines.error.push(message),
  };
}

function makeApp() {
  const app = express();
  app.get('/api/projects', (req, res) => res.json({ projects: ['probe'] }));
  return app;
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

function closeHttp(server) {
  return new Promise((resolve) => {
    if (!server.listening) {
      resolve();
      return;
    }
    server.close(() => resolve());
  });
}

function waitForListening(server) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout waiting for listening')), 2000);
    server.once('listening', () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

function httpGet(port, urlPath) {
  return new Promise((resolve, reject) => {
    const request = http.get({ host: '127.0.0.1', port, path: urlPath }, (response) => {
      let body = '';
      response.on('data', (chunk) => { body += chunk; });
      response.on('end', () => resolve({
        status: response.statusCode,
        body,
      }));
    });
    request.on('error', reject);
  });
}

async function findFreeBlock(count, startAt = 43000) {
  for (let base = startAt; base < 60000; base += 7) {
    const servers = [];
    let free = true;
    for (let offset = 0; offset < count; offset += 1) {
      try {
        servers.push(await listenOn(base + offset));
      } catch {
        free = false;
        break;
      }
    }
    await Promise.all(servers.map(closeNet));
    if (free) {
      return base;
    }
  }
  throw new Error('no free contiguous port block found');
}

function fakeChild() {
  const child = new EventEmitter();
  child.unref = () => {};
  return child;
}

test('C1 — resolveBasePort uses PORT or falls back to 3000', () => {
  assert.equal(resolveBasePort({}), 3000);
  assert.equal(resolveBasePort({ PORT: '4100' }), 4100);
  assert.equal(resolveBasePort({ PORT: 'abc' }), 3000);
  assert.equal(resolveBasePort({ PORT: '0' }), 3000);
  assert.equal(resolveBasePort({ PORT: '70000' }), 3000);
  assert.equal(resolveBasePort({ PORT: '' }), 3000);
});

test('R1.AC1 — starts on the base port when it is free', async () => {
  const base = await findFreeBlock(1, 43100);
  const logger = makeLogger();
  let opened;
  const server = start({
    app: makeApp(),
    basePort: base,
    logger,
    openBrowserFn: (url) => { opened = url; },
  });

  try {
    await waitForListening(server);
    assert.equal(server.address().port, base);
    assert.equal(opened, `http://localhost:${base}`);
    assert.ok(logger.lines.log.some((line) => line.includes(`localhost:${base}`)));
  } finally {
    await closeHttp(server);
  }
});

test('R1.AC2 — increments to the first free port when the base is occupied', async () => {
  const base = await findFreeBlock(3, 43200);
  const blockers = [await listenOn(base)];
  let server;

  try {
    server = start({ app: makeApp(), basePort: base, logger: makeLogger(), openBrowserFn: () => {} });
    await waitForListening(server);
    assert.equal(server.address().port, base + 1);
    await closeHttp(server);

    blockers.push(await listenOn(base + 1));
    server = start({ app: makeApp(), basePort: base, logger: makeLogger(), openBrowserFn: () => {} });
    await waitForListening(server);
    assert.equal(server.address().port, base + 2);
  } finally {
    if (server) {
      await closeHttp(server);
    }
    for (const blocker of blockers) {
      await closeNet(blocker);
    }
  }
});

test('R1.AC4 — exits when no port is available in the range', async () => {
  const base = await findFreeBlock(2, 43300);
  const blockers = [await listenOn(base), await listenOn(base + 1)];
  const logger = makeLogger();
  let exitCode;
  let server;

  const exited = new Promise((resolve) => {
    server = start({
      app: makeApp(),
      basePort: base,
      maxPort: base + 1,
      logger,
      openBrowserFn: () => {},
      exit: (code) => {
        exitCode = code;
        resolve();
      },
    });
  });

  try {
    await exited;
    assert.equal(exitCode, 1);
    assert.ok(logger.lines.error.some((line) => line.includes('Nessuna porta libera')));
    assert.equal(server.listening, false);
  } finally {
    for (const blocker of blockers) {
      await closeNet(blocker);
    }
  }
});

test('R1.AC5 — serves the app on the fallback port', async () => {
  const base = await findFreeBlock(2, 43400);
  const blocker = await listenOn(base);
  const logger = makeLogger();
  const server = start({
    app: makeApp(),
    basePort: base,
    logger,
    openBrowserFn: () => {},
  });

  try {
    await waitForListening(server);
    const port = server.address().port;
    assert.equal(port, base + 1);
    const response = await httpGet(port, '/api/projects');
    assert.equal(response.status, 200);
    assert.deepEqual(JSON.parse(response.body), { projects: ['probe'] });
    assert.ok(logger.lines.log.some((line) => line.includes(`localhost:${port}`)));
  } finally {
    await closeHttp(server);
    await closeNet(blocker);
  }
});

test('R2.AC2 — openBrowser emits a single warning on failure', () => {
  const warnings = [];

  const errored = fakeChild();
  openBrowser('http://localhost:4455', {
    platform: 'linux',
    spawnFn: () => errored,
    onWarning: (message) => warnings.push(message),
  });
  errored.emit('error', new Error('spawn xdg-open ENOENT'));
  errored.emit('close', -2);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /localhost:4455/);

  warnings.length = 0;
  const failed = fakeChild();
  openBrowser('http://localhost:4456', {
    platform: 'linux',
    spawnFn: () => failed,
    onWarning: (message) => warnings.push(message),
  });
  failed.emit('close', 1);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /localhost:4456/);

  warnings.length = 0;
  const succeeded = fakeChild();
  openBrowser('http://localhost:4457', {
    platform: 'linux',
    spawnFn: () => succeeded,
    onWarning: (message) => warnings.push(message),
  });
  succeeded.emit('close', 0);
  assert.equal(warnings.length, 0);

  openBrowser('http://localhost:4458', {
    platform: 'linux',
    spawnFn: () => { throw new Error('boom'); },
    onWarning: (message) => warnings.push(message),
  });
  assert.equal(warnings.length, 1);
});

test('C4 — selects the browser command for each platform', () => {
  const calls = [];
  const spawnFn = (command, args) => {
    calls.push({ command, args });
    return fakeChild();
  };

  openBrowser('http://localhost:4455', { platform: 'win32', spawnFn, onWarning: () => {} });
  openBrowser('http://localhost:4455', { platform: 'darwin', spawnFn, onWarning: () => {} });
  openBrowser('http://localhost:4455', { platform: 'linux', spawnFn, onWarning: () => {} });

  assert.deepEqual(calls[0], { command: 'cmd', args: ['/c', 'start', '', 'http://localhost:4455'] });
  assert.deepEqual(calls[1], { command: 'open', args: ['http://localhost:4455'] });
  assert.deepEqual(calls[2], { command: 'xdg-open', args: ['http://localhost:4455'] });
});

test('R2.AC3 — a browser warning leaves the server reachable', async () => {
  const base = await findFreeBlock(1, 43500);
  const logger = makeLogger();
  let opened;
  const server = start({
    app: makeApp(),
    basePort: base,
    logger,
    openBrowserFn: (url, { onWarning }) => {
      opened = url;
      onWarning(`warning ${url}`);
    },
  });

  try {
    await waitForListening(server);
    const port = server.address().port;
    assert.equal(opened, `http://localhost:${port}`);
    assert.ok(logger.lines.warn.some((line) => line.includes(`localhost:${port}`)));
    const response = await httpGet(port, '/api/projects');
    assert.equal(response.status, 200);
  } finally {
    await closeHttp(server);
  }
});
