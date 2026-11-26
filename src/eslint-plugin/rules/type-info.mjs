import ts from 'typescript';

const scriptTypes = new WeakMap();

// 单独 lint 的脚本和 stdin 输入不一定属于 tsconfig；沿用解析器的当前源码，避免从磁盘读到旧版本。
export const ruleTypeInfo = (sourceCode) => {
  const services = sourceCode.parserServices;
  if (services?.program) {
    return services;
  }
  const cached = scriptTypes.get(sourceCode);
  if (cached) {
    return cached;
  }
  const nodes = services?.esTreeNodeToTSNodeMap;
  const source = nodes?.get(sourceCode.ast);
  if (!source) {
    return undefined;
  }
  const options = {
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.NodeNext,
    allowJs: true,
    strict: true,
    types: ['node'],
    skipLibCheck: true,
  };
  const host = ts.createCompilerHost(options, true);
  const readSource = host.getSourceFile;
  host.getSourceFile = (name, ...args) => (name === source.fileName ? source : readSource(name, ...args));
  const program = ts.createProgram([source.fileName], options, host);
  const checker = program.getTypeChecker();
  const info = { program, getTypeAtLocation: (node) => checker.getTypeAtLocation(nodes.get(node)) };
  scriptTypes.set(sourceCode, info);
  return info;
};
