/** 链式调用超过 4 段需换行（G.FMT.05）。只统计同一链路中的 CallExpression 段。 */
const chainCalls = (node) => {
  let count = 0;
  let current = node;
  while (current) {
    if (current.type === 'CallExpression') {
      count += 1;
      current = current.callee;
    } else if (current.type === 'MemberExpression') {
      current = current.object;
    } else if (current.type === 'ChainExpression') {
      current = current.expression;
    } else {
      break;
    }
  }
  return count;
};

const partOfChain = (node) => {
  return (
    (node.parent?.type === 'MemberExpression' && node.parent.object === node) ||
    (node.parent?.type === 'CallExpression' && node.parent.callee === node) ||
    node.parent?.type === 'ChainExpression'
  );
};

const check = (node, context) => {
  if (partOfChain(node) || !(node.loc.start.line === node.loc.end.line)) {
    return;
  }
  const calls = chainCalls(node);
  if (calls > 4) {
    context.report({ node, messageId: 'tooLong', data: { count: calls } });
  }
};

export const chainLinebreaks = {
  meta: {
    type: 'suggestion',
    docs: { description: '链式调用超过 4 段需换行' },
    schema: [],
    messages: { tooLong: '链式调用有 {{count}} 段，超过 4 段需换行。' },
  },
  create(context) {
    return {
      CallExpression(node) {
        check(node, context);
      },
      MemberExpression(node) {
        check(node, context);
      },
      ChainExpression(node) {
        check(node, context);
      },
    };
  },
};
