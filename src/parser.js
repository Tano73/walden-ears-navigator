'use strict';
const fs = require('fs');

const RE_GROUP      = /^### (R\d+)\s+(.+)$/;
const RE_USER_STORY = /^\*\*User Story:\*\*\s*(.+)$/;
const RE_AC         = /^\d+\.\s+`(R\d+\.AC\d+)`\s+(.+)$/;

function classifyEARS(text) {
  const t = text.trimStart();
  if (t.startsWith('WHEN'))  return 'event-driven';
  if (t.startsWith('WHILE')) return 'state-driven';
  if (t.startsWith('IF'))    return 'unwanted';
  return 'ubiquitous';
}

function parseRequirements(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
  const lines = raw.split('\n');

  const groups = [];
  let current = null;
  let inAC = false;

  for (const line of lines) {
    const grpMatch = line.match(RE_GROUP);
    if (grpMatch) {
      current = { id: grpMatch[1], title: grpMatch[2].trim(), userStory: '', criteria: [] };
      groups.push(current);
      inAC = false;
      continue;
    }

    if (!current) continue;

    const storyMatch = line.match(RE_USER_STORY);
    if (storyMatch) {
      current.userStory = storyMatch[1].trim();
      continue;
    }

    if (/^#### Acceptance Criteria/.test(line)) {
      inAC = true;
      continue;
    }

    if (inAC) {
      const acMatch = line.match(RE_AC);
      if (acMatch) {
        current.criteria.push({
          id:   acMatch[1],
          type: classifyEARS(acMatch[2]),
          text: acMatch[2].trim(),
        });
      }
    }
  }

  // Compute stats
  const allCriteria = groups.flatMap(g => g.criteria);
  const byType = { 'event-driven': 0, 'state-driven': 0, 'unwanted': 0, 'ubiquitous': 0 };
  const byGroup = {};
  for (const g of groups) {
    byGroup[g.id] = g.criteria.length;
    for (const ac of g.criteria) byType[ac.type] = (byType[ac.type] || 0) + 1;
  }

  return {
    groups,
    stats: { total: allCriteria.length, byType, byGroup },
  };
}

module.exports = { parseRequirements, classifyEARS };
