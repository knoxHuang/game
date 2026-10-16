# 共用怪物辨识重绘

2026-10-16，使用内置 ImageGen 编辑 `public/assets/game/actors.png`，未使用外部素材。用途是修复首关怪物与冷灰地面的明暗混合。三种共用原型怪物同时采用新图；主角继续采样原始图集，像素保持原样。

## 资产与导出

- 母图：`enemies-readable-master.png`；原始生成文件为 `exec-046ce4a3-0c3c-4181-b2a0-e3031ea063f8.png`。
- 运行图：`public/assets/game/enemies-readable.png`，1254×1254，RGBA。保留原图的4列方向布局：下、左、右、上。仅使用第2～4行，第一行不进入主角采样。
- 无损压缩：Pillow 12.3.0，PNG `optimize=True, compress_level=9`。1,852,066 → 1,722,849 字节，节省129,217字节（6.98%）。尺寸和解码RGBA逐字节一致，透明通道保留，没有减色、缩小或有损转码。
- `src/art.ts` 按原内容区域裁去透明空白，保留比例，并复用原有四向步态派生、蓄力与攻击变形。不是新绘的七动作逐帧图集。现有副本仍为prototype。

## 分层配色

背景保持上一轮低饱和冷灰靛木板；主角保持黄雨衣；潮蛰兽采用大块象牙骨甲和深青关节；附蛰虫采用珊瑚红、浅鲑甲片与深红关节；秘仪师采用浅紫外袍和深紫内衬，权杖保留独立浅色轮廓。掉落底托、经验菱形和危险圆形保留。

新图不是单纯加描边。对不透明主体像素测量Rec.709加权平均亮度（非线性RGB，0～255，仅用于前后相对比较）：潮蛰兽50.8→94.2，附蛰虫55.7→88.0，秘仪师38.6→81.9。

## 验证

隔离临时浏览器上下文使用真实游戏、Renderer和HUD。运行截图在 `artifacts/enemy-readability/`：320×480、360×640、414×896，覆盖普通、游戏减少动态、系统减少动态、北侧/西侧/南侧、敌群靠近。方向与身体轮廓、深浅地板及外围灯光区域均做目视复核。普通与密集场景追加灰度检查。不是手机真机结果。

## 实际提示词

参考图是原角色图集，同时作为编辑目标、造型及画风依据。

> Use case: precise-object-edit. Edit this transparent 4x4 pixel-art game character atlas. Preserve exact 16-cell layout, poses, direction order (down,left,right,up), creature anatomy, scale, padding and full silhouettes. Row 1 yellow raincoat investigator stays unchanged. Redesign colors and internal value grouping of ONLY the three enemy rows for readability at 40px on medium-dark desaturated slate-indigo timber. Row 2 barnacled hound: broad pale chalk/ivory shell plates across head, shoulders, forearms, back and claws; strong deep petrol joints and belly; small turquoise gills; amber eyes. Body should read as bright bone-armored beast, not muddy teal. Row 3 spiny ranged crab: saturated coral-red/copper shell with broad light salmon plates and dark burgundy underside/joints; clearly separated pale claws and readable legs, small acid-green mouth. Row 4 hooded caster: luminous dusty lilac and pale mauve cloth on large upper hood, shoulders and outer robe folds, deep plum inner robe, dark empty face; pale silver-brass staff clearly separated from torso with restrained mint flame. Keep gothic nautical horror materials, exquisite fine pixel illustration and controlled texture, not cute, flat, cartoon or glowing ghosts. Simplify tiny speckle into larger coherent material planes so head, body and each limb remain distinct at real gameplay scale, including grayscale. Enemy body midtones must be visibly brighter than the ground, not just little eyes or rim light. No thick outline or halo. No ground, cast shadows, text, labels, UI or new objects. Real transparent background. The supplied atlas is the edit target and identity/style reference.
