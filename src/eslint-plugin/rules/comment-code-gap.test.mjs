import { createRuleTester } from './rule-tester.mjs';
import { commentCodeGap } from './comment-code-gap.mjs';

createRuleTester().run('comment-code-gap', commentCodeGap, {
  valid: ['// 说明\nconst x = 1;', 'const x = 1; // 行尾'],
  invalid: [{ code: '// 说明\n\nconst x = 1;', errors: [{ messageId: 'gap' }] }],
});
