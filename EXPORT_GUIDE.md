# 导出功能说明

## 支持的导出格式

### SVG（矢量图）
- **优点**：无损缩放、文件小、可编辑
- **适用场景**：网页、演示文稿、需要放大查看的场景
- **文件扩展名**：`.svg`

### PNG（位图）
- **优点**：兼容性好、适合插入文档
- **适用场景**：Word、PDF、邮件、社交媒体
- **文件扩展名**：`.png`

## SVG 格式说明

SVG（Scalable Vector Graphics）是一种基于 XML 的矢量图形格式。

### SVG 结构

```xml
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
  <!-- 背景 -->
  <rect width="100%" height="100%" fill="#ffffff"/>
  
  <!-- 内容组 -->
  <g>
    <!-- 分组 -->
    <g>
      <rect x="100" y="100" width="200" height="100" fill="#fff" stroke="#000"/>
    </g>
    
    <!-- 箭头 -->
    <path d="M 100 100 L 200 200" stroke="#94a3b8" marker-end="url(#arrow-end)"/>
  </g>
  
  <!-- 定义（标记、滤镜等） -->
  <defs>
    <marker id="arrow-end">...</marker>
  </defs>
</svg>
```

### SVG 关键属性

- **viewBox**: 定义 SVG 的坐标系统和可见区域
  - 格式：`viewBox="x y width height"`
  - 例如：`viewBox="0 0 800 600"` 表示从 (0,0) 开始，宽 800 高 600 的视图

- **width/height**: SVG 的实际显示尺寸（像素）

- **xmlns**: XML 命名空间，必须声明才能正确渲染

### SVG 元素类型

1. **矩形** (`<rect>`)
   - `x`, `y`: 位置
   - `width`, `height`: 尺寸
   - `rx`, `ry`: 圆角半径
   - `fill`: 填充色
   - `stroke`: 边框色

2. **圆形/椭圆** (`<ellipse>` 或 `<circle>`)
   - `cx`, `cy`: 中心点
   - `rx`, `ry`: 半径（椭圆）或 `r`（圆）

3. **路径** (`<path>`)
   - `d`: 路径数据（M=移动，L=直线，C=曲线）
   - 用于绘制箭头和复杂形状

4. **文本** (`<text>` 或 `<foreignObject>`)
   - SVG 原生文本或 HTML 内容

5. **分组** (`<g>`)
   - 用于组织多个元素
   - 可以应用变换（transform）

### 导出时的处理

1. **自动裁剪**：根据内容自动计算边界框
2. **移除交互**：删除所有事件处理器和交互元素
3. **清理样式**：移除可能依赖浏览器的 CSS 类
4. **添加背景**：确保白色背景
5. **标准化命名空间**：添加必要的 XML 命名空间声明

## 常见问题

### Q: SVG 导出后在某些软件中显示不正常？

A: 确保 SVG 文件包含 `xmlns` 属性。我们的导出功能已自动添加。

### Q: PNG 导出质量如何？

A: PNG 导出使用 SVG 的原始尺寸，质量取决于 SVG 的 viewBox 设置。如需更高分辨率，可以：
1. 导出 SVG
2. 使用专业工具（如 Inkscape、Illustrator）转换为高分辨率 PNG

### Q: 导出的图片包含网格吗？

A: 不会。导出时会移除网格背景，只保留图表内容。

### Q: 如何编辑导出的 SVG？

A: 可以使用以下工具：
- **在线编辑器**：SVG-Edit、Boxy SVG
- **桌面软件**：Inkscape（免费）、Adobe Illustrator
- **代码编辑器**：直接编辑 XML 代码

## 使用技巧

1. **导出前调整视图**：使用缩放功能确保所有内容可见
2. **检查边界**：确保重要元素没有被裁剪
3. **PNG vs SVG**：
   - 需要放大查看 → 选择 SVG
   - 插入文档 → 选择 PNG
   - 需要编辑 → 选择 SVG

