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
- hierarchy-structure: Layered architecture diagrams (分层架构图), system layers with components
- sequence-color-snake-steps-horizontal-icon-line: Long process, snake layout (长流程，蛇形布局)
- sequence-ascending-stairs-3d-underline-text: Step progression, growth path (阶梯式进阶，成长路径)
- sequence-mountain-underline-text: Mountain shape, goal achievement (山峰形状，目标达成)
- sequence-cylinders-3d-simple: 3D cylinders, phases (3D圆柱，阶段性)
- sequence-roadmap-vertical-simple: Vertical roadmap, milestones (垂直路线图，里程碑)
- sequence-pyramid-simple: Pyramid structure, hierarchy (金字塔结构，层级递进)
- compare-binary-horizontal-underline-text-vs: Left-right comparison with VS (左右PK，显式 VS 标志)
- compare-swot: SWOT analysis (SWOT 分析专用)
- quadrant-quarter-simple-card: Four quadrant analysis (四象限分析)
- hierarchy-tree-tech-style-badge-card: Tech-style tree diagram (科技感树形图)
- hierarchy-mindmap: Mind map with branches (思维导图)
- list-grid-badge-card: Grid layout, feature list (网格布局，特性列表)
- list-column-simple-vertical-arrow: Vertical list with arrows (垂直列表)

TEMPLATE SELECTION RULES:
- If prompt contains "分层架构" or "layered architecture" or "system layers": use hierarchy-structure
- If prompt contains "SWOT": use compare-swot
- If prompt contains "vs" or "PK" or "对比": use compare-binary-horizontal-underline-text-vs
- If prompt contains "象限" or "矩阵" or "quadrant": use quadrant-quarter-simple-card
- If prompt contains "金字塔" or "pyramid": use sequence-pyramid-simple
- If prompt contains "路线图" or "Roadmap": use sequence-roadmap-vertical-simple
- For "流程/步骤/Timeline/process/steps": use sequence-color-snake-steps-horizontal-icon-line
- For "成长/阶梯/Level/growth": use sequence-ascending-stairs-3d-underline-text
- For "组织/架构/Tree/organization" (non-layered): use hierarchy-tree-tech-style-badge-card
- For "思维导图/mindmap": use hierarchy-mindmap
- Default: list-column-simple-vertical-arrow

TEMPLATE-SPECIFIC DSL STRUCTURES (Follow strictly):

1. hierarchy-structure (Layered Architecture - IMPORTANT):
   Use this for system architecture with horizontal layers, each layer containing multiple components.
   Each top-level item is a LAYER, and children are COMPONENTS within that layer.
   
   infographic hierarchy-structure
   data
     title <Architecture Title>
     desc <Description>
     items
       - label <Layer 1 Name>
         children
           - label <Component 1>
           - label <Component 2>
           - label <Component 3>
       - label <Layer 2 Name>
         children
           - label <Module A>
             children
               - label <Sub-component 1>
               - label <Sub-component 2>
           - label <Module B>
             children
               - label <Sub-component 1>
               - label <Sub-component 2>
       - label <Layer 3 Name>
         children
           - label <Service 1>
           - label <Service 2>

   EXAMPLE - System Layered Architecture:
   infographic hierarchy-structure
   data
     title System Layered Architecture
     desc Shows the interaction flow between client and system layer components
     items
       - label Client Layer
         children
           - label Web Client
           - label Mobile App
           - label Desktop Client
       - label Request Dispatch Layer
         children
           - label Load Balancer
           - label API Gateway
           - label Router
       - label Service Instance Layer
         children
           - label Instance 1 (Session-A)
           - label Instance 2 (Session-B)
           - label Instance 3 (Session-C)
       - label Persistence Layer
         children
           - label Database
           - label Cache
           - label File Storage

2. compare-binary-horizontal-underline-text-vs (Two items ONLY):
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

3. compare-swot (Four items ONLY):
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

4. quadrant-quarter-simple-card (Four items ONLY):
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

5. sequence-pyramid-simple (Bottom-up hierarchy):
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

6. sequence-color-snake-steps-horizontal-icon-line:
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

7. sequence-ascending-stairs-3d-underline-text:
   infographic sequence-ascending-stairs-3d-underline-text
   data
     title <title>
     desc <description>
     items
       - label <Step 1>
         desc <Detail>
       - label <Step 2>
         desc <Detail>

8. hierarchy-tree-tech-style-compact-card:
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

9. hierarchy-mindmap:
   infographic hierarchy-mindmap
   data
     title <title>
     items
       - label <Topic 1>
         children
           - label <Subtopic 1>
           - label <Subtopic 2>
       - label <Topic 2>
         children
           - label <Subtopic 1>
           - label <Subtopic 2>

10. list-column-simple-vertical-arrow:
    infographic list-column-simple-vertical-arrow
    data
      title <title>
      desc <description>
      items
        - label <Item 1>
          desc <Detail>
          icon <icon-name>
        - label <Item 2>
          desc <Detail>
          icon <icon-name>

