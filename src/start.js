'use strict';
const http = require('http');
const { spawn } = require('child_process');

const MAX_PORT = 65535;
const DEFAULT_PORT = 3000;

function resolveBasePort(env = process.env) {
  const raw = env && env.PORT;
  if (raw === undefined || raw === null || `${raw}`.trim() === '') {
    return DEFAULT_PORT;
  }
  const text = `${raw}`.trim();
  if (!/^\d+$/.test(text)) {
    return DEFAULT_PORT;
  }
  const parsed = Number.parseInt(text, 10);
  if (parsed < 1 || parsed > MAX_PORT) {
    return DEFAULT_PORT;
  }
  return parsed;
}

function browserCommand(url, platform) {
  if (platform === 'win32') {
    return { command: 'cmd', args: ['/c', 'start', '', url] };
  }
  if (platform === 'darwin') {
    return { command: 'open', args: [url] };
  }
  return { command: 'xdg-open', args: [url] };
}

function openBrowser(url, {
  platform = process.platform,
  spawnFn = spawn,
  onWarning = () => {},
} = {}) {
  const { command, args } = browserCommand(url, platform);
  let warned = false;
  const warn = (detail) => {
    if (warned) {
      return;
    }
    warned = true;
    onWarning(`Impossibile aprire il browser su ${url}: ${detail}. Apri manualmente ${url}`);
  };

  try {
    const child = spawnFn(command, args, { stdio: 'ignore', detached: true });
    if (child && typeof child.once === 'function') {
      child.once('error', (err) => warn(err.message));
      child.once('close', (code) => {
        if (code !== 0 && code !== null) {
          warn(`comando terminato con codice ${code}`);
        }
      });
    }
    if (child && typeof child.unref === 'function') {
      child.unref();
    }
  } catch (err) {
    warn(err.message);
  }
}

function start({
  app,
  basePort = DEFAULT_PORT,
  maxPort = MAX_PORT,
  logger = console,
  openBrowserFn = openBrowser,
  exit = (code) => process.exit(code),
} = {}) {
  const server = http.createServer(app);
  let port = basePort;

  const attempt = () => server.listen(port);

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE' && port < maxPort) {
      port += 1;
      attempt();
      return;
    }
    if (err.code === 'EADDRINUSE') {
      logger.error(`Nessuna porta libera tra ${basePort} e ${maxPort}`);
    } else {
      logger.error(`Errore avvio server: ${err.message}`);
    }
    exit(1);
  });

  server.once('listening', () => {
    const actualPort = server.address().port;
    const url = `http://localhost:${actualPort}`;
    logger.log(`EARS Navigator listening on ${url}`);
    openBrowserFn(url, {
      onWarning: (message) => logger.warn(message),
    });
  });

  attempt();
  return server;
}

module.exports = {
  MAX_PORT,
  DEFAULT_PORT,
  resolveBasePort,
  browserCommand,
  openBrowser,
  start,
};
