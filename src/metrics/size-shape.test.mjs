import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { measureSource, measureFiles, METRIC_NAMES } from './size-shape.mjs';

const ts = createRequire(import.meta.url)('typescript');

const valueOf = (text, metric) => {
  return measureSource(ts, text, 'sample.ts')
    .filter((item) => item.metric === metric)
    .map((item) => item.value);
};

test('圈复杂度按 cmetrics 口径计入 else 与嵌套回调', () => {
  const source = ['const outer = (flag) => {', '  if (flag) {', '    return 1;', '  } else {', '    return 2;', '  }', '};'].join('\n');
  // 1 基础 + if(1) + 纯 else(1) = 3
  assert.equal(valueOf(source, 'complexity')[0], 3);

  const nested = ['const outer = (items) => items.map((item) => { return item ? 1 : 2; });'].join('\n');
  // 1 基础 + 三元(1)，嵌套回调计入外层
  assert.equal(valueOf(nested, 'complexity')[0], 2);
});

test('代码深度统计控制块嵌套层数', () => {
  const source = [
    'const deep = (a, b) => {',
    '  if (a) {',
    '    for (const item of b) {',
    '      while (a) {',
    '        switch (a) { default: break; }',
    '      }',
    '    }',
    '  }',
    '};',
  ].join('\n');
  assert.equal(valueOf(source, 'depth')[0], 4);
});

test('函数行数不计空行与注释', () => {
  // 函数范围从箭头参数开始：() => { / const value = 1; / return value; / }; 共 4 行，注释与空行不计。
  const source = ['const short = () => {', '  // 说明', '', '  const value = 1;', '  return value;', '};'].join('\n');
  assert.equal(valueOf(source, 'function-lines')[0], 4);
});

test('条件子项数展开逻辑表达式', () => {
  const source = ['const decide = (a, b, c, d) => {', '  if (a && b || c || d) {', '    return 1;', '  }', '};'].join('\n');
  assert.equal(valueOf(source, 'condition-width')[0], 4);
});

test('超过阈值才输出 SARIF 结果，并把指标名写成中文', () => {
  const dir = mkdtempSync(join(tmpdir(), 'standards-'));
  const file = join(dir, 'sample.ts');
  const source = ['const decide = (a, b, c, d) => {', '  if (a && b || c || d) {', '    return 1;', '  }', '};'].join('\n');
  writeFileSync(file, source, 'utf8');
  const findings = measureFiles({ files: [file], thresholds: { 'condition-width': 3 }, ids: ['condition-width'] });
  assert.equal(findings.length, 1);
  assert.equal(findings[0].properties.metric, 'condition-width');
  assert.equal(findings[0].properties.value, 4);
  assert.equal(findings[0].level, 'error');
  assert.match(findings[0].message.text, new RegExp(METRIC_NAMES['condition-width'], 'u'));
});
