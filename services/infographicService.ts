import { GoogleGenAI } from "@google/genai";
import { getAIConfig, PROVIDER_PRESETS } from './configService';
import { AIProviderConfig } from '../types';
import { buildChatCompletionsUrl } from './aiService';

const INFOGRAPHIC_SYSTEM_PROMPT = `You are an expert infographic designer. Convert user requests into a high-quality infographic using a specific indentation-based DSL.

CRITICAL RULES:
1. Output ONLY the DSL content. NO markdown code blocks, NO explanations, NO extra text.
2. First line MUST be exactly 'infographic <template-name>' (no quotes around template name).
3. Use exactly TWO spaces for indentation (not tabs).
4. If user provides mermaid/flowchart code, extract the key concepts and convert to this DSL format.

TEMPLATE SELECTION GUIDE:
- sequence-color-snake-steps-horizontal-icon-line: 长流程，蛇形布局
- sequence-ascending-stairs-3d-underline-text: 阶梯式进阶，成长路径
- sequence-mountain-underline-text: 山峰形状，目标达成
- sequence-cylinders-3d-simple: 3D圆柱，阶段性
- sequence-roadmap-vertical-simple: 垂直路线图，里程碑
- sequence-pyramid-simple: 金字塔结构，层级递进
- compare-binary-horizontal-underline-text-vs: 左右PK，显式 VS 标志
- compare-swot: SWOT 分析专用
- quadrant-quarter-simple-card: 四象限分析 (重要紧急、波士顿矩阵)
- hierarchy-tree-tech-style-badge-card: 科技感树形图
- list-grid-badge-card: 网格布局，特性列表

TEMPLATE SELECTION RULES:
- If prompt contains "SWOT": use compare-swot
- If prompt contains "vs" or "PK": use compare-binary-horizontal-underline-text-vs
- If prompt contains "象限" or "矩阵": use quadrant-quarter-simple-card
- If prompt contains "金字塔": use sequence-pyramid-simple
- If prompt contains "路线图" or "Roadmap": use sequence-roadmap-vertical-simple
- For "流程/步骤/Timeline": use sequence-color-snake-steps-horizontal-icon-line
- For "成长/阶梯/Level": use sequence-ascending-stairs-3d-underline-text
- For "组织/架构/Tree": use hierarchy-tree-tech-style-badge-card
- Default: list-column-simple-vertical-arrow

TEMPLATE-SPECIFIC DSL STRUCTURES (Follow strictly):

1. compare-binary-horizontal-underline-text-vs (Two items ONLY):
   infographic compare-binary-horizontal-underline-text-vs
   data
     title <title>
     items
       - label <Option A>
         children
           - label <Point 1>
           - label <Point 2>
       - label <Option B>
         children
           - label <Point 1>
           - label <Point 2>

2. compare-swot (Four items ONLY):
   infographic compare-swot
   data
     title <title>
     items
       - label Strengths
         children
           - label <Point 1>
       - label Weaknesses
         children
           - label <Point 1>
       - label Opportunities
         children
           - label <Point 1>
       - label Threats
         children
           - label <Point 1>

3. quadrant-quarter-simple-card (Four items ONLY):
   infographic quadrant-quarter-simple-card
   data
     title <title>
     items
       - label <Quadrant 1>
         desc <Description>
       - label <Quadrant 2>
         desc <Description>
       - label <Quadrant 3>
         desc <Description>
       - label <Quadrant 4>
         desc <Description>

4. sequence-pyramid-simple (Bottom-up hierarchy):
   infographic sequence-pyramid-simple
   data
     title <title>
     items
       - label <Level 1 (Bottom)>
         desc <Detail>
       - label <Level 2>
         desc <Detail>
       - label <Level 3 (Top)>
         desc <Detail>

5. sequence-color-snake-steps-horizontal-icon-line:
   infographic sequence-color-snake-steps-horizontal-icon-line
   data
     title <title>
     items
       - label <Step 1>
         time <Time/Index>
         icon <mdi/icon-name>
       - label <Step 2>
         time <Time/Index>
         icon <mdi/icon-name>

4. sequence-ascending-stairs-3d-underline-text:
   infographic sequence-ascending-stairs-3d-underline-text
   data
     title <title>
     desc <description>
     items
       - label <Step 1>
         desc <Detail>
       - label <Step 2>
         desc <Detail>

5. hierarchy-tree-tech-style-compact-card:
   infographic hierarchy-tree-tech-style-compact-card
   data
     title <title>
     items
       - label <Root>
         children
           - label <Branch 1>
             children
               - label <Leaf 1>
               - label <Leaf 2>
           - label <Branch 2>

FOR COMPLEX STRUCTURES (like mermaid with multiple subgraphs):
- Use 'list-column-simple-vertical-arrow' for vertical flow
- Flatten the structure: each major section becomes one item
- Include sub-items in the description (do NOT use nested children)

EXAMPLE for complex structure (note the 4-space indent for list items):
infographic list-column-simple-vertical-arrow
data
  title AgentRun 功能分布
  desc 覆盖 Agent 全生命周期
  items
    - label Agent 开发层
      desc 低代码搭建 → 高代码开发 → 框架集成
      icon code
    - label Agent 运行时
      desc Serverless 环境、会话隔离、弹性伸缩、安全机制
      icon server
    - label 工具运行时
      desc Sandbox 沙箱、MCP 工具、Function Call
      icon wrench
    - label Agent 运维
      desc 模型治理、链路追踪、指标观测、凭证管理
      icon settings

CRITICAL INDENTATION RULES (strictly follow):
- 'data' = 0 spaces
- 'title', 'desc', 'items' under data = 2 spaces
- '- label' under items = 4 spaces (TWO levels of 2-space indent)
- 'desc', 'icon' under list item = 6 spaces (THREE levels)

CORRECT EXAMPLES:

Example 1 - Horizontal flow:
infographic list-row-simple-horizontal-arrow
data
  title RAG 工作流程
  items
    - label 用户提问
      desc 提出问题
      icon message-circle
    - label 检索知识库
      desc 搜索相关信息
      icon search
    - label 生成答案
      desc AI 生成回复
      icon sparkles

Example 2 - Comparison (NO icon property!):
infographic compare-binary
data
  title React vs Vue 框架对比
  items
    - label React
      desc 虚拟DOM、高度可扩展、丰富生态、JSX语法、灵活但需要更多配置
    - label Vue
      desc 双向数据绑定、易于上手、模板语法、内置指令、集成度高适合中小项目

Example 3 - Mindmap (with children):
infographic hierarchy-mindmap
data
  title AI 技术栈
  items
    - label 机器学习
      children
        - label 监督学习
        - label 无监督学习
    - label 深度学习
      children
        - label 神经网络
        - label CNN
`;

