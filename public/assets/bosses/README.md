## 当前运行资源（2026-10-16）

用户已允许运行图采用有损压缩以优先改善手机加载。当前运行文件统一使用 `-mobile.webp`，保持原尺寸和透明通道；原稿位置、逐项映射和校验见 `art-source/runtime-mobile/compression.json`。下文PNG及无损WebP记录保留为制作历史，不再作为运行路径。大厅确认参考图 `cutaway-harbor.png` 仍保留。

# Boss 调查画像

由内置 ImageGen 生成，使用 `../lobby/cutaway-harbor.png` 作为唯一画风参考。三张图片均为 1254 × 1254，不透明原始 PNG。用于副本海图标记与所选目标档案，不作为战斗动画贴图。

- `tide-colossus.png`：潮汐巨像。甲壳、藤壶、触肢、琥珀眼与青色发光腮部。
- `many-eyed-priest.png`：万眼主祭。黑紫祭袍、珊瑚冠、层叠眼睛与沉没教堂。
- `cthulhu-avatar.png`：克苏鲁化身。触肢面部、蝠翼、苍绿眼睛与星蚀。

`src/view.ts` 直接引用文件；`src/expedition.css` 对地图标记进行 CSS 近景裁切，档案保留较完整的画像。禁止重新接入 `art.ts` 中用于战斗的粗像素贴图作为头像。头像需与大厅保持相同纹理密度、光照与色调。

## 实际生成提示词

三次调用均使用以下共同提示，后接对应 Subject。采用内置工具，无 CLI 或新增依赖。

> Use case: stylized-concept. Asset type: square in-game boss portrait for a mobile Cthulhu investigation game. Reference image is STYLE ONLY: match its exquisite detailed pixel illustration, tiny deliberate pixels, rich weathered texture, cool ocean teal shadows, amber rim light. Make an ominous mature game illustration, not a coarse 16x16 sprite, not cute, not vector, not smooth digital painting. Single centered head and upper torso filling square with readable silhouette and eyes at thumbnail size; scenic dark maritime background; no text, frame, UI, watermark.

**潮汐巨像 Subject:**

> A huge ancient deep-sea armored colossus rising from wreckage: crustacean shell plates, barnacles and algae, several long curling tentacles, glowing pale amber eyes, luminous teal gill weakpoint. Head broad and low, visibly nonhumanoid.

**万眼主祭 Subject:**

> A gigantic eldritch high priest in a tattered violet-black ceremonial hood, coral crown and dozens of small luminous amber eyes arranged in tiers; writhing mouth tentacles, old bronze occult collar, submerged ruined cathedral behind. Tall triangular silhouette, horrifying and mysterious.

**克苏鲁化身 Subject:**

> An enormous ancient Cthulhu avatar with long octopus facial tentacles, towering ridged brow, piercing pale green eyes, gigantic folded bat wings barely visible behind shoulders, distant eclipsed star halo over a black ocean. Desaturated deep teal skin, ancient rough organic texture. Authoritative sinister silhouette.
