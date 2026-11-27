# Changelog

## 0.2.2

- 启用 `aigc/no-array-mutation-in-iteration`（G.TYP.09），覆盖数组方法回调、`for…of` 与按下标遍历的 `for` 循环，并识别 `length` 赋值清空；不再跳过 `e2e/`（实测 0 命中）。
- 新增 `aigc/file-naming`（G.NAM.07）：扩展名必须小写；文件名使用小写短横线分段，React 组件文件允许 PascalCase，生成物 `*.module.d.scss.ts` 放行。
- 公司规范映射：7 条原「仅评审/检查清单」规则改为机检；状态更新为 87 covered / 7 difference / 3 conditional，`review-only` 清零。
- 修正规则可达性：`file-naming` 增加大写扩展名车道；`no-array-property` 支持 computed 字符串键；`prefer-array-methods` 覆盖 `for…in`；`number-conversion` 支持顶层与 `Number.isInteger` 检查；`no-unsafe-storage` 去重。
- 规则单测改为在 describe 收集阶段执行，避免运行期注册被 vitest 忽略；恢复 `no-public-address` 混合 IP/邮箱的回归用例；E9 文案按最严口径改为已取消。

## 0.2.1

- `aigc/no-public-address`：邮箱与 IPv4 都改为逐个匹配判断。修复同一条字符串里「放行域名的邮箱」或「私有网段 IP」掩盖后续真实地址、导致漏报的问题。

## 0.2.0

- `no-mixed-operators` 改回同类运算符一组的默认分组（算术、位运算、比较、逻辑、`in`/`instanceof`）；原分组写反导致 `+` 与 `*` 等混用一条都不报。
- 新增 `max-len`（code 140）：字符串与模板字符串计入长度，忽略 URL 与整行注释；由 ESLint 补 Prettier 折不动字符串、正则与长文本的缺口。
- `aigc/no-public-address`：`*.test.*` / `*.spec.*` 不再跳过（只保留 `e2e/` 目录）；放行 RFC 2606/6761 保留域名、`example.com` 子域与 `.internal` / `.local` 内网主机；URL 中的私有网段 IP、保留域名邮箱不再误报。
- `aigc/number-conversion`：`isFinite` / `Number.isFinite` 视为合法的 NaN 检查（比 isNaN 更严格）。
- 步骤层三态结论按语言聚合：混合语言中只有部分语言不支持该任务时按已执行部分判 pass/fail，只有全部语言都不支持才判 `unsupported`。
- 测试入口补齐 `src/languages` 与 `src/plugins`；新增上游 CI 工作流。

## 0.1.1

- 引入公司 JS/TS CodeCheck 规范映射（97 条去重规则），标注 73 条已同义机检、8 条口径差异、13 条仅评审、3 条按框架条件适用。

## 0.1.0

- 语言优先的能力模型：format、lint、codecheck（缺陷 + 度量）三类任务。
- ts/js 迁移自 aigc 的 ESLint 规则、16 条自定义规则与车道装配，含 cmetrics 复杂度、深度、函数行数、条件子项数度量。
- scss 迁移 stylelint 规则；json/yaml/md 只做格式化；sql 交由 sql-governance 技能。
- SARIF 2.1.0 输出与 fail / pass / unsupported 三态结论。
- 阈值只允许收紧的覆盖规则。
