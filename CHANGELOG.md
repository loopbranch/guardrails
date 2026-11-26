# Changelog

## 0.1.1

- 引入公司 JS/TS CodeCheck 规范映射（97 条去重规则），标注 73 条已同义机检、8 条口径差异、13 条仅评审、3 条按框架条件适用。

## 0.1.0

- 语言优先的能力模型：format、lint、codecheck（缺陷 + 度量）三类任务。
- ts/js 迁移自 aigc 的 ESLint 规则、16 条自定义规则与车道装配，含 cmetrics 复杂度、深度、函数行数、条件子项数度量。
- scss 迁移 stylelint 规则；json/yaml/md 只做格式化；sql 交由 sql-governance 技能。
- SARIF 2.1.0 输出与 fail / pass / unsupported 三态结论。
- 阈值只允许收紧的覆盖规则。
