import { createRuleTester } from './rule-tester.mjs';
import { noFloatEquality } from './no-float-equality.mjs';

createRuleTester().run('no-float-equality', noFloatEquality, {
  valid: ['count === 1;', 'Math.abs(a - b) < 0.001;', 'scale === 1;', 'value === 0xFE;', "'id:' + item === key;", '2n ** 2n === 4n;'],
  invalid: [
    { code: 'sample ** 2 === target;', errors: [{ messageId: 'float' }] },
    { code: 'scale === 0.5;', errors: [{ messageId: 'float' }] },
    { code: '-0.25 == scale;', errors: [{ messageId: 'float' }] },
    { code: '0.1 + 0.2 === 0.3;', errors: [{ messageId: 'float' }] },
    { code: '1 / 3 === 1 / 2;', errors: [{ messageId: 'float' }] },
    { code: 'net + tax === gross;', errors: [{ messageId: 'float' }] },
    { code: '1 / 3 === ratio;', errors: [{ messageId: 'float' }] },
  ],
});
