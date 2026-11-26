/** G.OTH.01：安全场景必须使用密码学安全随机数；`Math.random` 一律拦截。 */
export const noInsecureRandom = {
  meta: {
    type: 'problem',
    docs: { description: '禁止使用 Math.random 生成安全用途随机数' },
    schema: [],
    messages: { insecure: '禁止使用 Math.random()；安全用途请使用密码学安全随机源（如 crypto.randomUUID）。' },
  },
  create(context) {
    return {
      CallExpression(node) {
        const callee = node.callee;
        if (
          callee.type === 'MemberExpression' &&
          !callee.computed &&
          callee.object.type === 'Identifier' &&
          callee.object.name === 'Math' &&
          callee.property.type === 'Identifier' &&
          callee.property.name === 'random'
        ) {
          context.report({ node, messageId: 'insecure' });
        }
      },
    };
  },
};
