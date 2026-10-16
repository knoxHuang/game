# 林烬整备立绘

当前版本（2026-10-16）：已切换为固定坐标的完整内搭、雨衣与握帽前景三层。三个竖屏尺寸及穿脱已在浏览器验证；截图和来源见 [`shared-master`](../../../art-source/characters/shared-master/README.md)。下方提示词记录保留生成历史，不代表本次重新生成。

2026-10-15，内置 imagegen 生成，项目原创角色。用于角色页与职业展台，不替代战斗方向动画。

- `linjin-base.png`：1024×1536透明PNG。复用完整普通内搭底图，保留林烬的脸、深色短发、裤子、靴子及正面偏侧站姿。卸衣时不再拼接母图中的零碎衣片。
- `raincoat-layer.png`：1024×1536透明PNG。固定坐标提取穿戴母图中的黄色雨衣与手持帽子。与底图共用完整画布，不使用旧的百分比偏移或分别拉伸宽高。
- `raincoat-grip.png`：1024×1536透明PNG。来自同一穿戴母图的右手局部前景，叠在帽子上方，保留握帽遮挡。卸衣时一并移除，显示底图原有空手。
- 潜水护衣外观读取 `../equipment/diving-coat-layer.png`。根据真实装备ID切换，沿用相同画布、内搭与握帽前景；来源及技能验证见 [`装备外观`](../equipment/README.md)。
- 武器沿用`game/items.png`与`game/field-tools.png`的实际内容切图，独立展示。新增装备不生成组合人物。
- 完整雨衣母图仅存于`art-source/characters/linjin-raincoat-reference.png`，不放入运行目录。

参考：`lobby/investigator-cutaway.png`为原始黄色雨衣识别；先生成露正脸母图，再派生内搭与雨衣层。保留像素笔触、黄铜细节、暖光和深海阴影。

提示词记录（原调用要点）：

1. identity-preserve：将背面外勤调查员改成正面偏侧站姿，年轻东亚男性林烬，短黑发与清晰面部，黄色雨衣、米白内搭、深色长裤、棕靴，帽子拿在手中，无武器，完整身体，透明背景，精细像素画。
2. identity-preserve：仅移除黄色雨衣与手持帽子；固定脸、发型、站姿、构图、皮带与靴子；保留米白长袖普通内搭，双手空置，透明背景。
3. precise-object-edit/background-extraction：仅保留黄色雨衣、衣领、袖口、黄铜纽扣与帽子；移除人物、皮肤、内搭、裤子、靴子；衣襟与袖口空隙透明，作为单独穿戴层。

历史源输出：Codex generated_images中同日`exec-ccfd38ee...`（母图）、`exec-b423b5c5...`（内搭）、`exec-c50aaf18...`（旧雨衣层）。旧层依赖比例校准，领口与手腕无法同时贴合，已被替换。

先前正面版本的母图、完整提示词、旧图备份与无损压缩记录见 [`posture-fix`](../../../art-source/characters/posture-fix/README.md)；雨衣制作历史见 [`raincoat-fit`](../../../art-source/characters/raincoat-fit/README.md)。运行时角色页和职业页共用`src/character-art.ts`及`src/character-panel.css`，服装与底图使用同一坐标系。
