# Domain Docs

本仓库采用 single-context 布局。领域词汇放在根目录 `GLOSSARY.md`，架构决策记录（ADR）放在 `docs/adr/`。

## 探索代码前

- 阅读根目录的 `GLOSSARY.md`。
- 阅读 `docs/adr/` 中与当前工作相关的 ADR。

文档不存在时，直接继续工作。由 `domain-modeling` 在术语或决策明确后按需创建文档。
`grill-with-docs` 和 `improve-codebase-architecture` 可以调用该技能。

## 文档布局

```text
/
├── GLOSSARY.md
└── docs/adr/
    └── 0001-<decision>.md
```

本次配置只记录路径和读取规则。领域内容由后续实际工作产生。

## 使用领域词汇

在任务标题、重构建议、假设和测试名称中，使用 `GLOSSARY.md` 定义的术语。
需要的概念未收录时，先检查现有项目用语。确有缺口时，记录给 `domain-modeling`。

## 说明 ADR 冲突

输出与现有 ADR 冲突时，明确指出对应 ADR，并说明重新讨论该决策的理由。
