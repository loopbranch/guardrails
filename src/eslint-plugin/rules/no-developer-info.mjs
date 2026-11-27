/** G.OTH.04：正式发布的代码与注释不包含开发者个人信息。 */
const PATTERNS = [
  { pattern: /[\w.+-]+@[\w-]+\.[\w.-]+/u, label: '邮箱' },
  { pattern: /(?:\+?86)?1[3-9]\d{9}/u, label: '手机号' },
  { pattern: /\/Users\/[A-Za-z0-9_-]+/u, label: '本机用户目录' },
  { pattern: /C:\\Users\\[A-Za-z0-9_-]+/u, label: '本机用户目录' },
  { pattern: /@author/u, label: '作者标记' },
];

const SKIP_FILE = /(?:(?:^|[\\/])e2e[\\/]|\.(?:test|spec)\.)/u;

export const noDeveloperInfo = {
  meta: {
    type: 'suggestion',
    docs: { description: '禁止代码与注释中出现开发者个人信息' },
    schema: [],
    messages: { info: '{{label}}属于开发者个人信息，请从交付代码中删除。' },
  },
  create(context) {
    if (SKIP_FILE.test(context.filename)) {
      return {};
    }
    const check = (node, text) => {
      for (const { pattern, label } of PATTERNS) {
        if (pattern.test(text)) {
          context.report({ node, messageId: 'info', data: { label } });
          return;
        }
      }
    };
    return {
      Program() {
        for (const comment of context.sourceCode.getAllComments()) {
          check(comment, comment.value);
        }
      },
    };
  },
};
