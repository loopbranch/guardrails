/**
 * G.OTH.03：不用的代码直接删除，不要注释掉。
 * 逐行判断注释内容是否像代码：含代码关键字或以分号结尾，且不含中文说明文字。
 */
const CODE_LINE = /^(?:const|let|var|function|class|import|export|return|if|for|while|await)\b|=>|;\s*$/u;
const CJK = /[一-鿿]/u;

export const noCommentedCode = {
  meta: {
    type: 'suggestion',
    docs: { description: '禁止把代码注释掉保留' },
    schema: [],
    messages: { commented: '这段注释看起来是废弃代码，请直接删除。' },
  },
  create(context) {
    return {
      Program() {
        for (const comment of context.sourceCode.getAllComments()) {
          const lines = comment.value.split('\n').map((line) => line.trim());
          if (lines.some((line) => line.length > 4 && !CJK.test(line) && CODE_LINE.test(line))) {
            context.report({ node: comment, messageId: 'commented' });
          }
        }
      },
    };
  },
};
