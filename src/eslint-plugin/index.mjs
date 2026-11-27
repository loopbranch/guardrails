/**
 * eslint-plugin-aigc：本仓自定义规则（移植自 video-editor/tools/eslint-plugin-video-editor）。
 * - css-module-same-name、no-global-style-import：SCSS + CSS Modules 约定（control/rules/styling.md）；
 * - no-weak-test：禁止只含弱断言的测试（control/rules/testing.md T5）；
 * - no-repo-class-selector：BDD 不得按本仓 CSS 类名或 antd 内部类名定位（control/rules/testing.md 第 3 节）。
 * 由 eslint.config.mjs 经 tools/eslint/presets.mjs 按路径加载。
 */
import { arrowFunctionNaming } from './rules/arrow-function-naming.mjs';
import { arrowFunctions } from './rules/arrow-functions.mjs';
import { chainLinebreaks } from './rules/chain-linebreaks.mjs';
import { cmetricsComplexity } from './rules/cmetrics-complexity.mjs';
import { commentCodeGap } from './rules/comment-code-gap.mjs';
import { consistentReturn } from './rules/consistent-return.mjs';
import { cssModuleSameName } from './rules/css-module-same-name.mjs';
import { elseIfElse } from './rules/else-if-else.mjs';
import { functionLines } from './rules/function-lines.mjs';
import { maxConditionals } from './rules/max-conditionals.mjs';
import { noFloatEquality } from './rules/no-float-equality.mjs';
import { arrayCopySpread } from './rules/array-copy-spread.mjs';
import { fileNaming } from './rules/file-naming.mjs';
import { noArrayMutationInIteration } from './rules/no-array-mutation-in-iteration.mjs';
import { noArrayProperty } from './rules/no-array-property.mjs';
import { numberConversion } from './rules/number-conversion.mjs';
import { preferArrayMethods } from './rules/prefer-array-methods.mjs';
import { noCommentedCode } from './rules/no-commented-code.mjs';
import { noDeveloperInfo } from './rules/no-developer-info.mjs';
import { noInsecureRandom } from './rules/no-insecure-random.mjs';
import { noPublicAddress } from './rules/no-public-address.mjs';
import { noUnsafeStorage } from './rules/no-unsafe-storage.mjs';
import { postmessageOrigin } from './rules/postmessage-origin.mjs';
import { preferOptionalChainStrict } from './rules/prefer-optional-chain-strict.mjs';
import { noGlobalStyleImport } from './rules/no-global-style-import.mjs';
import { noRepoClassSelector } from './rules/no-repo-class-selector.mjs';
import { noWeakTest } from './rules/no-weak-test.mjs';
import { objectPropsPerLine } from './rules/object-props-per-line.mjs';
import { preferOptionalMember } from './rules/prefer-optional-member.mjs';

const plugin = {
  meta: { name: 'eslint-plugin-aigc', version: '0.0.0' },
  rules: {
    'arrow-function-naming': arrowFunctionNaming,
    'arrow-functions': arrowFunctions,
    'chain-linebreaks': chainLinebreaks,
    'cmetrics-complexity': cmetricsComplexity,
    'comment-code-gap': commentCodeGap,
    'consistent-return': consistentReturn,
    'css-module-same-name': cssModuleSameName,
    'else-if-else': elseIfElse,
    'function-lines': functionLines,
    'max-conditionals': maxConditionals,
    'no-float-equality': noFloatEquality,
    'no-commented-code': noCommentedCode,
    'no-developer-info': noDeveloperInfo,
    'no-insecure-random': noInsecureRandom,
    'no-public-address': noPublicAddress,
    'no-unsafe-storage': noUnsafeStorage,
    'postmessage-origin': postmessageOrigin,
    'array-copy-spread': arrayCopySpread,
    'file-naming': fileNaming,
    'no-array-mutation-in-iteration': noArrayMutationInIteration,
    'no-array-property': noArrayProperty,
    'number-conversion': numberConversion,
    'prefer-array-methods': preferArrayMethods,
    'prefer-optional-chain-strict': preferOptionalChainStrict,
    'no-global-style-import': noGlobalStyleImport,
    'no-repo-class-selector': noRepoClassSelector,
    'no-weak-test': noWeakTest,
    'object-props-per-line': objectPropsPerLine,
    'prefer-optional-member': preferOptionalMember,
  },
};

export default plugin;
