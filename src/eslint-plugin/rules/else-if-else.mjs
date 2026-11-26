/** if-else if 链末尾必须有 else（G.CTL.04）；提前返回形成的独立 if 不在此列。 */
export const elseIfElse = {
  meta: {
    type: 'suggestion',
    docs: { description: 'if-else if 链末尾必须有 else' },
    schema: [],
    messages: { missingElse: 'if-else if 链末尾必须有 else。' },
  },
  create(context) {
    return {
      IfStatement(node) {
        if (node.parent?.type === 'IfStatement' && node.parent.alternate === node) {
          return;
        }
        let cursor = node;
        let hasElseIf = false;
        let hasFinalElse = false;
        while (cursor.alternate) {
          if (cursor.alternate.type === 'IfStatement') {
            hasElseIf = true;
            cursor = cursor.alternate;
          } else {
            hasFinalElse = true;
            break;
          }
        }
        if (hasElseIf && !hasFinalElse) {
          context.report({ node, messageId: 'missingElse' });
        }
      },
    };
  },
};
