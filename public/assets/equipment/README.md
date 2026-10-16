## 当前运行资源（2026-10-16）

用户已允许运行图采用有损压缩以优先改善手机加载。当前运行文件统一使用 `-mobile.webp`，保持原尺寸和透明通道；原稿位置、逐项映射和校验见 `art-source/runtime-mobile/compression.json`。下文PNG及无损WebP记录保留为制作历史，不再作为运行路径。大厅确认参考图 `cutaway-harbor.png` 仍保留。

# 装备外观

2026-10-16，项目原创，使用内置 ImageGen 生成，按已确认的雾港黄铜与精细像素画风制作。完整提示词、母图、固定坐标处理、技能验证及无损压缩记录见 [`制作记录`](../../../art-source/equipment/skill-validation/README.md)。

- `diving-coat-layer.png`：1024×1536，潜水护衣人物叠层。复用黄色雨衣的透明轮廓与领口、袖口接点。穿戴 `diving_coat` 时由角色页和职业页共用；握帽前景继续读取 `character/raincoat-grip.png`。
- `diving-coat-icon.png`：640×912，潜水护衣库存图标，保留完整护衣及帽子；不是人物叠层。
- `brass-revolver-icon.png`：1211×867，精校枪机库存图标，黄铜与暗钢枪体、木握柄及航海锚纹。不是新增战斗动画。

运行图均在完成素材编辑与裁切后执行PNG无损压缩，逐一验证压缩前后的尺寸、全部RGBA字节一致。装备属性、强化费用和稳定ID沿用原规则。
