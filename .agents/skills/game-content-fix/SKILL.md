---
name: game-content-fix
description: "修复副本数据、注册、资源引用、海图、开放条件、路线与碰撞配置；新增完整副本使用 game-dungeon-production。"
---

# 副本与内容修复

先执行 [游戏技能共用约定](../../../docs/agents/game-workflow.md)。

## 调查入口

读取 [副本生成流程](../../../docs/agents/dungeon-generation.md)、[副本设计](../../../docs/design/instance-design.md) 和 `src/content/schema.ts`。检查 `src/content/dungeons/`、`registry.ts`、`src/maps.ts`、`src/geometry.ts` 与 `scripts/content-check.ts`。

## 排查与修复

1. 用副本 ID 定位源 JSON，运行内容校验，保留目标包的具体错误。生成目录是输出，修改源包后重新生成。
2. 区分数据不合法、资源缺失、注册失败、开放条件、路线不通与运行时行为错误。渲染异常、合法配置下的战斗异常转读对应技能。
3. 用契约核对字段和支持行为，保留关联存档的稳定 ID。路线分段管理场景与设施，五波配置管理计时编队；对旧流程文档中的残留字段描述以契约核实。
4. 修复最小受影响配置或校验逻辑。缺少引擎能力时先明确能力范围，不能以未知字段假装支持。
5. 运行内容校验、相关测试与构建，再实际选择目标副本，检查受影响的海图、路线、碰撞、生成与撤离。视觉修改按根目录要求截图。

## 完成条件

目标缺陷消失，包状态与完整程度一致。只有完整内容交付才按流程执行目标 `content:ready`；普通修复不冒充完整副本制作。
