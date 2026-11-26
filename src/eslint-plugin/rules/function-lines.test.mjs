import { createRuleTester } from './rule-tester.mjs';
import { functionLines } from './function-lines.mjs';

const build = (statements) =>
  ['const fn = () => {', ...Array.from({ length: statements }, (_, index) => `  const value${index} = ${index};`), '};'].join('\n');
const parameterized = (own, params) =>
  [
    'const fn = async (value: {',
    ...Array.from({ length: params }, (_, index) => `  field${index}: string;`),
    '}) => {',
    ...Array.from({ length: own }, (_, index) => `  const value${index} = ${index};`),
    '};',
  ].join('\n');
const nested = (own, inner) =>
  [
    'const fn = () => {',
    ...Array.from({ length: own }, (_, index) => `  const value${index} = ${index};`),
    '  const inner = () => {',
    ...Array.from({ length: inner }, (_, index) => `    innerValue${index}();`),
    '  };',
    '  inner();',
    '};',
  ].join('\n');

createRuleTester().run('function-lines', functionLines, {
  valid: [
    { code: build(96), options: [{ max: 100 }] },
    { code: nested(93, 90), options: [{ max: 100 }] },
    { code: parameterized(78, 16), options: [{ max: 100 }] },
    { code: ['const fn = () => {', '  // 注释不计入', '  /* 块注释也不计入 */', '  run();', '};'].join('\n'), options: [{ max: 100 }] },
  ],
  invalid: [
    { code: build(97), options: [{ max: 100 }], errors: [{ messageId: 'tooLong' }] },
    { code: nested(97, 0), options: [{ max: 100 }], errors: [{ messageId: 'tooLong' }] },
    { code: nested(93, 150), options: [{ max: 100 }], errors: [{ messageId: 'tooLong' }] },
    { code: parameterized(80, 16), options: [{ max: 100 }], errors: [{ messageId: 'tooLong' }] },
    { code: build(97), options: [{ max: 50 }], errors: [{ messageId: 'tooLong' }] },
  ],
});
