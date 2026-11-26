import { createRuleTester } from './rule-tester.mjs';
import { chainLinebreaks } from './chain-linebreaks.mjs';

createRuleTester().run('chain-linebreaks', chainLinebreaks, {
  valid: ['foo().bar().baz().qux();', 'foo()\n  .bar()\n  .baz()\n  .qux()\n  .quux();', 'const x = foo().bar();'],
  invalid: [
    { code: 'foo().bar().baz().qux().quux();', errors: [{ messageId: 'tooLong' }] },
    { code: 'foo().bar().baz().qux().quux().value;', errors: [{ messageId: 'tooLong' }] },
  ],
});
