# Infographic 模板使用指南

## 🚀 快捷指令 (Aliases)

为了方便使用，我们支持以下简短指令：

| 指令 | 对应模板 | 用途 |
| :--- | :--- | :--- |
| `/vs` | compare-binary-horizontal-underline-text-vs | A vs B 左右对比 |
| `/swot` | compare-swot | SWOT 分析 |
| `/tree` | hierarchy-tree-tech-style-badge-card | 组织架构/技术树 |
| `/snake` | sequence-color-snake-steps-horizontal-icon-line | 长流程/时间线 |
| `/stairs` | sequence-ascending-stairs-3d-underline-text | 进阶/成长路径 |
| `/mountain` | sequence-mountain-underline-text | 目标达成 |
| `/roadmap` | sequence-roadmap-vertical-simple | 路线图 |
| `/pyramid` | sequence-pyramid-simple | 金字塔层级 |
| `/quadrant` | quadrant-quarter-simple-card | 四象限分析 |

## 💡 提示词示例

### 1. 左右对比
```
/vs React vs Vue:
React: 虚拟DOM、灵活性高
Vue: 双向绑定、易于上手
```

### 2. SWOT 分析
```
/swot Tesla 分析：
Strengths: 品牌、技术
Weaknesses: 产能
Opportunities: 政策、储能
Threats: 竞争
```

### 3. 技术架构树
```
/tree 深度学习体系：
- 神经网络
  - CNN
  - RNN
- 生成模型
  - GAN
  - Diffusion
```

### 4. 蛇形时间线
```
/snake 产品发布计划：
1. 需求分析 (Q1) icon: search
2. 设计开发 (Q2) icon: edit
3. 测试上线 (Q3) icon: rocket
```

### 5. 成长阶梯
```
/stairs 程序员进阶：初级 -> 中级 -> 高级 -> 专家
```

## 🎨 完整模板列表

### 1. 序列类 (Sequence)
- `sequence-color-snake-steps-horizontal-icon-line` (🐍 /snake)
- `sequence-ascending-stairs-3d-underline-text` (📊 /stairs)
- `sequence-mountain-underline-text` (🏔️ /mountain)
- `sequence-roadmap-vertical-simple` (🛣️ /roadmap)
- `sequence-pyramid-simple` (⚠️ /pyramid)
- `sequence-cylinders-3d-simple` (🛢️ /cylinders)

### 2. 对比类 (Comparison)
- `compare-binary-horizontal-underline-text-vs` (🆚 /vs)
- `compare-swot` (📋 /swot)
- `compare-hierarchy-row-letter-card-compact-card` (↔️ /compare)

### 3. 层级类 (Hierarchy)
- `hierarchy-tree-tech-style-badge-card` (🌳 /tree)
- `hierarchy-tree-curved-line-rounded-rect-node` (🌿)

### 4. 象限类 (Quadrant)
- `quadrant-quarter-simple-card` (💠 /quadrant)

## 📝 使用方法

### 方法1：指令模式（推荐）
在提示词开头使用 `/指令` 或 `/完整模板名`。

### 方法2：UI 选择器
1. 勾选 "Use Infographic Engine"
2. 在"模板类型"下拉菜单选择模板
3. 输入描述内容
4. 点击 "Generate Diagram"
