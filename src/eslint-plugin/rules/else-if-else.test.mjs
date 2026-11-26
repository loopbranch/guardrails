import { createRuleTester } from './rule-tester.mjs';
import { elseIfElse } from './else-if-else.mjs';

createRuleTester().run('else-if-else', elseIfElse, {
  valid: [
    'if (a) { f(); } else { g(); }',
    'if (a) { f(); } else if (b) { g(); } else { h(); }',
    'if (a) { return f(); }\nif (b) { return g(); }',
  ],
  invalid: [{ code: 'if (a) { f(); } else if (b) { g(); }', errors: [{ messageId: 'missingElse' }] }],
});
