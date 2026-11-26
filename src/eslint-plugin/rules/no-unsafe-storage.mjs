/**
 * G.WSQ.01：禁止使用 Web SQL 与 IndexedDB 存敏感数据。
 * 两个数据库无法判断写入内容是否敏感，因此一律拦截；需要持久化时走服务端或白名单方案。
 */
const BANNED = new Set(['openDatabase', 'indexedDB', 'webkitIndexedDB']);
const BANNED_MEMBERS = new Set(['indexedDB', 'webkitIndexedDB']);

export const noUnsafeStorage = {
  meta: {
    type: 'problem',
    docs: { description: '禁止使用 Web SQL 与 IndexedDB' },
    schema: [],
    messages: { banned: '禁止使用 {{name}}：浏览器数据库无法保证不存敏感数据，请改用服务端持久化。' },
  },
  create(context) {
    return {
      Identifier(node) {
        if (BANNED.has(node.name)) {
          context.report({ node, messageId: 'banned', data: { name: node.name } });
        }
      },
      MemberExpression(node) {
        if (!node.computed && node.property.type === 'Identifier' && BANNED_MEMBERS.has(node.property.name)) {
          context.report({ node, messageId: 'banned', data: { name: node.property.name } });
        }
      },
    };
  },
};
