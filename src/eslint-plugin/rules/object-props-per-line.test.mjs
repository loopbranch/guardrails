import { createRuleTester } from './rule-tester.mjs';
import { objectPropsPerLine } from './object-props-per-line.mjs';

createRuleTester().run('object-props-per-line', objectPropsPerLine, {
  valid: [
    'const x = { a: 1, b: 2, c: 3, d: 4 };',
    'const x = {\n  a: 1,\n  b: 2,\n  c: 3,\n  d: 4,\n  e: 5,\n};',
    'const { a, b, c, d, e } = obj;',
  ],
  invalid: [{ code: 'const x = { a: 1, b: 2, c: 3, d: 4, e: 5 };', errors: [{ messageId: 'tooMany' }] }],
});
