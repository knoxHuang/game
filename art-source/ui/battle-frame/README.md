# 统一战斗边框与双卡槽

历史候选，已由 `../harbor-mystery/README.md` 所述的统一像素海港边框替换。保留本包作制作记录。

2026-10-16。内置 ImageGen 在一张母图中同时生成上下栏。用户要求：统一美术，贴附手机屏幕上下及左右边缘，底部容纳急救与闪避两个卡槽，并增强视觉冲击。最终采用海兽铜雕、锈蚀黄铜、深海蓝绿金属、红珊瑚和幽绿符文。此套取代本轮早期分别生成的上下栏。

## 源图与运行资源

- `master.png`：1536×1024统一母图。中间空白透明，上下栏均来自同一次生成。没有烘焙动态文字、数量、技能图标或进度填充。
- `battle-status.png`：从母图原坐标(0,0)提取1536×340。运行资源为 `public/assets/ui/battle-status.webp`。
- `battle-dock.png`：从母图原坐标(0,608)提取1536×416。运行资源为 `public/assets/ui/battle-dock.webp`。
- 消费者为 `src/game-ui.css`。顶部保留64 CSS像素和48×48暂停触摸区；文字内缩避开海兽雕饰。底部装饰贴边，卡槽按钮最小56×56，图标、急救数量与闪避冷却均由真实游戏状态绘制。空白底座允许浮动摇杆起拖，临时交互和旧规则职业能力保留在底座上方。没有新增循环动画。

## 导出与压缩

Sharp只提取矩形，不缩放或重绘。各PNG导出后，执行 `cwebp -lossless -exact -m 6`。分别比较PNG与WebP的尺寸和全部解码RGBA字节，包括透明像素颜色，完全一致。仅采用体积更小且验证通过的结果。

顶部：1,299,610 → 809,474字节，减少37.7%。底部：1,573,866 → 974,186字节，减少38.1%。详细区域、字节数和验证见 `compression.json`。母图与运行资源分开保存。没有新增运行依赖。

## 运行检查

`artifacts/battle-status/` 使用真实GameView和Phaser Renderer的隔离内存夹具。覆盖320×480、360×640、414×896的普通、满血、濒危、Boss两阶段、游戏减少动态、冷却、急救耗尽，以及系统减少动态偏好。检查48像素暂停触摸外沿与恢复、卡槽点击、左侧底座起拖、状态文本宽度。没有读取或写入用户存档，尚未做手机真机验收。

独立视觉评审后，补全长屏底座前的海面：运行时采样首关背景底部5%的现有海面纹理，在战区下方重复延伸，不拉伸竞技场或改变镜头、碰撞。添加纹理帧时保留原默认帧，防止缩放重建场景时误采海面。Boss栏内衬读取顶部资源(390,65,920,110)的空白深海金属区域，配合细黄铜边缘与槽体，维持原28像素高度。闪避冷却显示秒数、压暗图标，并采用切角遮罩，去掉额外矩形框。没有新增或重编码图片。独立评审重新检查三种尺寸下普通、濒危、Boss与冷却共12张截图，未发现阻断问题。

## 最终生成提示词

Use case: stylized-concept. Create a MUCH MORE DRAMATIC, PREMIUM CTHULHU GAME HUD MATCHED PAIR in ONE unified production atlas. Previous reference is too flat and timid: redesign with powerful sculptural silhouette, rich relief, dramatic brass highlights against abyss-black recesses, compelling visual anchors. Overall 3:2 landscape image containing TWO FULL-WIDTH HORIZONTAL UI PARTS, TOP edge-attached health/status bar in top third, BOTTOM edge-attached double-skill dock in bottom third, transparent empty gap between them. Entire image ONE consistent highly detailed fine-pixel dark fantasy game illustration, same rusty ancient brass, same blackened jade/teal, same sharp small pixel texture, same green rune emission, same restrained coral crimson and warm brass on both parts. NOT photorealistic. No perspective, flat orthographic UI export. NO TEXT, numbers, icons, example bar fills, letters, watermark. Both bars physically grow from canvas TOP/BOTTOM and LEFT/RIGHT EDGES, cropped flush with NO outside margins and NO detached floating card silhouette. TOP: at far LEFT a compact ferocious sculpted bronze Cthulhu face, tentacle beard and two brilliant jade eyes, occupying only first 14% of width and upper 65% of top bar; tentacles clutch thick riveted rails. Right 80% has a calm very dark teal horizontal readout inset with plenty of blank room for dynamic health and level. Thin aged parchment status ribbon spans lower 25% of top bar, unobstructed. Far right rim has a restrained circular metal mounting, no pause icon baked in. BOTTOM: at left 25% a LARGE majestic Cthulhu nautical idol relief, tentacles welded into panel perimeter, green luminous cracks and a small bright abyssal eye as unmistakable focal point; center-left quiet dark hammered metal joins it to TWO DEEP EMPTY OCTAGONAL SQUARE SOCKETS in right half. Socket centers EXACTLY 62.5% and 84.5% canvas width, identical rims, each about 18% width, deep black flat centers reserved for later icons. Thick sculpted gold-brass rims, rivets, coral fused into seams, runic channels connecting both slots. Strong coherent rhythm, memorable silhouette, strong light-dark hierarchy, polished premium action roguelite HUD. Ornament must reinforce screen-edge attachment, never float in the middle; no loose curls or debris in transparent gap, no tall spires, no giant surrounding frame, no scenery. Dark readable center areas; all drama concentrated in outer structure and LEFT sculptural anchors. The two parts must unmistakably belong to ONE artifact, as if an ancient sea-god machine grips the phone screen from above and below. Actual transparent background between bars.
