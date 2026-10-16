# 黑潮船坞区域背景

用途：区域围攻原型的完整地面与外围边界。使用内置 ImageGen，参考 `public/assets/lobby/cutaway-harbor.png` 的绘制方式。不是神祇画像或战斗角色。

母图：`arena-master.png`。运行图：`public/assets/game/dockyard-arena.png`。本轮直接保留生成器原始 PNG，作为高像素密度原型背景；尚未按 ready 包的 640×768 / 768 KiB 规格导出，内容校验会提示。

场景为20×24地图单位，俯视开阔船坞。只烘焙平面纹理与外围装饰。可碰撞掩体、人物、怪物、掉落、信标、文字和预警均由运行层单独呈现。

实际生成提示词：

> Use case: stylized-concept. Production top-down game arena ground background for the existing fog harbor Cthulhu pixel game. Reference image is style only: fine tiny-pixel illustration, detailed wet wood, aged brass, cool teal night with small amber lanterns. Make one complete broad rectangular abandoned dockyard, width to height 5:6, strictly overhead RPG camera, no horizon/perspective. This is an open combat ARENA, NOT a long thin corridor. Central 85 percent is clear traversable wet timber paving with quiet readable texture, irregular board patches, subtle occult salt stains and rope scuffs. The outermost narrow border contains sea water, low weathered stone quay edging, corner mooring bollards, small amber dock lamps; do not place buildings, crates, rocks, barricades or blocking props inside the open playable floor. Keep east-west and north-south circulation equally open. No characters, monsters, ships in the middle, items, text, numbers, HUD or UI frames. Neutral floor lighting supports readable projectiles and enemy telegraphs. Portrait 5:6 composition representing a 20 by 24 tile arena. Opaque full background.

## 2026-10-16 战斗辨识重绘

问题由真实战斗复现：木板上的金色反光、蓝绿水痕、浅色大符号与怪物及微小掉落处于相近的明暗范围；手机尺寸下纹理抢占轮廓。

- 使用内置 ImageGen 编辑原船坞，以大厅图片作为画风参考。保留俯视构图与外围设施，不增加内部障碍。没有使用外部素材。
- 母图：`arena-readability-master.png`。运行图：`public/assets/game/dockyard-arena-readable.png`。1145×1374，RGB，二者解码成 RGBA 后逐字节一致。
- 无损压缩：Pillow 12.3.0，PNG `optimize=True, compress_level=9`。2,895,650 → 2,750,454 字节，节省 145,196 字节（5.01%）。没有缩小尺寸、减色或有损转码。
- 分层配色：地面为低饱和冷灰靛木板，暖灯只在外围；主角保持黄色雨衣；怪物保留原有实体形象，运行时步态纹理的单像素边缘分别采用银灰、珊瑚和淡紫；掉落以深色底托、浅边和证物三角标识分离，经验使用浅薄荷菱形与深描边。危险预警仍采用圆形及攻击方向线。
- 运行截图：`artifacts/combat-readability/`。使用隔离浏览器上下文与测试存档，在真实 Renderer 和战斗 HUD 中覆盖三种竖屏、三类普通怪、Boss、静态掉落和危险预警，另检查游戏与系统减少动态设置。不是手机真机测试。
- 本轮没有补齐整套副本动作资产；保留 `prototype` 和 `art.reviewed: false`。运行图尚未导出为完整包要求的640×768规格。

实际提示词（Image 1 为旧船坞，Image 2 为大厅）：

> Use case: precise-object-edit. Redesign image 1 as a production top-down combat arena ground for a detailed pixel-art Cthulhu harbor game. Image 1 is layout/edit target; image 2 is pixel illustration style reference only. Keep entire rectangular 5:6 overhead dockyard and thin sea/quay perimeter, no perspective or horizon. Repaint the walkable central 88% in quiet desaturated slate-indigo grey weathered timber, cool neutral violet-grey rather than teal or brown. Restrained medium-dark values, smooth broad readable board surfaces, sparse hairline seams; remove bright vertical amber reflections, cyan speckled puddles and large pale occult markings. Do not merely darken the original: actively simplify the high frequency noisy wood texture, eliminate alternating bright/dark strips and patchwork rectangles. This floor must recede beneath a saturated yellow raincoat player, teal shelled beast, reddish bronze crab, purple caster, ivory barnacled boss, and small mint/white loot. Visible fine pixel material craft and restrained damp grain, not flat geometric placeholder. Small amber mooring lights remain ONLY in thin outermost perimeter, muted navy seawater outside. All interior open walkable space, no solid props, stones, creatures, items, circles, symbols, text, UI or baked shadows. Flat even diffuse moonlight, no central glow, no vignette. Preserve fine hand-placed pixel illustration fidelity and clear rectangular boundaries. Output one opaque background, portrait 5:6.

