'use strict';
const express = require('express');
const path    = require('path');
const fs      = require('fs');
const { parseRequirements } = require('./src/parser');
const { resolveBasePort, start } = require('./src/start');

const app  = express();

const SPECS_DIR = process.env.WALDEN_SPECS_DIR
  ? path.resolve(process.env.WALDEN_SPECS_DIR)
  : path.resolve(process.cwd(), '.walden', 'specs');
const NAME_RE   = /^[a-zA-Z0-9_-]+$/;

// Static frontend
app.use(express.static(path.join(__dirname, 'public')));

// GET /api/projects
app.get('/api/projects', (req, res) => {
  try {
    const entries = fs.readdirSync(SPECS_DIR, { withFileTypes: true });
    const projects = entries
      .filter(e => e.isDirectory())
      .map(e => e.name)
      .filter(name => {
        try {
          fs.accessSync(path.join(SPECS_DIR, name, 'requirements.md'));
          return true;
        } catch { return false; }
      });
    res.json({ projects });
  } catch (err) {
    res.status(500).json({ error: 'Cannot read specs directory', detail: err.message });
  }
});

// GET /api/projects/:name/requirements
app.get('/api/projects/:name/requirements', (req, res) => {
  const { name } = req.params;

  if (!NAME_RE.test(name)) {
    return res.status(400).json({ error: 'Invalid project name' });
  }

  const reqFile = path.join(SPECS_DIR, name, 'requirements.md');

  try {
    fs.accessSync(reqFile);
  } catch {
    return res.status(404).json({ error: `Project not found: ${name}` });
  }

  try {
    const payload = parseRequirements(reqFile);
    res.json({ project: name, ...payload });
  } catch (err) {
    res.status(500).json({ error: 'Parse error', detail: err.message });
  }
});

const server = start({ app, basePort: resolveBasePort(process.env) });
console.log(`Specs dir: ${SPECS_DIR}`);

module.exports = server;
