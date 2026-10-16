# 林烬头颈肩姿态修复

后续复核：用户仍指出领口和袖口细节异常，本轮历史截图不能证明整体贴合通过。后续固定坐标分层版本见 [`shared-master`](../shared-master/README.md)，已替换运行资源；本目录保留前一版制作历史。

2026-10-16，使用内置 ImageGen 编辑项目原创人物。用户指出人物存在歪脖子感。旧底图的头部偏向画面左侧，颈部斜接躯干，与接近正面的外套肩线不协调；只调整服装没有解决人物姿态。

当前母图为`linjin-front-source.png`，完整提示词见`prompt-front.txt`。先前的`linjin-base-source.png`、`prompt.txt`及`linjin-base-intermediate.png`保留仍有头颈偏转的中间稿，未作为最终版本。`linjin-base-before.png`和`raincoat-layer-before.png`备份修正前的两层。

保留林烬身份、深色短发、米白内搭、深色裤子、腰带与棕靴。中间稿仍保留了偏转的头部，与正面外套组合后不自然。最新版本统一为明确的正面站姿：脸、颈部与躯干朝向一致，双眼水平，颈部居中连接双肩。站姿与双脚朝向随正面姿态一起重绘，不是旧底图下半身的逐像素复制。画布保持1024×1536，透明PNG。

复用已制作的黄色雨衣层，将共用横向位置校准为8.4%；顶部7.6%、宽78%、高84%保持。角色页、职业页和旧档穿脱使用同一人物组件。验收先查看完整底图，再检查穿戴后的头颈肩关系及肩、腕、领口、下摆接点；不以显示矩形检查代替视觉审查。

最终版本的无损压缩使用Pillow 12.3.0，PNG `optimize=True, compress_level=9`。母图1,480,595字节，运行资源1,349,178字节，减少131,417字节（8.88%）。尺寸与解码RGBA逐字节一致，透明通道保留。详见`compression-front.json`；`compression.json`仅对应中间稿。仅将验证通过且更小的文件放入`public/assets/character/linjin-base.png`。

实际浏览器截图位于`artifacts/interface-review/posture-fix/`。最新正面版本特写为`front-dressed-closeup.png`，来自360×640视口、3倍像素密度的运行截图；`base-closeup.png`与`dressed-closeup.png`仍记录中间稿。其余文件覆盖当前版本的320×480、360×640、414×896、旧档穿脱和减少动态效果。浏览器模拟不代表手机真机验证。
