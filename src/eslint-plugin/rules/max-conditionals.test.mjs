import { createRuleTester } from './rule-tester.mjs';
import { maxConditionals } from './max-conditionals.mjs';

createRuleTester().run('max-conditionals', maxConditionals, {
  valid: ['if (a && b && c) {}', 'if (a || b) {}', 'while (a && b && c) {}', 'const x = a && b && c ? 1 : 2;', 'if (!(a && b && c)) {}'],
  invalid: [
    { code: 'if (a && b && c && d) {}', errors: [{ messageId: 'tooMany' }] },
    { code: 'const x = a || b || c || d ? 1 : 2;', errors: [{ messageId: 'tooMany' }] },
    { code: 'if (a || !(b && c && d)) {}', errors: [{ messageId: 'tooMany' }] },
    { code: 'if (!(a && b && c && d)) {}', errors: [{ messageId: 'tooMany' }] },
  ],
});
