# Prompt 示例

## 智能客服处理流程

```
创建一个智能客服处理流程图，包含以下结构：

### 输入节点
- 用户本轮提问（input类型，图标：message-circle）

### 场景识别
- 场景识别（process类型，图标：git-branch）

### 操作场景分组（groupId: operation-scenario）
包含以下节点：
- DM（Dialogue Management，process类型，图标：message-square）
- Text（process类型，图标：file-text）
- 知识召回（process类型，图标：search）
- 判责、申诉工具判断（process类型，图标：scale）
- 工具使用（process类型，图标：wrench）
- 话术生成（process类型，图标：sparkles）

### 咨询场景分组（groupId: consultation-scenario）
包含以下节点：

**路径1 - 缓存相关（groupId: cache-path）**
- 历史对话缓存（database类型，图标：database）
- 少样本思维链 Thought缓存（database类型，图标：brain）

**路径2 - 多轮处理（groupId: multi-round-path）**
- 多轮判责、申诉工具、COT提示词（process类型，图标：list-checks）
  - 包含内容：角色定义、步骤执行、结构化输出、思维生成

**路径3 - RAG**
- RAG（process类型，图标：book-open）

**AI模型节点**
- Qwen-VL（process类型，图标：cpu）

**话术生成**
- 多轮话术生成提示词（process类型，图标：message-square）
  - 包含内容：角色定义、步骤执行、few-shot模板

### 输出节点
- 回复（output类型，图标：send）

### 连接关系
1. 用户本轮提问 -> 场景识别
2. 场景识别 -> DM（操作场景分支）
3. DM -> Text -> 知识召回 -> 判责、申诉工具判断 -> 工具使用 -> 话术生成 -> 回复
4. 场景识别 -> 历史对话缓存（咨询场景分支）
5. 历史对话缓存 -> 少样本思维链 Thought缓存 -> Qwen-VL
6. 场景识别 -> 多轮判责、申诉工具、COT提示词 -> Qwen-VL
7. 场景识别 -> RAG -> 回复
8. Qwen-VL -> 多轮话术生成提示词 -> 回复

### 分组要求
- 操作场景下的所有节点（DM到话术生成）使用相同的groupId: operation-scenario
- 咨询场景下的缓存路径节点使用groupId: cache-path
- 咨询场景下的多轮处理节点使用groupId: multi-round-path
- 确保同一分组内的节点在空间上靠近，便于视觉分组

### 布局建议
- 输入节点在顶部居中
- 场景识别在输入节点下方
- 操作场景分组在左侧垂直排列
- 咨询场景分组在右侧，分为三个路径并行排列
- 输出节点在底部居中
```

## 使用说明

1. 将上述 prompt 复制到 AI 输入框
2. 可以上传参考图片（可选）
3. 点击生成，AI 会自动创建包含分组的流程图

## Prompt 编写技巧

### 1. 明确分组结构
使用 `groupId` 明确指定哪些节点属于同一分组：
```
### 工具集分组（groupId: toolset）
包含：联网检索、持仓上传、OCR分析、数据库查询
```

### 2. 描述节点属性
为每个节点指定：
- **类型**：input/process/output/database/default
- **图标**：使用 Lucide 图标名称（如：search, database, cpu）
- **文本标签**：节点的显示名称

### 3. 描述连接关系
明确说明节点之间的连接：
```
A -> B -> C
D -> E
F -> G -> C
```

### 4. 布局建议
提供空间布局建议，帮助 AI 生成更合理的图表：
- 顶部/底部/左侧/右侧
- 垂直排列/水平排列
- 分组内节点靠近

### 5. 分组命名
使用有意义的 groupId：
- `operation-scenario`（操作场景）
- `consultation-scenario`（咨询场景）
- `toolset`（工具集）
- `financial-models`（金融模型）

