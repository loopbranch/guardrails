/**
 * no-global-style-import：全局样式（非 *.module.* 的 .css/.scss）只能由入口文件导入（control/rules/styling.md 第 2 节）。
 * 入口由选项 `entries` 指定，按路径后缀匹配，默认 apps/aigc-web/src/main.tsx。
 */
const GLOBAL_STYLE = /\.(?:scss|css)$/;
const STYLE_MODULE = /\.module\.(?:scss|css)$/;

const normalize = (file) => {
  return file.split('\\').join('/');
};

/** @type {import('eslint').Rule.RuleModule} */
export const noGlobalStyleImport = {
  meta: {
    type: 'problem',
    docs: { description: '只有入口 main.tsx 可以导入全局样式' },
    messages: {
      forbidden: '全局样式 {{source}} 只能由入口（{{entries}}）导入；组件样式请使用同名 *.module.scss。',
    },
    schema: [
      {
        type: 'object',
        properties: { entries: { type: 'array', items: { type: 'string' }, minItems: 1 } },
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    const entries = context.options[0]?.entries ?? ['apps/aigc-web/src/main.tsx'];
    const filename = normalize(context.filename);
    const isEntry = entries.some((entry) => filename === entry || filename.endsWith(`/${entry}`));
    const check = (node) => {
      const source = node.source?.type === 'Literal' ? node.source.value : null;
      const isAllowedStyle = STYLE_MODULE.test(source) || isEntry;
      if (typeof source !== 'string' || !GLOBAL_STYLE.test(source) || isAllowedStyle) {
        return;
      }
      context.report({ node, messageId: 'forbidden', data: { source, entries: entries.join('、') } });
    };
    return { ImportDeclaration: check, ImportExpression: check };
  },
};
