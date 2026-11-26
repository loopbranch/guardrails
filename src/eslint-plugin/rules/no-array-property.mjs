/**
 * G.TYP.07：数组只存按序排列的元素（length 除外），不在数组上挂非数字属性。
 * 有类型信息时只判断数组类型；无类型信息时，只拦在同一文件里以数组字面量初始化的标识符。
 */
const NUMERIC = /^(?:\d+|length)$/u;

const isArrayLiteralName = (scope, name) => {
  let current = scope;
  while (current !== null && current !== undefined) {
    for (const variable of current.variables ?? []) {
      if (variable.name === name) {
        const definition = variable.defs?.[0]?.node;
        return definition?.init?.type === 'ArrayExpression';
      }
    }
    current = current.upper;
  }
  return false;
};

const isArrayType = (services, object) => {
  const checker = services?.program?.getTypeChecker?.();
  const map = services?.esTreeNodeToTSNodeMap;
  if (!checker || !map || object.type !== 'Identifier') {
    return undefined;
  }
  const type = checker.getTypeAtLocation(map.get(object));
  const text = checker.typeToString(type);
  return /^(?:readonly )?Array<|^(?:any\[\]|unknown\[\])$/u.test(text) || /\[\]$/u.test(text);
};

export const noArrayProperty = {
  meta: {
    type: 'problem',
    docs: { description: '禁止在数组上挂非数字属性' },
    schema: [],
    messages: { property: '数组只用于有序元素；需要附加信息时改用对象或 Map。' },
  },
  create(context) {
    const services = context.sourceCode.parserServices;
    return {
      AssignmentExpression(node) {
        if (node.left.type !== 'MemberExpression' || node.left.computed || node.left.property.type !== 'Identifier') {
          return;
        }
        const property = node.left.property.name;
        if (NUMERIC.test(property)) {
          return;
        }
        const typed = isArrayType(services, node.left.object);
        const byLiteral = typed === undefined ? isArrayLiteralName(context.sourceCode.getScope(node), node.left.object.name) : false;
        if (typed === true || byLiteral === true) {
          context.report({ node, messageId: 'property' });
        }
      },
    };
  },
};
