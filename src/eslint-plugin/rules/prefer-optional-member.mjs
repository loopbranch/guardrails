/**
 * prefer-optional-member（CC-… G.TYP.06）：可选成员/参数用 `?`，不用 `T | undefined`。
 * 只检查属性签名/类字段/参数的类型注解；返回类型与变量声明不在此规则范围。
 */
const MEMBER_TYPES = new Set(['TSPropertySignature', 'PropertyDefinition', 'PropertyDeclaration']);
const FUNCTION_TYPES = new Set([
  'FunctionDeclaration',
  'FunctionExpression',
  'ArrowFunctionExpression',
  'TSDeclareFunction',
  'TSMethodSignature',
  'TSCallSignatureDeclaration',
  'TSConstructSignatureDeclaration',
]);

const unionHasUndefined = (type) => {
  return type?.type === 'TSUnionType' && type.types.some((part) => part.type === 'TSUndefinedKeyword');
};

const isFunctionParameter = (node) => {
  if (node.type !== 'Identifier') {
    return false;
  }
  if (node.parent?.type === 'AssignmentPattern') {
    return false;
  }
  if (node.parent?.type === 'TSParameterProperty') {
    return true;
  }
  return Boolean(FUNCTION_TYPES.has(node.parent?.type) && node.parent.params?.includes(node));
};

export const preferOptionalMember = {
  meta: {
    type: 'suggestion',
    docs: { description: '可选成员/参数使用 ? 而不是 | undefined' },
    schema: [],
    messages: {
      useQuestion: '可选成员/参数用 `?`，不要用 `| undefined`。',
      redundantUndefined: '已使用 `?`，从类型中删掉 `| undefined`。',
    },
  },
  create(context) {
    return {
      'TSPropertySignature, PropertyDefinition, PropertyDeclaration, Identifier'(node) {
        const isMember = MEMBER_TYPES.has(node.type);
        const isParameter = isFunctionParameter(node);
        if (!isMember && !isParameter) {
          return;
        }
        if (!unionHasUndefined(node.typeAnnotation?.typeAnnotation)) {
          return;
        }
        context.report({
          node: node.key ?? node,
          messageId: node.optional ? 'redundantUndefined' : 'useQuestion',
        });
      },
    };
  },
};
