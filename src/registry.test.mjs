import { test } from 'node:test';
import assert from 'node:assert/strict';
import { capabilityMatrix, effectiveThreshold, loadLanguages, loadProfile, resolveLanguage } from '../src/registry.mjs';

const languages = loadLanguages();

test('能力矩阵覆盖七种语言且缺失能力显式 unsupported', () => {
  const matrix = capabilityMatrix(languages);
  assert.deepEqual(matrix.map((entry) => entry.language).sort(), ['js', 'json', 'md', 'scss', 'sql', 'ts', 'yaml']);
  const scss = matrix.find((entry) => entry.language === 'scss');
  assert.equal(scss.metrics.state, 'unsupported');
  assert.match(scss.metrics.reason, /SCSS/u);
  const tidy = matrix.find((entry) => entry.language === 'json');
  assert.equal(tidy.format.engine, 'prettier');
  assert.equal(tidy.lint.state, 'unsupported');
});

test('文件只归属一个语言', () => {
  assert.equal(resolveLanguage(languages, 'apps/aigc-web/src/main.tsx').language, 'ts');
  assert.equal(resolveLanguage(languages, 'scripts/dev.mjs').language, 'js');
  assert.equal(resolveLanguage(languages, 'apps/aigc-web/src/page.scss').language, 'scss');
  assert.equal(resolveLanguage(languages, 'apps/aigc-web/src/plain.css').language, 'scss');
  assert.equal(resolveLanguage(languages, 'sql/postgresql/20260101/aigc_service_ddl.sql').language, 'sql');
  assert.equal(resolveLanguage(languages, 'package.json').language, 'json');
  assert.equal(resolveLanguage(languages, 'control/config.yaml').language, 'yaml');
  assert.equal(resolveLanguage(languages, 'README.md').language, 'md');
  assert.equal(resolveLanguage(languages, 'apps/aigc-web/src/logo.png'), undefined);
});

test('阈值覆盖只允许收紧', () => {
  assert.equal(effectiveThreshold(20, undefined), 20);
  assert.equal(effectiveThreshold(20, 30), 20);
  assert.equal(effectiveThreshold(20, 15), 15);
});

test('strict profile 保留迁移前的阈值', () => {
  const profile = loadProfile('strict');
  assert.equal(profile.metrics.ts.complexity, 20);
  assert.equal(profile.metrics.js['function-lines'], 100);
  assert.equal(profile.metrics.ts.depth, 4);
});
