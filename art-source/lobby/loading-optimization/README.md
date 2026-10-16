# 大厅无损加载优化

这里保留既有四张 PNG 的母图备份。没有生成或重绘图片。运行资源为 `public/assets/lobby/*.webp`。

工具：`cwebp -lossless -exact -m 6`。尺寸、透明通道和全部解码后 RGBA 字节均通过 Pillow 比较。逐项原始体积、压缩体积及验证结果见 `compression.json`。
