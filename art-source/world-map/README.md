# 纵向世界航图：Boss 与环境对应

2026-10-15。当前运行资源：`public/assets/map/voyage-boss-biomes-v3.webp`。内置 imagegen 生成；当前母图 `boss-biomes-v3-master.png`，724×2172。只替换世界海图，不代表三个副本的独立战斗资源已补齐。三包仍为 prototype。

## 先确定 Boss，再制作污染环境

生成前先核对该区域实际放置的 Boss、已有造型、原著/原创边界，再确定环境。完整依据见 `boss-environment-basis.json`。

| 区域/Boss | 设定依据 | 本轮环境表现 |
| --- | --- | --- |
| 近岸/潮汐巨像 | 本游戏原创；甲壳、藤壶、六触肢、青色腮与异常潮汐 | 钙壳侵蚀船坞、藤壶覆盖沉船、拖拽痕迹与潮线；污染规则为原创扩展 |
| 外海/万眼主祭 | 本游戏原创；珊瑚礼冠、多眼、黑紫祭袍、钟室仪式 | 眼状珊瑚、钟体、淹没祭台与层叠水纹；污染规则为原创扩展 |
| 沉没深渊 | 尚未确定 Boss | 只保留海雾与未知地形，不画专属魔法奇观 |
| 终章/克苏鲁化身 | 原著拉莱耶环境；化身是游戏改编 | 绿渍巨石、黏液、巨大门扉与异常角度；具体污染蔓延规则是游戏扩展 |

原著依据：[H. P. Lovecraft, The Call of Cthulhu](https://www.hplovecraft.com/writings/texts/fiction/cc.aspx)，第三节拉莱耶段落。只据其巨石、门扉和几何描述确定环境，不把天空巨眼或蓝色引力涡称为克苏鲁原著特征。`lore.reviewed` 与 `art.reviewed` 未因此擅自变为 true。

## 运行结构与验收

长幅背景只负责环境。Boss、航线、地点、文字与状态独立叠加。竖屏采用原生纵向滚动，鼠标可按住拖动；无缩放模式。首尾不加空白边距，滚动限制在底图范围。海域可加入多个 Boss，解锁使用明确的前置报告，不依赖全局列表上一项。终章仍要求后期主线，现有两份报告不能直接解锁。

无损压缩：`cwebp -lossless -exact -z 9 -mt -metadata all`，3,511,025 → 2,445,624 字节，减少30.34%。Pillow核对尺寸与解码RGBA逐字节一致；详见 `compression.json`。

## 当前版本实际提示词

> Use case: stylized-concept. Production LONG VERTICAL SCROLLING WORLD SEA MAP, portrait 1:3, 1024x3072 preferred. Ref1 is authoritative fine pixel harbor style; ref2 defines the EXISTING THREE BOSSES' materials and identities only; ref3 previous long-map geography only, do NOT copy its generic maelstrom. Main rule: environments are visibly altered by their specific local boss, NOT four arbitrary colored spectacle zones. One continuous atmospheric maritime world, bottom to top, islands and open-water passages, refined deliberate tiny-pixel illustration, elevated 3/4 map perspective, no smooth painting, no coarse blocks. BOTTOM 72-96%: ORIGINAL TIDE COLOSSUS TERRITORY around x55%,y82%. A modest harbor and wreck field partially colonized by huge chalk-white barnacle crusts, layered dark crustacean-like calcium plates spreading across wet timber, anchors and hulls; pale teal gill-like organic channels in encrusted rock, directional foam converging in abnormal tide bands, dragged ships, long gouges in shore and pier timbers. This pollution derives from armored barnacled six-tentacled sea colossus. Tiny surviving amber harbor lights are scarce, coastal settlements small relative to ocean. Leave dark water in front of ruins for separate boss overlay. LOWER-MIDDLE 45-63%: ORIGINAL MANY-EYED PRIEST TERRITORY around x32%,y56%. Recognizable half-drowned monastery and bell tower, old bronze corroded bells, dark violet ceremonial cloth caught between coral-encrusted columns. Coral forms eyelid-like apertures and clusters of small amber eye lights INSIDE windows, arches and drowned altar walls, as an original environmental adaptation of its coral crown and many eyes. Circular ritual terraces and repeated concentric water ripples organize the place around a submerged bell altar. No purple tectonic abyss: purple is restrained ritual residue within specific architecture, main materials stone/coral/bronze. MIDDLE-UPPER 25-42%: UNCHARTED SEA without a defined boss. Quiet deep navy ocean, dense grey-green fog, partly submerged natural reefs and uncertain distant shoals, space for later discovered locations. NO blue gravity maelstrom, giant glowing fissure, invented deity signature or finished temple here. TOP 3-22%: LATE CTHULHU AVATAR APPROACH around x54%,y17%, inspired by The Call of Cthulhu's R'lyeh environment: enormous greenish-black megalithic blocks coated in slime and weed, impossibly sloping terraces, huge carved monolith and doorway whose orientation is ambiguous, bent concave/convex angles and distorted perspective under poisonous miasma. Vast ancient scale compared with tiny boat wrecks. Sick green is damp mineral/ooze and dim atmospheric light, NOT a neon sky eye or a fantasy eclipse portal. Keep the avatar absent; its presence is inferred from wrong geometry and the ancient sea-soaked city. Across all regions, pollution fades into ordinary dark sea toward the edges rather than changing the entire map to one color. Each region has multiple side coves, drowned fragments and quiet water pockets for future encounter markers, not just a straight corridor. Ominous scale, wet material detail, selective amber highlights and cool sea shadows consistent with reference1. Environmental architecture only: NO bosses, living creatures, character silhouettes, text, UI, labels, navigation dots, numbers, borders or icons. No giant celestial eye anywhere. No luminous blue vortex. No geometric placeholder shapes. Top/bottom quiet dark foggy sea, seamless vertical voyage.

## 已废弃的探索稿

`world-master.png` 为被否决的横向缩放地图；`voyage-master.png` 为通用四海域长图；`madness-voyage-master.png` 为按用户提示生成但缺少 Boss 环境对应的奇观图。这些仅保留为母图历史，不进入运行目录。旧 `art-source/sea-chart/` 为更早三地点方案。当前版本撤去无依据的巨眼和蓝色空间漩涡。

## 初版自审状态（历史）

功能与来源检查已通过；美术主题审阅尚未完全通过。手机上潮汐巨像的钙壳/藤壶可辨，主祭区域的多眼污染仍需加强，终章几何错觉仍偏弱。320×480发现主祭顶部裁切，已按实际图像高度限制进行修正并复测。这里不以36项逻辑测试通过代替美术审阅。下一步应只局部完善现有环境，不新增Boss或副本内容。

## 局部修订v2

多眼污染与终章折返台阶已局部加强，三种竖屏尺寸复查通过，主祭上下裁切量均为0。当前海图可用；完整副本状态仍为prototype。实际编辑提示词、压缩和复查记录见[局部修订](local-edit-v2.md)。

## 舒缓修订 v3

用户反馈密集眼球引起不适。移除写实眼球和肉质眼睑，改用黄铜钟、石拱、稀疏紫色珊瑚与少量抽象石刻。此版本取代v2的眼球处理。见[提示词与来源](local-edit-v3.md)。
