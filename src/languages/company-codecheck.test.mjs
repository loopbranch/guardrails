import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const data = JSON.parse(readFileSync(new URL('../../rules/languages/ts/company-codecheck.json', import.meta.url), 'utf8'));

test('公司规范 97 条规则全部映射到目录条目', () => {
  assert.equal(data.rules.length, 97);
  assert.deepEqual(data.unmappedCompanyRules, []);
  for (const rule of data.rules) {
    assert.match(rule.id, /^G\.|^\w+.*_|^\[/u);
    assert.ok(rule.catalogId, `${rule.id} 缺少目录映射`);
    assert.ok(rule.sections.length > 0);
  }
});

test('状态分布与差异说明保持稳定', () => {
  const counts = data.rules.reduce((accumulator, rule) => {
    accumulator[rule.status] = (accumulator[rule.status] ?? 0) + 1;
    return accumulator;
  }, {});
  assert.deepEqual(counts, { covered: 87, difference: 7, conditional: 3 });
  const differences = data.rules.filter((rule) => rule.difference !== undefined);
  assert.ok(differences.length >= 7, '差异条目应保留口径说明');
});

test('目录中只有 ES6+ 语法一条没有公司条文来源', () => {
  assert.deepEqual(data.catalogRulesWithoutCompanySource, ['CC-098']);
});
