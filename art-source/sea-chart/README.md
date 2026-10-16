> 历史探索稿，已被 `art-source/world-map/README.md` 中的Boss驱动纵向航图替换；旧运行图不再随游戏发布。

# 深海航图

日期：2026-10-15。内置 imagegen 生成原创环境图，参考大厅的精细像素画法，以及旧海图的世界题材。仅替换副本选择背景，不增加副本战斗资产，不将原型包标为 ready。

- 母图：`world-map-master.png`，1024×1536。
- 运行图：`public/assets/map/deep-sea-chart.webp`，同尺寸、无损 WebP。
- 来源输出：`exec-9774a871-6967-4b6f-9aee-fe9719914b30.png`。
- 背景分区：下方近岸沉船与暖灯港口；中央偏左的紫光修道院；上方偏右的星蚀裂隙。
- Boss 沿用共用透明图集 `public/assets/game/bosses.png`，经运行时真实内容切图后叠加。路线、标牌、文字和开放状态全部由界面层绘制。
- `cwebp -lossless -exact -z 9 -mt -metadata all`：3,226,673 → 2,213,140 字节，减少31.41%。用 Pillow 核对解码 RGBA 与尺寸完全一致。详情见 `compression.json`。
- 不因地区未开放而减少触摸范围；未开放地点可以预览，启程由状态规则校验。系统或游戏减少动态设置关闭雾与巨物循环效果。

## 实际生成提示词

> Use case: stylized-concept. Asset: production VERTICAL ocean world-map BACKGROUND for a mobile pixel-art Cthulhu harbor game, NOT a UI screenshot. Reference image 1 is the authoritative detailed pixel technique, materials and amber/teal mood. Reference image 2 is the OLD map: redesign its geography and composition completely while keeping world identity. Make a breathtaking large-scale voyage into a stormy abyss, far grander depth and lighting than old map, yet strictly exquisite tiny-pixel illustration with visible deliberate pixel clusters, NOT smooth realistic painting. Portrait 2:3 composition. Three regions ascend in danger from BOTTOM to TOP: bottom foreground near 70-88% height a weathered amber-lit harbor, tiny wrecked sailboats and drowned timber piers to the RIGHT (around 68% x, 70% y) with a dark OPEN WATER pocket for a separately composited armored sea monster; middle LEFT (around 27% x, 44% y) a huge half-sunken Gothic monastery, broken bell tower and violet-teal ritual light with an OPEN dark water pocket in front for a separately composited priest; upper RIGHT (around 66% x, 19% y) enormous black basalt ruins and a vertical star-eclipse rift, a dim spectral sky opening above the far ocean, ominous green aurora. Keep center ocean as a serpentine passage linking the regions with quiet wave swirls, dramatic volumetric sea fog between islands, colossal scale made legible by TINY ships and rock spires. Rich navy/sea-green/black, amber harbor pools only below, restrained violet near monastery, pale spectral green far above. Readable regional silhouettes even at 360px width. No characters, NO monsters or creature silhouettes (bosses are separate layers), NO text, numbers, icons, buttons, borders, UI, compass rose, baked dotted routes or selection circles. No coarse geometric placeholder art. Coastlines and major landmarks must stay within central 65% width because mobile crops sides. Bottom 10% quiet dark water behind a later interface strip; top 10% dark storm sky without key landmarks behind a later title. This is an environmental chart with atmospheric oblique bird's-eye/isometric depth, not a combat floor. Make the image feel dangerous and vast, not a tidy tourist island map.

提示中的地图坐标是构图依据。运行标记使用配置坐标：潮汐巨像(70,71)、万眼主祭(27,44)、克苏鲁化身(70,20)。标牌在极高竖屏中限制到可见宽度内，仍保持至少48像素触摸范围。

## 实机验收

320×480、360×640、414×896已检查，三个地点触摸高度至少48像素，底栏不遮挡地点入口。已实测首区无案件出发、重载恢复暂停、后区预览禁用启程、档案展开/Escape收起及游戏减少动态开关。截图见`artifacts/interface-review/04-sea-chart-*`。32项测试通过；原型包仍保留完整内容验收提示，不将本轮海图改动称为完整副本交付。
