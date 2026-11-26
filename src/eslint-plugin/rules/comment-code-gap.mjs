/** 注释与代码之间不得有空行（G.CMT.01）。 */
export const commentCodeGap = {
  meta: {
    type: 'suggestion',
    docs: { description: '注释与代码之间不得有空行' },
    schema: [],
    messages: { gap: '注释与代码之间不得有空行。' },
  },
  create(context) {
    const sourceCode = context.sourceCode;
    const comments = sourceCode.getAllComments();
    return {
      Program() {
        for (const comment of comments) {
          const next = sourceCode.getTokenAfter(comment, { includeComments: true });
          if (!next || next.type === 'Line' || next.type === 'Block') {
            continue;
          }
          if (next.loc.start.line > comment.loc.end.line + 1) {
            context.report({ node: comment, messageId: 'gap' });
          }
        }
      },
    };
  },
};
