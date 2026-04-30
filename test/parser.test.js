'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { parseRequirements, classifyEARS } = require('../src/parser');

// Minimal valid requirements.md content with one group and two ACs
const LF_CONTENT = `---
status: approved
---

# Requirements Document

## Requirements

### R1 Test group

**User Story:** As a user, I want something, so that it works.

#### Acceptance Criteria

1. \`R1.AC1\` WHEN the user clicks, the system SHALL respond.
2. \`R1.AC2\` IF an error occurs, THEN the system SHALL show a message.
`;

function writeTmp(content) {
  const file = path.join(os.tmpdir(), `parser-test-${Date.now()}-${Math.random()}.md`);
  fs.writeFileSync(file, content, 'utf8');
  return file;
}

// R1.AC1 — CRLF produces same output as LF
test('R1.AC1 — CRLF file produces same output as LF file', () => {
  const crlfContent = LF_CONTENT.replace(/\n/g, '\r\n');
  const lfFile   = writeTmp(LF_CONTENT);
  const crlfFile = writeTmp(crlfContent);
  try {
    const lfResult   = parseRequirements(lfFile);
    const crlfResult = parseRequirements(crlfFile);
    assert.deepEqual(crlfResult.groups, lfResult.groups);
    assert.deepEqual(crlfResult.stats,  lfResult.stats);
  } finally {
    fs.unlinkSync(lfFile);
    fs.unlinkSync(crlfFile);
  }
});

// R1.AC2 — LF-only file still parses correctly
test('R1.AC2 — LF-only file parses correctly', () => {
  const file = writeTmp(LF_CONTENT);
  try {
    const result = parseRequirements(file);
    assert.equal(result.groups.length, 1);
    assert.equal(result.groups[0].id, 'R1');
    assert.equal(result.groups[0].criteria.length, 2);
    assert.equal(result.stats.total, 2);
  } finally {
    fs.unlinkSync(file);
  }
});

// R1.AC3 — Mixed CRLF+LF file parses correctly
test('R1.AC3 — mixed CRLF+LF file parses correctly', () => {
  // Replace only some newlines with CRLF
  const lines = LF_CONTENT.split('\n');
  const mixed = lines.map((l, i) => (i % 2 === 0 ? l + '\r\n' : l + '\n')).join('');
  const file = writeTmp(mixed);
  try {
    const result = parseRequirements(file);
    assert.equal(result.groups.length, 1);
    assert.equal(result.groups[0].criteria.length, 2);
  } finally {
    fs.unlinkSync(file);
  }
});

// R1.AC4 — Empty file returns empty groups and zeroed stats without error
test('R1.AC4 — empty file returns empty groups and zeroed stats', () => {
  for (const content of ['', '   ', '\r\n\r\n', '\n\n']) {
    const file = writeTmp(content);
    try {
      const result = parseRequirements(file);
      assert.deepEqual(result.groups, []);
      assert.equal(result.stats.total, 0);
    } finally {
      fs.unlinkSync(file);
    }
  }
});

// R2.AC1 — EARS classification is correct on CRLF file
test('R2.AC1 — EARS types are classified correctly from CRLF file', () => {
  const crlfContent = LF_CONTENT.replace(/\n/g, '\r\n');
  const file = writeTmp(crlfContent);
  try {
    const result = parseRequirements(file);
    const [ac1, ac2] = result.groups[0].criteria;
    assert.equal(ac1.type, 'event-driven');
    assert.equal(ac2.type, 'unwanted');
  } finally {
    fs.unlinkSync(file);
  }
});

// R2.AC2 — No trailing \r in AC text when parsed from CRLF file
test('R2.AC2 — AC text contains no trailing \\r characters after parsing CRLF file', () => {
  const crlfContent = LF_CONTENT.replace(/\n/g, '\r\n');
  const file = writeTmp(crlfContent);
  try {
    const result = parseRequirements(file);
    for (const group of result.groups) {
      for (const ac of group.criteria) {
        assert.ok(!ac.text.includes('\r'), `AC ${ac.id} text contains \\r: ${JSON.stringify(ac.text)}`);
      }
    }
  } finally {
    fs.unlinkSync(file);
  }
});
