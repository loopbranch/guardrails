// RuleTester 接入 vitest：RuleTester 默认使用全局 describe/it，这里显式绑定到 vitest。
import { RuleTester } from 'eslint';
import tseslint from 'typescript-eslint';
import { describe, it } from 'vitest';

RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

/** 使用 typescript-eslint 解析器并开启 JSX 的 RuleTester。 */
export const createRuleTester = () => {
  return new RuleTester({
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaFeatures: { jsx: true } },
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
  });
};
