#!/usr/bin/env node

/**
 * Commit helper script for conventional commits
 * Usage: node scripts/commit.js <type> <message>
 * Example: node scripts/commit.js feat "add dark mode toggle"
 */

const { execSync } = require('child_process');

const args = process.argv.slice(2);
if (args.length < 2) {
  console.log('Usage: node scripts/commit.js <type> <message>');
  console.log('');
  console.log('Types:');
  console.log('  feat      - New feature (minor version bump)');
  console.log('  fix       - Bug fix (patch version bump)');
  console.log('  docs      - Documentation changes');
  console.log('  style     - Code style changes');
  console.log('  refactor  - Code refactoring');
  console.log('  perf      - Performance improvements');
  console.log('  test      - Test additions/changes');
  console.log('  build     - Build system changes');
  console.log('  ci        - CI/CD changes');
  console.log('  chore     - Maintenance tasks');
  console.log('');
  console.log('Examples:');
  console.log('  node scripts/commit.js feat "add user authentication"');
  console.log('  node scripts/commit.js fix "resolve memory leak in player"');
  console.log('  node scripts/commit.js docs "update installation guide"');
  process.exit(1);
}

const [type, ...messageParts] = args;
const message = messageParts.join(' ');

const validTypes = [
  'feat', 'fix', 'docs', 'style', 'refactor',
  'perf', 'test', 'build', 'ci', 'chore'
];

if (!validTypes.includes(type)) {
  console.error(`Invalid commit type: ${type}`);
  console.log(`Valid types: ${validTypes.join(', ')}`);
  process.exit(1);
}

if (!message.trim()) {
  console.error('Commit message cannot be empty');
  process.exit(1);
}

const commitMessage = `${type}: ${message}`;

try {
  execSync(`git add .`, { stdio: 'inherit' });
  execSync(`git commit -m "${commitMessage}"`, { stdio: 'inherit' });
  console.log(`✅ Committed: ${commitMessage}`);
} catch (error) {
  console.error('❌ Commit failed:', error.message);
  process.exit(1);
}