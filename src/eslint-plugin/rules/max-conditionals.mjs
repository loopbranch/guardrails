/**
 * 单个条件最多 3 个子条件（G.CTL.07）。
 * 平台把 `!(a && b)` 括号内的逻辑组合按原子条件计数，因此 `!` 后接逻辑表达式时继续展开。
 */
const operands = (node) => {
  if (node?.type === 'LogicalExpression' && ['&&', '||', '??'].includes(node.operator)) {
    return operands(node.left) + operands(node.right);
  }
  if (node?.type === 'UnaryExpression' && node.operator === '!' && node.argument?.type === 'LogicalExpression') {
    return operands(node.argument);
  }
  return node ? 1 : 0;
};

const check = (node, context) => {
  if (!node) {
    return;
  }
  const count = operands(node);
  if (count > 3) {
    context.report({ node, messageId: 'tooMany', data: { count } });
  }
};

export const maxConditionals = {
  meta: {
    type: 'suggestion',
    docs: { description: '单个条件最多 3 个子条件' },
    schema: [],
    messages: { tooMany: '条件有 {{count}} 个子条件，最多允许 3 个。' },
  },
  create(context) {
    const test = (node) => check(node.test, context);
    return {
      IfStatement: test,
      WhileStatement: test,
      DoWhileStatement: test,
      ForStatement: test,
      ConditionalExpression(node) {
        check(node.test, context);
      },
    };
  },
};
