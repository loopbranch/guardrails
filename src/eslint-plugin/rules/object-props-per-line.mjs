/** 对象属性超过 4 个时每行一个（G.FMT.04）。 */
export const objectPropsPerLine = {
  meta: {
    type: 'suggestion',
    docs: { description: '对象属性超过 4 个时每行一个' },
    schema: [],
    messages: { tooMany: '对象包含 {{count}} 个属性，超过 4 个时每个属性独占一行。' },
  },
  create(context) {
    return {
      ObjectExpression(node) {
        const count = node.properties?.length ?? 0;
        if (count > 4 && node.loc.start.line === node.loc.end.line) {
          context.report({ node, messageId: 'tooMany', data: { count } });
        }
      },
    };
  },
};
