import { createRuleTester } from './rule-tester.mjs';
import { consistentReturn } from './consistent-return.mjs';

createRuleTester().run('consistent-return', consistentReturn, {
  valid: [
    'function f(x) { if (x) { return "a"; } return "b"; }',
    'function f(x) { if (x) { return; } }',
    'function f(x): string | undefined { if (x) { return "a"; } return undefined; }',
    'useEffect(() => { if (x) { return () => cleanup(); } return undefined; });',
    'function f() { try { return 1; } catch { return 2; } }',
    'function f(x) { if (x) { return 1; } else { return 2; } }',
    'function fail(): never { throw new Error(); }\nfunction f(x) { if (x) { return 1; } return fail(); }',
    'function fail(): never { throw new Error(); }\nfunction f(x) { if (x) { return 1; } fail(); }',
    'const fail = (): never => { throw Error(); }; function f(x) { switch(x) { case 1: return 1; default: fail(); } }',
    'function fail(): never { throw Error(); } function f(x) { try { if (x) return 1; fail(); } finally { cleanup(); } }',
    'function f() { for (;;) { return 1; } }',
    'function f(x) { if (x) { return 1; } throw new Error(); }',
    'function f(x) { switch (x) { case 1: return 1; default: return 2; } }',
    'function outer() { function nested() { return 1; } nested(); }',
  ],
  invalid: [
    { code: 'function f(x) { if (x) { return "a"; } }', errors: [{ messageId: 'missing' }] },
    { code: 'function f(x) { if (x) { return "a"; } return; }', errors: [{ messageId: 'mixed' }] },
    { code: 'function f(x) { if (x) { return; } return "a"; }', errors: [{ messageId: 'mixed' }] },
    {
      code: 'function fail(): never { throw Error(); } function f(x, fail) { if (x) return 1; fail(); }',
      errors: [{ messageId: 'missing' }],
    },
    {
      code: 'function fail(): never { throw Error(); } function f(x) { try { if (x) return 1; fail(); } catch {} }',
      errors: [{ messageId: 'missing' }],
    },
    {
      code: 'function fail(): never { throw Error(); } function f(x, y) { if (x) return 1; if (y) fail(); }',
      errors: [{ messageId: 'missing' }],
    },
    {
      code: 'function fail(): Promise<never> { return Promise.reject(); } function f(x) { if (x) return 1; fail(); }',
      errors: [{ messageId: 'missing' }],
    },
    { code: 'function Preview(x) { if (x) { return <div />; } }', errors: [{ messageId: 'missing' }] },
    { code: 'function f(x) { switch (x) { case 1: return 1; } }', errors: [{ messageId: 'missing' }] },
  ],
});
