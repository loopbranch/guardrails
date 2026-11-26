const typeWrappers = new Set([
  'TSAsExpression',
  'TSInstantiationExpression',
  'TSNonNullExpression',
  'TSSatisfiesExpression',
  'TSTypeAssertion',
]);

export const arrowFunctionNaming = {
  meta: {
    type: 'suggestion',
    docs: { description: '箭头函数绑定名遵循函数命名规范' },
    schema: [],
    messages: { naming: 'CC-060：箭头函数的绑定名使用 camelCase 或 PascalCase。' },
  },
  create(context) {
    return {
      VariableDeclarator(node) {
        const { id } = node;
        // 与 naming-convention 的 camelCase 或 PascalCase 合集一致。
        if (id.type !== 'Identifier' || !id.name.includes('_')) {
          return;
        }
        let value = node.init;
        while (typeWrappers.has(value?.type)) {
          value = value.expression;
        }
        if (value?.type === 'ArrowFunctionExpression') {
          context.report({ node: id, messageId: 'naming' });
        }
      },
    };
  },
};
