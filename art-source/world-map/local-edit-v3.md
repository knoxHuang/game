# 海图舒缓修订 v3

用户要求：眼睛过多，引起不适，需要替换。移除密集写实眼球，改为钟、石拱、稀疏紫色珊瑚和抽象石刻。保留修道院与仪式水纹。

工具：内置 imagegen。编辑目标：`boss-biomes-v2-master.png`。输出：`exec-6a8b282d-d867-49d0-b85d-db950bb2c1fe.png`。项目母图：`boss-biomes-v3-master.png`。运行图：`public/assets/map/voyage-boss-biomes-v3.webp`。使用cwebp无损导出（-lossless -exact -z 9 -mt -metadata all）。生成器可能重绘局部纹理，不宣称其他区域像素完全相同。此变更不代表副本完整美术通过ready。

## 实际提示词

> Use case: precise-object-edit. Edit this exact 724x2172 long vertical pixel art game sea chart. USER FEEDBACK: the biological eyes are uncomfortable. Remove ALL realistic eyeballs, pupils, eyelids and fleshy eye sockets from the monastery band y37%-60%. Replace each big eye growth with weathered violet-black stone arches, sparse branching coral, small old brass bells or dim amber stained-glass slits WITHOUT iris or pupil. Communicate the many-eyed priest indirectly using ONLY TWO tiny abstract eye-shaped stone engravings (simple flat carved almond motif, no anatomy, no organic eyeball) on distant monastery masonry. Main visual should be submerged bell towers, restrained dark purple haze, corroded bells, concentric ritual ripples, and quiet violet coral. No clusters, no repeated holes, no body horror. Comfortable mysterious atmosphere with good negative space. Keep composition, pixel detail, geography, monastery tower silhouettes and coordinates unchanged. Preserve top impossible megalithic stairs/doorway and bottom barnacled harbor, ships, caves, water, rocks and fog exactly as closely as possible. Preserve the 1:3 canvas, no cropping. No text/UI/characters/route lines. Change only eye treatment, not the overall map.

验收：724×2172母图与WebP的RGBA像素完全一致。已在320×480、360×640、414×896浏览器竖屏复查。密集眼球已移除，主要地标、角色和操作按钮可见。运行截图：`artifacts/interface-review/07-priest-gentle-*.jpg`。内容校验与生产构建通过。
