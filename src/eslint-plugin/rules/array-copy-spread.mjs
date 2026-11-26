/**
 * G.TYP.11：复制数组使用展开语法或 concat。
 * 只拦“整数组复制”的写法：无参 slice()、slice(0) 与 Array.prototype.slice.call；
 * 带上下界的 slice 属于截取，不在本条范围。项目原有的 slice 例外按最严口径取消。
 */
const COPY_CALLEE = (node) => {
  const callee = node.callee;
  if (callee.type !== 'MemberExpression' || callee.property?.name !== 'slice') {
    return false;
  }
  const args = node.arguments;
  return args.length === 0 || (args.length === 1 && args[0].type === 'Literal' && args[0].value === 0);
};

export const arrayCopySpread = {
  meta: {
    type: 'suggestion',
    docs: { description: '复制数组使用展开语法或 concat' },
    schema: [],
    messages: { copy: '复制数组请使用展开语法 [...arr] 或 concat；slice() 不再视为合法复制方式。' },
  },
  create(context) {
    return {
      CallExpression(node) {
        if (COPY_CALLEE(node)) {
          context.report({ node, messageId: 'copy' });
        }
        const callee = node.callee;
        if (
          callee.type === 'MemberExpression' &&
          callee.property?.name === 'call' &&
          callee.object?.type === 'MemberExpression' &&
          callee.object.object?.name === 'Array' &&
          callee.object.property?.name === 'prototype' &&
          node.arguments[1]?.type === 'MemberExpression' &&
          node.arguments[1].property?.name === 'slice'
        ) {
          context.report({ node, messageId: 'copy' });
        }
      },
    };
  },
};