/**
 * Clean markdown code blocks from AI response and fix indentation
 */
function cleanDslOutput(text: string): string {
  let cleanedText = text;
  
  // Remove markdown code blocks
  if (cleanedText.startsWith('```')) {
    const match = cleanedText.match(/```(?:\w+)?\n([\s\S]*?)(?:```)?$/);
    if (match) {
      cleanedText = match[1];
    } else {
      cleanedText = cleanedText.replace(/^```(?:\w+)?\n/, '');
    }
  }
  
  // Fix indentation: @antv/infographic requires specific indentation
  // Based on official docs:
  // data (0 spaces)
  //   items (2 spaces)
  //     - label (4 spaces)
  //       desc (6 spaces)
  
  const lines = cleanedText.split('\n');
  let inItems = false;
  let itemDepth = 0;
  
  // Detect template type first
  const templateMatch = cleanedText.match(/^infographic\s+(\S+)/m);
  const templateName = templateMatch?.[1] || '';
  const isCompareTemplate = templateName.startsWith('compare-');
  const isWordcloudTemplate = templateName === 'chart-wordcloud';
  
  const fixedLines = lines.map((line, index) => {
    // Skip empty lines
    if (!line.trim()) return '';
    
    const trimmed = line.trim();
    const leadingSpaces = line.match(/^( *)/)?.[1].length || 0;
    
    // Detect structure
    if (trimmed === 'data') {
      inItems = false;
      return 'data';
    }
    if (trimmed === 'items') {
      inItems = true;
      itemDepth = 0;
      return '  items';
    }
    if (trimmed.startsWith('title ') || trimmed.startsWith('desc ')) {
      // title/desc under data should be 2-space indented
      if (!inItems) {
        return '  ' + trimmed;
      }
    }
    if (trimmed.startsWith('- ') || trimmed.startsWith('- label')) {
      // List items under 'items' should be 4-space indented
      itemDepth = 4;
      return '    ' + trimmed;
    }
    if (inItems && itemDepth > 0) {
      // Remove 'icon' property for compare templates (not supported)
      if (isCompareTemplate && trimmed.startsWith('icon ')) {
        return null; // Skip this line
      }
      
      // Properties under list items
      if (trimmed.startsWith('desc ') || trimmed.startsWith('icon ') || 
          trimmed.startsWith('value ') || trimmed.startsWith('children')) {
        return '      ' + trimmed;
      }
      // Nested list items (for mindmap children)
      if (trimmed.startsWith('- ')) {
        return '        ' + trimmed;
      }
    }
    
    // Fallback: keep original if we don't recognize the pattern
    return line;
  });
  
  const result = fixedLines.filter(line => line !== null && line !== '').join('\n').trim();
  console.log('[InfographicService] Cleaned DSL:');
  console.log(result);
  return result;
}

/**
 * Generate infographic DSL using Gemini
 */
async function* generateWithGemini(
  config: AIProviderConfig,
  prompt: string,
  imageBase64?: string | null
): AsyncGenerator<string> {
  const genAI = new GoogleGenAI({ apiKey: config.apiKey });
  const model = genAI.getGenerativeModel({ 
    model: config.model || "gemini-2.0-flash",
    systemInstruction: INFOGRAPHIC_SYSTEM_PROMPT,
  });

  const parts: any[] = [{ text: prompt }];
  if (imageBase64) {
    const match = imageBase64.match(/^data:(.*?);base64,(.*)$/);
    if (match) {
      parts.push({
        inlineData: {
          mimeType: match[1],
          data: match[2]
        }
      });
    }
  }

  const result = await model.generateContentStream(parts);
  let fullText = "";
  for await (const chunk of result.stream) {
    const chunkText = chunk.text();
    fullText += chunkText;
    yield cleanDslOutput(fullText);
  }
}

/**
 * Generate infographic DSL using OpenAI-compatible API (streaming)
 * Works for: OpenAI, Bailian (Qwen), GLM, DeepSeek, etc.
 */
async function* generateWithOpenAICompatible(
  config: AIProviderConfig,
  prompt: string,
  imageBase64?: string | null
): AsyncGenerator<string> {
  const preset = PROVIDER_PRESETS[config.provider];
  let baseUrl = config.baseUrl || preset?.defaultBaseUrl || 'https://api.openai.com/v1';
  const model = config.model || preset?.defaultModel || 'gpt-4o';

  // 如果是自定义 Base URL（非官方），且是开发环境，使用 Vite 代理避免 CORS
  const isCustomUrl = baseUrl.includes('47.251.106.113') || baseUrl.includes('localhost') || baseUrl.startsWith('http://');
  const isDev = import.meta.env.DEV;
  
  if (isCustomUrl && isDev) {
    baseUrl = '/api/openai';
    console.log(`[Infographic] 使用代理路径: ${baseUrl}`);
  }

  // 智能构造 /chat/completions URL
  const fetchUrl = buildChatCompletionsUrl(baseUrl);
  console.log(`[Infographic] Final fetch URL: ${fetchUrl}`);

  // Build messages array
  const messages: any[] = [
    {
      role: 'system',
      content: INFOGRAPHIC_SYSTEM_PROMPT
    }
  ];

  // User message with optional image
  if (imageBase64) {
    const match = imageBase64.match(/^data:(.*?);base64,(.*)$/);
    if (match) {
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { 
            type: 'image_url', 
            image_url: { url: imageBase64 }
          }
        ]
      });
    } else {
      messages.push({ role: 'user', content: prompt });
    }
  } else {
    messages.push({ role: 'user', content: prompt });
  }

  // Make streaming request
  const response = await fetch(fetchUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error (${response.status}): ${errorText.substring(0, 200)}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Response body is not readable');
  }

  const decoder = new TextDecoder();
  let fullText = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; // Keep incomplete line in buffer

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === 'data: [DONE]') continue;
      if (!trimmed.startsWith('data: ')) continue;

      try {
        const json = JSON.parse(trimmed.slice(6));
        const delta = json.choices?.[0]?.delta?.content;
        if (delta) {
          fullText += delta;
          yield cleanDslOutput(fullText);
        }
      } catch (e) {
        // Ignore parse errors for incomplete chunks
      }
    }
  }

  // Process any remaining buffer
  if (buffer.trim() && buffer.trim() !== 'data: [DONE]' && buffer.trim().startsWith('data: ')) {
    try {
      const json = JSON.parse(buffer.trim().slice(6));
      const delta = json.choices?.[0]?.delta?.content;
      if (delta) {
        fullText += delta;
        yield cleanDslOutput(fullText);
      }
    } catch (e) {
      // Ignore
    }
  }
}

/**
 * Main entry point: Generate infographic DSL with streaming
 * Automatically selects the appropriate provider based on config
 */
export async function* generateInfographicStream(
  prompt: string, 
  imageBase64?: string | null,
  templateHint: string = 'auto'
): AsyncGenerator<string> {
  const config = getAIConfig();
  
  if (!config) {
    throw new Error("No AI service configured. Please configure your API key in settings.");
  }

  if (!config.apiKey) {
    throw new Error("API Key not found. Please configure your API key in settings.");
  }

  // 构建带模板提示的完整 prompt
  let fullPrompt = prompt;
  if (templateHint !== 'auto') {
    fullPrompt = `使用模板: ${templateHint}\n\n${prompt}`;
  }

  // Route to appropriate provider
  switch (config.provider) {
    case 'gemini':
      yield* generateWithGemini(config, fullPrompt, imageBase64);
      break;
    
    case 'openai':
    case 'bailian':
    case 'qwen':
    case 'glm':
    case 'deepseek':
    case 'minimax':
    default:
      // All these use OpenAI-compatible API
      yield* generateWithOpenAICompatible(config, fullPrompt, imageBase64);
      break;
  }
}
