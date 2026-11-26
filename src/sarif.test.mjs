import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSarif, metricResult, verdictOf } from '../src/sarif.mjs';
import { assertLanguage } from '../src/registry.mjs';

test('缺陷与度量都产出 SARIF result', () => {
  const findings = [{ ruleId: 'std/format', level: 'error', file: 'a.ts', message: '格式不一致', fix: 'prettier --write a.ts' }];
  const sarif = buildSarif({ toolName: 'std', toolVersion: '0.0.0', findings, skipped: [] });
  assert.equal(sarif.version, '2.1.0');
  assert.equal(sarif.runs[0].tool.driver.name, 'std');
  assert.equal(sarif.runs[0].results[0].ruleId, 'std/format');
  assert.equal(sarif.runs[0].results[0].fixes[0].description.text, 'prettier --write a.ts');

  assert.equal(verdictOf({ findings: [], unsupported: false }), 'pass');
  assert.equal(verdictOf({ findings, unsupported: false }), 'fail');
  assert.equal(verdictOf({ findings: [], unsupported: true }), 'unsupported');
});

test('度量结果携带数值、阈值与单位', () => {
  const result = metricResult({
    ruleId: 'std/metric/complexity',
    file: 'a.ts',
    line: 3,
    metric: 'complexity',
    value: 24,
    threshold: 20,
    unit: 'count',
  });
  assert.equal(result.level, 'error');
  assert.deepEqual(result.properties, { metric: 'complexity', value: 24, threshold: 20, unit: 'count' });
  assert.match(result.message.text, /阈值 20/u);
});

test('unsupported 必须带原因，缺省能力会被拒绝', () => {
  const base = {
    language: 'demo',
    files: ['**/*.demo'],
    format: { engine: 'prettier' },
    lint: { state: 'unsupported', reason: '无 lint 口径' },
    codecheck: {
      defect: { from: 'lint' },
      metrics: { state: 'unsupported', reason: '无度量口径' },
    },
  };
  assertLanguage(base);

  assert.throws(() => assertLanguage({ ...base, lint: { state: 'unsupported' } }), /reason/u);
  assert.throws(() => assertLanguage({ ...base, lint: undefined }), /unsupported/u);
  assert.throws(
    () => assertLanguage({ ...base, codecheck: { defect: { from: 'lint' }, metrics: { engine: 'size-shape', ids: ['nope'] } } }),
    /未知指标/u,
  );
});
