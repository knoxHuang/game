# 共用游戏美术

以 `../lobby/cutaway-harbor.png` 为画风基准。所有资源由内置 ImageGen 生成。2026-10-15 接入。保留透明 PNG 原图；`src/art.ts` 在运行时按图集区域读取，裁去透明留白，保持内容比例。没有新增图像处理依赖。

| 文件 | 用途 |
| --- | --- |
| `actors.png` | 黄色雨衣调查员、潮蛰兽、附蛰虫、溺亡秘仪师。四列为下、左、右、上。用于战斗四向姿态。 |
| `bosses.png` | 潮汐巨像、万眼主祭、克苏鲁化身完整透明战斗形象。海图画像继续使用 `../bosses/`。 |
| `items.png` | 左轮、防护服、组织样本、铜件、无线电、急救包、符印、案卷、仪器、提灯、补给箱、礁石、罗盘、背包、海图、工作台。案件、装备、物资、结算和战斗共用。 |
| `field-tools.png` | 鱼叉枪、仪式法杖、救护手册、扩建钥匙与蓝图。用于职业及设施入口。 |
| `pier-ground.png` | 1024 × 1536 的俯视湿木码头。连续纵向副本的默认场景；游戏碰撞仍由副本数据定义。 |

图集按实际内容区域采样，不假设生成结果严格等分。方向姿态是独立插画。运行时将现有透明轮廓拆为躯干和左右下肢，派生四拍步态；不新增图片下载，不将其描述为手绘逐帧动画。步态按实际位移推进，支持移动射击；停住、暂停和瞬移时归位。普通怪物另有蓄力压身、攻击前探和待机呼吸。用户与系统减少动态效果均关闭循环步态和呼吸，保留静态危险预警。战场背景压低亮度和暖色反光，角色保留原图颜色，证物以小图标和短下划线区分于活敌。

新增副本可以通过副本包的 `sprite`、`floorArt`、`wallArt`、`obstacleArt` 和分段背景提供独立资产；默认资源仍使用本套精细插画。游戏文字、数量和状态由界面渲染。

## 生成提示词

后续生成战斗资产时，先执行[战斗辨识与提示词](../../../docs/agents/dungeon-generation.md#战斗辨识与提示词)，将实际背景、黄色雨衣主角、敌人和特效的色彩与明暗关系带入各自提示词。下列共用画风描述不能替代分层配色；已有资产的实际生成记录仍保留原文。

共同要求：reference is style only; exquisite detailed tiny-pixel Cthulhu harbor game illustration, worn brass and old wood, amber edge light, cool teal shadows; no coarse blocks, no text, UI, grid lines or baked numbers. 透明图集要求 real transparent background, full isolated silhouette, generous padding。

- **角色**：4 × 4 atlas；row 1 same yellow raincoat detective with yellow souwester hat, backpack, dark boots and brass revolver；row 2 barnacled deep-sea melee hound；row 3 spiny ranged crustacean with acid green mouth；row 4 violet-black hooded occult caster with bronze staff；columns face down, left, right, up；elevated 3/4 top-down RPG camera, full body, no ground or cast shadow。
- **物品**：4 × 4 atlas；row 1 brass revolver, yellow raincoat armor, teal organic tissue jar, brass ship fittings；row 2 antique radio, first aid satchel, occult star seal, nautical logbook；row 3 lighthouse instrument, oil lantern, salvage chest, barnacled rock；row 4 compass, leather backpack, rolled sea chart, workbench tools；legible at 48 pixels, same lighting。
- **Boss**：three full-body bosses on a transparent 2 × 2 atlas；top-left broad armored colossus with barnacles, six tentacles, amber eyes and turquoise gills, matching tide-colossus portrait；top-right triangular many-eyed priest with coral crown and lower tentacles；bottom-left ancient Cthulhu avatar with bat wings and tentacled lower body；bottom-right empty；elevated RPG view, no scenic background。
- **副本地面**：portrait top-down continuous abandoned timber pier; boards run vertically; fine wet texture, moss, bolts and rope scuffs; calm dark central 75% for combat readability; thin teal ocean/stone edges; matching top and bottom for repetition; no characters, blocking props, horizon, text, stairs or rooms。
- **外勤工具**：2 × 2 transparent atlas；brass harpoon gun with rope spool；ritual staff with star ring and teal sigil；medical field notebook with investigator badge；brass keys and architectural blueprint scroll；no readable text, border, floor or caption。

## 界面使用

`src/game-ui.css` 管理全部共用材质。案件呈现为柜台上的案卷；整备呈现装备台与主角；升级呈现设施蓝图；档案呈现证物架；设置呈现通讯台；暂停与帮助呈现外勤手册；结算呈现调查封印与返港记录。各页面正文保持不透明底色，数据驱动入口与操作逻辑不变。

## 区域围攻背景

`dockyard-arena.png`：内置ImageGen参考大厅生成的开阔船坞，整体5:6构图，供20×24单位战区使用；独立掩体由配置叠加。母图、实际提示词与导出状态见 `art-source/dungeons/tide_colossus/README.md`。当前是高密度PNG原型，ready规格导出尚未完成。
