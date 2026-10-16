# 黄色雨衣贴合修复

后续人物底图的头颈肩修正已替换本轮底图；当前校准与验收见[姿态修复](../posture-fix/README.md)。下文保留本轮服装制作过程及当时的坐标。

2026-10-16，使用内置 ImageGen，项目原创素材编辑。用途为整备室角色页与职业页的独立服装层。

`raincoat-layer-source-v4.png`为最终生成母图，`raincoat-layer-before.png`保留任务开始前的旧层。编辑参考为运行中的`public/assets/character/linjin-base.png`（固定人物与坐标）和旧雨衣层（材质与画风）。最终提示词见`prompt-v4.txt`；`prompt.txt`与`prompt-v2.txt`保留先前生成步骤。

固定人物底图，最终改用低圆领及接到手腕的长袖；服装层不包含人物。移除手持帽子，避免帽子与空手底图的手指遮挡冲突。脸、发型、内搭、裤子、靴子仍来自未修改的人物底图。生成稿未完全遵守同画布占位要求，因此在共用渲染规则中校准为左10.4%、上7.6%、宽78%、高84%。校准后以放大的实际运行截图检查下巴与领口间隙、双肩覆盖、袖口与双手衔接。

最终无损导出使用Pillow 12.3.0，PNG `optimize=True, compress_level=9`。母图1,369,640字节，运行资源1,225,580字节，减少144,060字节（10.52%）。尺寸保持1024×1536，逐字节比较解码RGBA一致；详见`compression-v4.json`。运行路径为`public/assets/character/raincoat-layer.png`。

运行截图位于`artifacts/interface-review/raincoat-fit/`。角色页和职业页复用同一叠加代码。职业武器移到名称旁独立展示，短屏压缩职业入口和展示区，使320×480首屏能看到完整人物。

首次重绘`raincoat-layer-source.png`虽通过显示矩形检查，放大运行图后仍有衣领顶下巴、袖口偏位；不能算通过。`raincoat-layer-source-v2.png`校准后露出白色肩部，也未采用。第三次生成改变了像素画风，未接入。最终采用第四次生成的低圆领。先前压缩记录仅对应被淘汰的稿件，不代表最终资源体积。
