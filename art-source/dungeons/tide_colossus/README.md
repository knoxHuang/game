# 黑潮船坞区域背景

用途：区域围攻原型的完整地面与外围边界。使用内置 ImageGen，参考 `public/assets/lobby/cutaway-harbor.png` 的绘制方式。不是神祇画像或战斗角色。

母图：`arena-master.png`。运行图：`public/assets/game/dockyard-arena.png`。本轮直接保留生成器原始 PNG，作为高像素密度原型背景；尚未按 ready 包的 640×768 / 768 KiB 规格导出，内容校验会提示。

场景为20×24地图单位，俯视开阔船坞。只烘焙平面纹理与外围装饰。可碰撞掩体、人物、怪物、掉落、信标、文字和预警均由运行层单独呈现。

实际生成提示词：

> Use case: stylized-concept. Production top-down game arena ground background for the existing fog harbor Cthulhu pixel game. Reference image is style only: fine tiny-pixel illustration, detailed wet wood, aged brass, cool teal night with small amber lanterns. Make one complete broad rectangular abandoned dockyard, width to height 5:6, strictly overhead RPG camera, no horizon/perspective. This is an open combat ARENA, NOT a long thin corridor. Central 85 percent is clear traversable wet timber paving with quiet readable texture, irregular board patches, subtle occult salt stains and rope scuffs. The outermost narrow border contains sea water, low weathered stone quay edging, corner mooring bollards, small amber dock lamps; do not place buildings, crates, rocks, barricades or blocking props inside the open playable floor. Keep east-west and north-south circulation equally open. No characters, monsters, ships in the middle, items, text, numbers, HUD or UI frames. Neutral floor lighting supports readable projectiles and enemy telegraphs. Portrait 5:6 composition representing a 20 by 24 tile arena. Opaque full background.
