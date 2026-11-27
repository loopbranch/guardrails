# Changelog

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
