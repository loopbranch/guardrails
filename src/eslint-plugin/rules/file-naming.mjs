/**
 * G.NAM.07：统一文件命名风格，扩展名必须小写。
 * 机器可判定部分：扩展名小写；文件名只允许小写短横线分段，React 组件（.tsx/.jsx）另允许 PascalCase。
 * 生成物 `*.module.d.scss.ts` 沿用组件名，单独放行。
 */
import path from 'node:path';

const CODE_FILE = /\.(?:ts|tsx|js|jsx|mjs|mts|cts)$/iu;
const GENERATED_STYLE_TYPES = /\.module\.d\.scss\.ts$/u;
const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\.[a-z0-9]+(?:-[a-z0-9]+)*)*$/u;
const PASCAL = /^[A-Z][A-Za-z0-9]*(?:\.[A-Za-z0-9]+)*$/u;

export const fileNaming = {
  meta: {
    type: 'suggestion',
    docs: { description: '文件命名统一，扩展名小写' },
    schema: [],
    messages: {
      extension: '文件扩展名必须小写：{{name}}。',
      name: '文件名必须使用小写短横线分段；React 组件文件可用 PascalCase：{{name}}。',
    },
  },
  create(context) {
    return {
      Program() {
        const base = path.basename(context.filename);
        if (!CODE_FILE.test(base)) {
          return;
        }
        const extension = path.extname(base).slice(1);
        if (extension !== extension.toLowerCase()) {
          context.report({ node: context.sourceCode.ast, messageId: 'extension', data: { name: base } });
          return;
        }
        if (GENERATED_STYLE_TYPES.test(base)) {
          return;
        }
        const stem = base.slice(0, -(extension.length + 1)).replace(/^\./u, '');
        const isComponent = extension === 'tsx' || extension === 'jsx';
        if (!KEBAB.test(stem) && !(isComponent && PASCAL.test(stem))) {
          context.report({ node: context.sourceCode.ast, messageId: 'name', data: { name: base } });
        }
      },
    };
  },
};