CRITICAL INDENTATION RULES (strictly follow):
- 'data' = 0 spaces
- 'title', 'desc', 'items' under data = 2 spaces
- '- label' under items = 4 spaces (TWO levels of 2-space indent)
- 'desc', 'icon', 'children' under list item = 6 spaces (THREE levels)
- Nested '- label' under children = 8 spaces (FOUR levels)
- Further nested children = 10 spaces, and so on

CORRECT EXAMPLES:

Example 1 - Layered Architecture (hierarchy-structure):
infographic hierarchy-structure
data
  title Microservices Architecture
  desc Three-tier architecture with gateway, services, and data layer
  items
    - label Gateway Layer
      children
        - label API Gateway
        - label Load Balancer
    - label Service Layer
      children
        - label User Service
        - label Order Service
        - label Payment Service
    - label Data Layer
      children
        - label MySQL
        - label Redis
        - label MongoDB

Example 2 - Horizontal flow:
infographic list-row-simple-horizontal-arrow
data
  title RAG Workflow
  items
    - label User Query
      desc Ask a question
      icon message-circle
    - label Search Knowledge Base
      desc Search relevant information
      icon search
    - label Generate Answer
      desc AI generates response
      icon sparkles

Example 3 - Mindmap (with children):
infographic hierarchy-mindmap
data
  title AI Technology Stack
  items
    - label Machine Learning
      children
        - label Supervised Learning
        - label Unsupervised Learning
    - label Deep Learning
      children
        - label Neural Networks
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
  //       children (6 spaces)
  //         - label (8 spaces)
  
  const lines = cleanedText.split('\n');
  let inItems = false;
  let itemDepth = 0;
  let childrenDepth = 0;
  
  // Detect template type first
  const templateMatch = cleanedText.match(/^infographic\s+(\S+)/m);
  const templateName = templateMatch?.[1] || '';
  const isCompareTemplate = templateName.startsWith('compare-');
  const isHierarchyStructure = templateName === 'hierarchy-structure';
  const isWordcloudTemplate = templateName === 'chart-wordcloud';
  
  const fixedLines = lines.map((line, index) => {
    // Skip empty lines
    if (!line.trim()) return '';
    
    const trimmed = line.trim();
    const leadingSpaces = line.match(/^( *)/)?.[1].length || 0;
    
    // Detect structure
    if (trimmed === 'data') {
      inItems = false;
      childrenDepth = 0;
      return 'data';
    }
    if (trimmed === 'theme') {
      inItems = false;
      childrenDepth = 0;
      return 'theme';
    }
    if (trimmed === 'items') {
      inItems = true;
      itemDepth = 0;
      childrenDepth = 0;
      return '  items';
    }
    if (trimmed === 'palette') {
      return '  palette';
    }
    if (trimmed.startsWith('title ') || trimmed.startsWith('desc ')) {
      // title/desc under data should be 2-space indented
      if (!inItems) {
        return '  ' + trimmed;
      }
    }
    
    // Handle children keyword
    if (trimmed === 'children') {
      childrenDepth++;
      const indent = '      ' + '  '.repeat(Math.max(0, childrenDepth - 1));
      return indent + 'children';
    }
    
    if (trimmed.startsWith('- ') || trimmed.startsWith('- label')) {
      if (inItems) {
        // Calculate indent based on children depth
        // Base: 4 spaces for first level items
        // Add 4 spaces for each children level
        const baseIndent = 4 + (childrenDepth * 4);
        const indent = ' '.repeat(baseIndent);
        return indent + trimmed;
      }
      // For palette items in theme
      return '    ' + trimmed;
    }
    
    if (inItems && (trimmed.startsWith('desc ') || trimmed.startsWith('icon ') || 
        trimmed.startsWith('value ') || trimmed.startsWith('time '))) {
      // Properties under list items
      // Base: 6 spaces for first level item properties
      // Add 4 spaces for each children level
      const baseIndent = 6 + (childrenDepth * 4);
      const indent = ' '.repeat(baseIndent);
      return indent + trimmed;
    }
    
    // Remove 'icon' property for compare templates (not supported)
    if (isCompareTemplate && trimmed.startsWith('icon ')) {
      return null; // Skip this line
    }
    
    // Fallback: keep original if we don't recognize the pattern
    return line;
  });
  
  let result = fixedLines.filter(line => line !== null && line !== '').join('\n').trim();
  
  // Auto-add theme with palette for hierarchy-structure template if not present
  if (isHierarchyStructure && !result.includes('theme')) {
    // Add a colorful palette for layered architecture diagrams
    const themeDsl = `\ntheme\n  palette\n    - #10b981\n    - #3b82f6\n    - #8b5cf6\n    - #f59e0b\n    - #ef4444\n    - #ec4899`;
    result += themeDsl;
  }
  
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
