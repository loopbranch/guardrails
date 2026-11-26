import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import { eslintConfig, loadRules } from './eslint.mjs';

const FORMATTING_RULES = ['quotes', 'indent', 'semi', 'max-len', 'comma-dangle', 'object-curly-spacing'];

test('源码车道带复杂度与函数行数阈值', () => {
  const config = eslintConfig({ language: 'ts', files: ['**/*.ts'], environment: {}, typeAware: true });
  const source = config.find((entry) => entry.name === 'standards/source:ts');
  assert.equal(source.rules.complexity[1], 20);
  assert.equal(source.rules['aigc/cmetrics-complexity'][1], 20);
  assert.equal(source.rules['max-lines-per-function'][1].max, 100);
  assert.equal(source.rules['@typescript-eslint/no-explicit-any'], 'error');
  assert.equal(config.find((entry) => entry.name === 'standards/type-aware:ts').rules['@typescript-eslint/prefer-optional-chain'], 'error');
});

test('格式类规则不进入 ESLint', () => {
  const rules = loadRules('ts');
  for (const name of FORMATTING_RULES) {
    assert.equal(Object.hasOwn(rules.style, name), false, `${name} 应由 Prettier 负责`);
    assert.equal(Object.hasOwn(rules.codecheck, name), false, `${name} 应由 Prettier 负责`);
  }
  assert.ok(rules.formattingRuleNames.length >= 10);
});

test('js 车道不带类型感知', () => {
  const config = eslintConfig({ language: 'js', files: ['**/*.mjs'], environment: {}, typeAware: false });
  assert.equal(
    config.some((entry) => entry.name === 'standards/type-aware:js'),
    false,
  );
});

test('CodeCheck 数据完整分档', () => {
  const catalog = JSON.parse(readFileSync(new URL('../../rules/languages/ts/codecheck.json', import.meta.url), 'utf8'));
  assert.equal(catalog.rules.length, 98);
  const counts = catalog.rules.reduce((accumulator, rule) => {
    accumulator[rule.category] = (accumulator[rule.category] ?? 0) + 1;
    return accumulator;
  }, {});
  assert.deepEqual(counts, { defect: 83, metric: 4, checklist: 7, 'covered-by': 2, 'not-applicable': 2 });
  const metrics = catalog.rules.filter((rule) => rule.category === 'metric').map((rule) => rule.metric);
  assert.deepEqual([...new Set(metrics)].sort(), ['condition-width', 'depth', 'function-lines']);
});

test('车道可按需装配', () => {
  const config = eslintConfig({ language: 'ts', files: ['**/*.tsx'], environment: {}, lanes: ['react', 'web-style'] });
  const names = config.map((entry) => entry.name);
  assert.ok(names.includes('standards/react'));
  assert.ok(names.includes('standards/web-style'));
  assert.equal(
    config.some((entry) => entry.name === 'standards/test'),
    false,
  );
});
