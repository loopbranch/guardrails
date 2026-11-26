# sumi-standards

语言优先的检查标准包：同一个语言注册表驱动格式化、缺陷与度量三类检查，供 Sumi 项目与普通 Node 项目复用。

## 设计

- **语言是一等公民**：每个语言条目声明自己有哪些任务（`format`、`lint`、`codecheck`），未声明或规范上不设的能力必须显式写成 `unsupported` 并带原因。
- **格式化只有一个真相**：某语言由 Prettier 负责格式，它的 lint 就不再启用任何格式类规则。
- **CodeCheck 分两类**：缺陷（可判定、可修复的违例）与度量（数值指标 + 可配置阈值）。当前度量含圈复杂度、代码深度、函数行数、条件子项数，只在 ts/js 语言提供。
- **结果协议**：全部输出 SARIF 2.1.0；任务结论为 `fail` / `pass` / `unsupported` 三态。

## 当前语言

| 语言 | format | lint | 度量 |
| --- | --- | --- | --- |
| ts / js | Prettier | ESLint（多车道 + 自定义规则） | 圈复杂度、代码深度、函数行数、条件子项数 |
| scss | Prettier | stylelint | 不支持 |
| sql | 不支持（由 sql-governance 技能负责） | 不支持（同上） | 不支持 |
| json / yaml / md | Prettier | 不支持 | 不支持 |

## 使用

### 作为 Sumi 插件

在项目的 `control/config.yaml` 中登记包，然后在流程里引用三个 step：

```yaml
packages:
  - '@fantasticit/sumi-standards'
```

```yaml
steps:
  - use: standards/format
  - use: standards/lint
  - use: standards/codecheck
```

### ESLint 配置

```js
import { browserGlobals, eslintConfig } from '@fantasticit/sumi-standards/config/eslint';

export default [
  ...eslintConfig({ language: 'ts', files: ['apps/*/src/**/*.{ts,tsx}'], environment: browserGlobals, typeAware: true, lanes: ['react', 'web-style'] }),
];
```

### CLI

```bash
node src/bin.mjs list
node src/bin.mjs check --task format|lint|codecheck [--language ts] [--output pretty|compact] [文件...]
```

未传入文件时按 `git diff HEAD` 与未跟踪文件选择；语言未命中的文件会直接报错，要求补语言条目。

## 执行器

工具由使用方安装，包不自带：`eslint`、`prettier`、`stylelint`、`typescript`（度量与类型感知车道）。缺执行器时任务立即以明确错误失败，不降级为 `unsupported`。

## 规则与阈值

- 规则取值：`rules/languages/<语言>/eslint-rules.json`、`rules/languages/scss/stylelint.json`、`rules/format-defaults.json`
- CodeCheck 分档：`rules/languages/ts/codecheck.json`（缺陷 76、度量 4、检查清单 14、已覆盖 2、不适用 2）
- 阈值：`rules/profiles/strict.json`；项目覆盖只允许收紧（`min(项目值, 包默认值)`），放宽需显式声明理由

## 测试

```bash
npm test
```
