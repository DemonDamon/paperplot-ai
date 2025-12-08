# PaperPlot AI

基于 AI 的图表绘制工具，支持文本/图片生成流程图、架构图等。适用于演示和论文场景。

## 功能

- 手动绘制：矩形、圆形、箭头、文本
- AI 生成：文本描述或图片输入生成图表
- 智能连接：箭头自动连接节点
- 本地存储：自动保存，支持撤销/重做
- SVG 导出
- 画布缩放/平移

## 快速开始

```bash
npm install
npm run dev
```

访问 `http://localhost:3001`

## 配置

创建 `.env.local` 文件，配置 AI 模型：

```bash
VITE_AI_PROVIDER=gemini  # gemini | bailian | glm | minimax | openai
VITE_GEMINI_API_KEY=your_key_here
```

### 支持的模型

#### Gemini (默认)

```bash
VITE_AI_PROVIDER=gemini
VITE_GEMINI_API_KEY=your_key
```

API Key: https://makersuite.google.com/app/apikey

#### 阿里云百炼

```bash
VITE_AI_PROVIDER=bailian
VITE_BAILIAN_API_KEY=your_key
VITE_BAILIAN_MODEL=qwen-plus  # 可选，默认 qwen-plus
```

API Key: https://bailian.console.aliyun.com/

#### GLM

```bash
VITE_AI_PROVIDER=glm
VITE_GLM_API_KEY=your_key
VITE_GLM_MODEL=glm-4  # 可选，默认 glm-4
```

API Key: https://open.bigmodel.cn/

#### MiniMax

```bash
VITE_AI_PROVIDER=minimax
VITE_MINIMAX_API_KEY=your_key
VITE_MINIMAX_MODEL=abab6.5-chat  # 可选
```

API Key: https://www.minimax.chat/

#### OpenAI

```bash
VITE_AI_PROVIDER=openai
VITE_OPENAI_API_KEY=your_key
VITE_OPENAI_MODEL=gpt-4o  # 可选，默认 gpt-4o
VITE_OPENAI_BASE_URL=https://api.openai.com/v1/chat/completions  # 可选，支持代理
```

API Key: https://platform.openai.com/

## 环境变量

| 变量 | 说明 | 必需 |
|------|------|------|
| `VITE_AI_PROVIDER` | 模型提供商 | ✅ |
| `VITE_*_API_KEY` | 对应模型的 API Key | ✅ |
| `VITE_*_BASE_URL` | 自定义 API 地址 | ❌ |
| `VITE_*_MODEL` | 模型名称 | ❌ |

所有变量必须以 `VITE_` 开头（Vite 要求）。

## 构建

```bash
npm run build      # 构建生产版本
npm run preview    # 预览构建产物
```

## 技术栈

- React 19 + TypeScript
- Vite 6
- Tailwind CSS
- Lucide React

## 项目结构

```
components/     # React 组件
services/       # AI 服务层（多模型支持）
types.ts        # TypeScript 类型
App.tsx         # 主应用
```

## License

MIT
