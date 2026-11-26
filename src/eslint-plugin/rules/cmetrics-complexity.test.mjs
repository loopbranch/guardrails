import { createRuleTester } from './rule-tester.mjs';
import { cmetricsComplexity } from './cmetrics-complexity.mjs';

createRuleTester().run('cmetrics-complexity', cmetricsComplexity, {
  valid: [
    // 基础值 1
    { code: 'function f(a) { return a; }', options: [1] },
    // return 内的 && 不计
    { code: 'function f(a, b) { return a && b; }', options: [1] },
    // 命名箭头方法照常统计；匿名回调不单独报告
    { code: 'const f = (a) => a;', options: [1] },
    { code: '[1, 2].map((x) => (x ? 1 : 2));', options: [1] },
    // else if 整体 +1：base 1 + if 1 + else-if 的 if 1 + || 1 = 4
    { code: 'function f(a, b, c) { if (a) { return 1; } else if (b || c) { return 2; } }', options: [4] },
    // 纯 else +1：base 1 + if 1 + else 1 = 3
    { code: 'function f(a) { if (a) { return 1; } else { return 2; } }', options: [3] },
    // 每个 ?. 分别 +1：base 1 + 2 = 3
    { code: 'function f(p) { return p?.a?.b; }', options: [3] },
    // ?? 计入：base 1 + 1 = 2
    { code: 'function f(a, b) { return a ?? b; }', options: [2] },
    // 非 return 位置的 && 计入：base 1 + 1 = 2
    { code: 'function f(a, b) { const x = a && b; return x; }', options: [2] },
    // return 内的 || 仍计入：base 1 + 1 = 2
    { code: 'function f(a, b) { return a || b; }', options: [2] },
    // case 与 default 各 +1：base 1 + 2 = 3
    { code: 'function f(x) { switch (x) { case 1: return 1; default: return 0; } }', options: [3] },
    // try/finally 不计，catch 计：base 1 + 1 = 2
    { code: 'function f(a) { try { return a; } finally { done(); } }', options: [1] },
    // 命名方法签名里的默认参数不额外计分
    { code: 'function f(a = 1) { return a; }', options: [1] },
  ],
  invalid: [
    {
      code: 'function f(a) { if (a) { return 1; } return 0; }',
      options: [1],
      errors: [{ messageId: 'complex', data: { name: 'f', complexity: 2, max: 1 } }],
    },
    // else if 整体 +1（不是 else + if 双计）：base 1 + if 1 + else-if 1 + || 1 = 4
    {
      code: 'function f(a, b, c) { if (a) { return 1; } else if (b || c) { return 2; } }',
      options: [3],
      errors: [{ messageId: 'complex', data: { name: 'f', complexity: 4, max: 3 } }],
    },
    {
      code: 'function f(a) { if (a) { return 1; } else { return 2; } }',
      options: [2],
      errors: [{ messageId: 'complex', data: { name: 'f', complexity: 3, max: 2 } }],
    },
    {
      code: 'function f(p) { return p?.a?.b; }',
      options: [2],
      errors: [{ messageId: 'complex', data: { name: 'f', complexity: 3, max: 2 } }],
    },
    {
      code: 'function f(a, b) { return a ?? b; }',
      options: [1],
      errors: [{ messageId: 'complex', data: { name: 'f', complexity: 2, max: 1 } }],
    },
    {
      code: 'function f(a, b) { const x = a && b; return x; }',
      options: [1],
      errors: [{ messageId: 'complex', data: { name: 'f', complexity: 2, max: 1 } }],
    },
    {
      code: 'function f(a, b) { return a || b; }',
      options: [1],
      errors: [{ messageId: 'complex', data: { name: 'f', complexity: 2, max: 1 } }],
    },
    {
      code: 'function f(a) { a ??= 1; return a; }',
      options: [1],
      errors: [{ messageId: 'complex', data: { name: 'f', complexity: 2, max: 1 } }],
    },
    {
      code: 'function f(x) { switch (x) { case 1: return 1; default: return 0; } }',
      options: [2],
      errors: [{ messageId: 'complex', data: { name: 'f', complexity: 3, max: 2 } }],
    },
    {
      code: 'function f(a) { try { return a; } catch (e) { return 0; } }',
      options: [1],
      errors: [{ messageId: 'complex', data: { name: 'f', complexity: 2, max: 1 } }],
    },
    // 嵌套回调计入外层命名方法；内层匿名回调不单独报告
    {
      code: 'function outer(a) { const g = [1].map((x) => (x ? 1 : 2)); return a ? g[0] : 0; }',
      options: [2],
      errors: [{ messageId: 'complex', data: { name: 'outer', complexity: 3, max: 2 } }],
    },
    // 命名内层方法也按自身口径报告
    {
      code: 'function outer(a) { const inner = (b) => (b ? 1 : 2); return a ? inner(a) : 0; }',
      options: [1],
      errors: [
        { messageId: 'complex', data: { name: 'outer', complexity: 3, max: 1 } },
        { messageId: 'complex', data: { name: 'inner', complexity: 2, max: 1 } },
      ],
    },
    // 显式命名的函数表达式同样单独报告
    {
      code: '(function handler(x) { if (x) { return 1; } return 0; });',
      options: [1],
      errors: [{ messageId: 'complex', data: { name: 'handler', complexity: 2, max: 1 } }],
    },
    // 类方法与对象方法同样按命名方法统计
    {
      code: 'class C { m(a) { if (a) { return 1; } return 0; } }',
      options: [1],
      errors: [{ messageId: 'complex', data: { name: 'm', complexity: 2, max: 1 } }],
    },
    {
      code: 'const obj = { m(a) { if (a) { return 1; } return 0; } };',
      options: [1],
      errors: [{ messageId: 'complex', data: { name: 'm', complexity: 2, max: 1 } }],
    },
  ],
});
