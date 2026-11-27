import { test } from 'node:test';
import assert from 'node:assert/strict';
import { verdictOfStep } from './step.mjs';

// `.md` 只支持 format：lint 与 metrics 都是 unsupported，正好覆盖“按语言聚合”的两种边界。
const mdSkipped = [
  { language: 'md', task: 'lint', reason: 'Markdown 只做格式化，不设缺陷规则' },
  { language: 'md', task: 'metrics', reason: 'Markdown 无规模或结构度量' },
];
const errorFinding = [{ ruleId: 'std/lint', level: 'error', file: 'a.ts', message: '语法问题' }];

test('全部命中的语言都不支持该任务时才判 unsupported', () => {
  assert.equal(verdictOfStep({ task: 'codecheck', files: ['README.md'], findings: [], skipped: mdSkipped }), 'unsupported');
});

test('混合语言只跳过一部分时按已执行部分判 pass，跳过项不影响结论', () => {
  assert.equal(verdictOfStep({ task: 'codecheck', files: ['README.md', 'a.ts'], findings: [], skipped: mdSkipped }), 'pass');
});

test('混合语言已执行部分有 error 级违例时判 fail', () => {
  assert.equal(verdictOfStep({ task: 'codecheck', files: ['README.md', 'a.ts'], findings: errorFinding, skipped: mdSkipped }), 'fail');
});

test('语言本身支持该任务时不因其它语言的跳过项而判 unsupported', () => {
  assert.equal(verdictOfStep({ task: 'format', files: ['README.md', 'a.ts'], findings: [], skipped: [] }), 'pass');
});

test('仅存在跳过的子任务不足以判 unsupported（.md 仍执行 format）', () => {
  assert.equal(verdictOfStep({ task: 'format', files: ['README.md'], findings: [], skipped: [] }), 'pass');
});
