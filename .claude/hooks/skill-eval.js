#!/usr/bin/env node
// .claude/hooks/skill-eval.js
// Analyzes prompts and suggests relevant Azmyra skills

const fs = require('fs');
const path = require('path');

const RULES_PATH = path.join(__dirname, 'skill-rules.json');
const SKILLS_DIR = path.join(__dirname, '..', 'skills');

const CONFIDENCE_WEIGHTS = {
  keyword: 2,
  keywordPattern: 3,
  pathPattern: 4,
  directoryMatch: 5,
  intentPattern: 4,
};

const THRESHOLD = 6;

function loadRules() {
  try {
    return JSON.parse(fs.readFileSync(RULES_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function extractPrompt(input) {
  try {
    const parsed = JSON.parse(input);
    return (parsed.prompt || parsed.message || '').toLowerCase();
  } catch {
    return input.toLowerCase();
  }
}

function extractFilePaths(prompt) {
  const pathRegex = /(?:src\/|components\/|lib\/|prisma\/|meeting-bot\/|\.claude\/)[\w\-/.]+\.\w+/g;
  return prompt.match(pathRegex) || [];
}

function scoreSkill(skillName, rules, prompt, filePaths) {
  const skill = rules[skillName];
  if (!skill) return { score: 0, reasons: [] };

  let score = 0;
  const reasons = [];
  const triggers = skill.triggers || {};

  // Keyword matching
  (triggers.keywords || []).forEach(kw => {
    if (prompt.includes(kw.toLowerCase())) {
      score += CONFIDENCE_WEIGHTS.keyword;
      reasons.push(`keyword "${kw}"`);
    }
  });

  // Keyword pattern matching
  (triggers.keywordPatterns || []).forEach(pattern => {
    if (new RegExp(pattern, 'i').test(prompt)) {
      score += CONFIDENCE_WEIGHTS.keywordPattern;
      reasons.push(`pattern /${pattern}/`);
    }
  });

  // File path matching
  filePaths.forEach(fp => {
    (triggers.pathPatterns || []).forEach(pattern => {
      const regex = new RegExp(pattern.replace(/\*/g, '.*').replace(/\?/g, '.'), 'i');
      if (regex.test(fp)) {
        score += CONFIDENCE_WEIGHTS.pathPattern;
        reasons.push(`file path "${fp}"`);
      }
    });

    const dirMap = skill.directoryMap || {};
    Object.entries(dirMap).forEach(([dir, mapped]) => {
      if (fp.includes(dir)) {
        score += CONFIDENCE_WEIGHTS.directoryMatch;
        reasons.push(`directory "${dir}"`);
      }
    });
  });

  // Intent patterns
  (triggers.intentPatterns || []).forEach(pattern => {
    if (new RegExp(pattern, 'i').test(prompt)) {
      score += CONFIDENCE_WEIGHTS.intentPattern;
      reasons.push(`intent "${pattern}"`);
    }
  });

  // Exclude patterns
  const excludes = skill.excludePatterns || [];
  const excluded = excludes.some(p => new RegExp(p, 'i').test(prompt));
  if (excluded) return { score: 0, reasons: [] };

  return { score, reasons };
}

function getConfidenceLabel(score) {
  if (score >= 12) return 'HIGH';
  if (score >= 8) return 'MEDIUM';
  return 'LOW';
}

function main() {
  const input = fs.readFileSync('/dev/stdin', 'utf8');
  const prompt = extractPrompt(input);
  const filePaths = extractFilePaths(prompt);
  const rules = loadRules();

  const matches = [];

  Object.keys(rules).forEach(skillName => {
    const { score, reasons } = scoreSkill(skillName, rules, prompt, filePaths);
    if (score >= THRESHOLD) {
      matches.push({ skillName, score, reasons, label: getConfidenceLabel(score) });
    }
  });

  if (matches.length === 0) process.exit(0);

  matches.sort((a, b) => b.score - a.score);

  const lines = [
    '━━━ SKILL ACTIVATION SUGGESTED ━━━',
    '',
    `Matched ${matches.length} skill(s) for this task:`,
    '',
  ];

  matches.forEach((m, i) => {
    lines.push(`${i + 1}. ${m.skillName} [${m.label}]`);
    lines.push(`   → Matched: ${m.reasons.slice(0, 3).join(', ')}`);
    lines.push(`   → Load: .claude/skills/${m.skillName}/SKILL.md`);
    lines.push('');
  });

  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const output = JSON.stringify({ feedback: lines.join('\n') });
  process.stderr.write(output + '\n');
  process.exit(0);
}

main();
