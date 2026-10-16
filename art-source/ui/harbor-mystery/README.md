# 神秘海港战斗界面

2026-10-16。依据用户后续反馈，回到既有精细像素海港画风。神秘感通过旧木、锈铜下显现的残缺航海刻线、冷蓝绿反光与局部潮痕表达。用户明确排除了恶心的生物侵蚀、巨大怪脸和不统一的星空玻璃质感。

## 制作与来源

使用内置 ImageGen，在同一张887×1774透明母图中生成顶部、侧缘与底部。主参考为 `public/assets/lobby/cutaway-harbor.png`、实际战斗截图和 `public/assets/ui/brass-panel.png`。保留旧木、黄铜、绳索、暖提灯与冷海色的同一绘制方式。`base.png` 是第一张同风格底稿，`master.png` 是按独立评审意见细化的当前母图；去掉大块垂落布状轮廓，三处折返海图刻线从原材质下显现。

运行资源：`public/assets/ui/harbor-mystery-frame.webp`。不包含人物、场景、动态文字、示例数值、图标或生命填充。上下与两侧共用一个透明九宫格边框，不分别拉伸多张不同风格图片。CSS切片为上11.3%、左右7.2%、下15%，保留中心透明内容。中心采样最大alpha为1/255，保留生成原始RGBA。

`src/game-ui.css` 负责边框和控件；顶部预留80 CSS像素，镜头使用 `src/battle-camera.ts` 相同高度。生命文字叠在真实生命进度上，经验使用独立3像素线。暂停保留48×48触摸范围，底部右侧急救与闪避至少56×56。左侧及边框空白仍支持浮动摇杆。没有新增循环动效。Boss栏内衬采样同张母图的空白木材区域（x30%、y3.5%、宽40%、高2%），仍占28像素。

## 无损压缩

`cwebp -lossless -exact -m 6`：989,956 → 730,094字节，减少26.2%。PNG和WebP均为887×1774，逐字节比较所有解码RGBA完全一致，包括透明像素颜色。没有缩放、减色或有损转码。结果见 `compression.json`。

## 验证

实际GameView与Phaser Renderer的隔离内存夹具，截图见 `artifacts/harbor-mystery/`。覆盖320×480、360×640、414×896的普通、满血、濒危、Boss两阶段、112残敌、减少动态、冷却与急救耗尽；另测系统减少动态偏好。检查暂停外沿点击和恢复、卡槽点击、底座左侧起拖、读数宽度和触摸范围。没有读取或写入用户存档。浏览器结果不代表手机真机验收。

最终21个浏览器场景无运行错误、状态行溢出或小于48像素的触摸目标；22项控件及定时战斗测试和构建通过。独立复查确认材质、卡槽、暂停凹槽及长屏没有视觉阻断。三处刻线属于第二眼可察觉的克制神秘暗示，不将其描述为强烈生物侵蚀。独立复查依据截图，交互与动态结果另见本地夹具检查记录。

## 底稿提示词

Production UI asset for THIS EXACT EXISTING PIXEL-ART HARBOR GAME. Image 1 is the approved game's world style; Image 2 shows actual battlefield pixel density and palette (ignore its old UI); Image 3 is the game's existing brass-and-wood UI material, the PRIMARY craft reference. Match their matte illustrated pixels, warm aged brass, dark wet timber, cool sea-teal shadows and tiny amber edge highlights. Do not introduce another rendering style.
Create ONE transparent PORTRAIT 1:2 screen frame, top, sides and bottom designed together. Mystery comes from an old harbor instrument quietly marked by impossible tides: broken engraved nautical circles, incomplete geometric seals partly worn away, ink-dark tide stains creeping across wood and brass, a few faint cold-green light strokes that seem to continue underneath the metal, small reflected ripples in the corners. The screen seems subtly touched by an unknown presence. Patient, quiet, enigmatic, beautifully composed. Use restrained large shapes and sparse fine marks, low ornament density; weathered material first, supernatural clues second. No disgusting biological material, eyes, faces, tentacles, slime, bone, teeth or monster sculptures. No crystal shards, galaxies, star gems, bright neon, shiny 3D metal or dense decorative filigree.
Layout for mobile: outer edges flush and anchored beyond screen. Huge central gameplay opening is genuinely transparent. TOP 13% height: a single blank dark wood readout at x14%..84%, y2%..8%; a thin blank aged parchment strip below at x14%..84%, y9%..12%; empty circular brass pause recess at x92%, y5%. Small partial engraved navigational ring in top-left, same simple brass craft as reference 3. SIDE edges are thin, roughly3% width, fragmented and mostly transparent, a few mysterious ink traces reaching inward. BOTTOM final15% height: two EMPTY brass-rimmed square skill recesses at x64% and x85%, y92%, about18% canvas width each; quiet dark wood centers, no icons. Bottom-left mostly transparent, only a low worn timber/brass screen-edge rail with a partial faded seal. Keep all marks outside reading areas. No text, numbers, labels, icons, watermark, characters or scenery. Real alpha transparency. Cohesive exquisite PIXEL ILLUSTRATION matching all three references; an ordinary harbor artifact made quietly uncanny.

## 细化提示词

Precise production refinement of THIS EXACT PIXEL HARBOR UI. Preserve the entire wood/brass material, pixel density, palette, top readout, blank parchment, circular pause mount, TWO bottom-right square sockets and their positions. Keep nautical lamp warm amber, same craft as this reference. User wants MYSTERIOUS unknown influence, not disgusting anatomy or a different fantasy style.
Make ONE coherent supernatural motif emerge from UNDER existing timber grain and copper corrosion: an IMPOSSIBLE TIDE-CHART LINE that folds inward and returns to a wrong point, like an ancient navigation seal that cannot close. Show this same distinctive broken-line geometry in ONLY THREE PLACES: inside the top-left compass ring behind its normal brass needle, a small middle-right border segment, and lower-left timber base. Each mark roughly35..45 pixels across in this887-pixel-wide artwork so visible on phone; engraved dark sea-green with a few very faint cold turquoise highlights and salt-pale spots, not neon. It should feel like a submerged seal briefly revealing itself underneath normal material. No alphabet, no stars, no decorative repeated runes. Ordinary surface elsewhere remains quiet.
Remove broad hanging blue cloth-like strips along the sides, keeping very narrow worn timber/brass with a few soft wet reflections and sparse uncanny traces. Side edges mostly open/transparent, no coarse rectangle. NO eyes, body holes, faces, tendacles, slime, flesh, teeth, horns, crystals or space galaxies. No monster ornament. Keep center and ALL empty gameplay area truly alpha-transparent. Centers of top readout and two ability sockets remain opaque dark timber, blank. No text, numbers, icons, watermark. All four edges flush to image, top/sides/bottom one unified hand-painted fine-pixel harbor game illustration. Preserve portrait1:2 canvas and layout exactly.