## 2026-10-16 Boss与战斗画面完善

首关Boss单独以共用图集左上造型为参考，由内置ImageGen提取并重绘身体明暗。保留三角层甲、六触肢、藤壶、琥珀双眼及青色腮，使用浅石灰甲片、银蓝触肢上表面、浅吸盘和深蓝触肢间隙。其他Boss仍使用原共用图集。

- 母图：`boss-readable-master.png`，1536×1024 RGBA。原始生成文件为 `exec-611fcb98-47a8-4307-9ae3-7c9ce8abcabf.png`。
- 运行图：`public/assets/dungeons/tide_colossus/boss-readable.webp`。Pillow 12.3.0，WebP `lossless=True, exact=True, quality=100, method=6`：2,868,195 → 2,070,040字节，减少798,155字节（27.83%）。PNG优化候选为2,784,437字节，采用更小的无损WebP。逐字节验证解码RGBA及尺寸一致，透明像素的RGB也保留。未缩小文件尺寸、减色或有损转码。
- 运行时对Boss透明内容进行高质量缩小，生成最长边256像素的纹理，再线性采样显示。这是内存中的抗锯齿采样，不属于上面的文件无损压缩。
- 第二阶段轻微紫色染色保留亮部；蓄力色改为浅暖色，避免整块身体被乘色压暗。主角显示高度增加约13%，普通怪物约9%，同步上移中心与血条/交互文字，保留脚底、碰撞、镜头与数值规则。
- 危险区域用暗衬边、浅亮边和静态斜纹表示。边界中心对应原有伤害半径；环境危险也使用暖红色，法术使用淡紫。减少动态模式保留这些形状。
- 实际运行截图：`artifacts/combat-polish/`。三个手机视口覆盖普通、密集敌群、Boss两阶段、合法贴边生成、三类危险区和游戏/系统减少动态设置，并追加灰度检查。测试夹具按现行`bossHealth(run)`读取生命值与第五波状态；早期截图误用旧Boss生命值而提前进入二阶段，这轮已更正。贴边测试通过真实`spawnPoint`生成位置。不是手机真机测试。
- 本轮只完善首关静态原型与共用战斗渲染，未补齐七动作逐帧图集，继续保留prototype及未审核状态。

实际提示词（参考图为原共用Boss图集，只有左上潮汐巨像为编辑对象）：

> Use case: precise-object-edit. The attached transparent atlas is the identity/style reference. Extract and repaint ONLY the top-left tide colossus into one isolated full-body transparent combat sprite. Do not include the priest, winged creature, atlas grid or empty cells. Preserve the top-left creature's distinctive broad triangular layered armored head, two amber eyes, bulky shoulder shell, six thick curling tentacles, barnacles and turquoise gills. Same elevated top-down RPG view, same proportions and pose, full silhouette with generous transparent padding. Improve readability at only 120-160 pixels tall against medium-dark slate-indigo wooden floor: broad pale weathered limestone/ivory shell plates across face and shoulders, cool silver-blue tentacle upper surfaces, readable pale suction cups, deep navy creases between each separate tentacle, brighter turquoise gill slits. Maintain recognizable dark teal underlying flesh, but raise body midtones substantially and simplify scattered speckle into coherent large planes. Clear distinct ends of all six tentacles. Keep detailed refined nautical Cthulhu pixel illustration matching original, no thick outline, no halo, no smooth plastic or cartoon. Dominant silhouette must be readable in grayscale without relying on eyes or effects. Yellow raincoat player and coral-red/pale-purple minions must stay separate by hue. No ground, cast shadow, environment, text, UI, health bar or glowing circle. Real transparent RGBA background. One creature only.
