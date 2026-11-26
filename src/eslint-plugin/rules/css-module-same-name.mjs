/**
 * css-module-same-name：组件 `Foo.tsx` 只能导入同目录的 `./Foo.module.scss`（control/rules/styling.md 第 2 节）。
 * hook 与纯函数文件（.ts）不带样式，导入任何样式模块都报错。
 */
import path from 'node:path';

const STYLE_MODULE = /\.module\.(?:scss|css)$/;

const importSource = (node) => {
  if (node.type === 'ImportDeclaration' || node.type === 'ImportExpression') {
    return node.source?.type === 'Literal' && typeof node.source.value === 'string' ? node.source.value : null;
  }
  return null;
};

/** @type {import('eslint').Rule.RuleModule} */
export const cssModuleSameName = {
  meta: {
    type: 'problem',
    docs: { description: '组件只能导入同目录同名的 *.module.scss；非组件文件不导入样式模块' },
    messages: {
      mismatch: '组件 {{file}} 只能导入同目录的 ./{{expected}}，不能导入 {{source}}。',
      notComponent: '只有 .tsx 组件可以导入样式模块；{{file}} 不能导入 {{source}}。',
    },
    schema: [],
  },
  create(context) {
    const filename = context.filename;
    const parsed = path.parse(filename);
    const isComponent = parsed.ext === '.tsx';
    const check = (node) => {
      const source = importSource(node);
      if (!source || !STYLE_MODULE.test(source)) {
        return;
      }
      const file = parsed.base;
      if (!isComponent) {
        context.report({ node, messageId: 'notComponent', data: { file, source } });
        return;
      }
      const expected = `${parsed.name}.module.scss`;
      if (source !== `./${expected}`) {
        context.report({ node, messageId: 'mismatch', data: { file, expected, source } });
      }
    };
    return { ImportDeclaration: check, ImportExpression: check };
  },
};
