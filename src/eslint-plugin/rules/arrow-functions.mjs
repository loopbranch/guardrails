export const arrowFunctions = {
  meta: {
    type: 'suggestion',
    docs: { description: '独立函数使用箭头函数' },
    schema: [],
    messages: { arrow: 'CC-057：使用箭头函数，重构时保持原有调用语义。' },
  },
  create(context) {
    const report = (node) => context.report({ node, messageId: 'arrow' });
    return {
      FunctionDeclaration: report,
      FunctionExpression(node) {
        const { parent } = node;
        // ESTree 也用 FunctionExpression 表示方法和访问器的方法体。
        const isMethod = parent.type === 'MethodDefinition' || (parent.type === 'Property' && (parent.method || parent.kind !== 'init'));
        if (!isMethod) {
          report(node);
        }
      },
    };
  },
};
