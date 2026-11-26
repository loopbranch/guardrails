import { createRuleTester } from './rule-tester.mjs';
import { preferOptionalMember } from './prefer-optional-member.mjs';

createRuleTester().run('prefer-optional-member', preferOptionalMember, {
  valid: [
    'interface User { name?: string }',
    'interface User { name: string | null }',
    'function f(value?: string) {}',
    'function f(value: string | undefined = "x") {}',
  ],
  invalid: [
    { code: 'interface User { name: string | undefined }', errors: [{ messageId: 'useQuestion' }] },
    { code: 'class User { name: string | undefined }', errors: [{ messageId: 'useQuestion' }] },
    { code: 'function f(value: string | undefined) {}', errors: [{ messageId: 'useQuestion' }] },
    { code: 'interface User { name?: string | undefined }', errors: [{ messageId: 'redundantUndefined' }] },
  ],
});
