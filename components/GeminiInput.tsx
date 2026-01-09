import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Loader2, Image as ImageIcon, X, Upload, History, Clock, ChevronDown, ChevronUp, Settings } from 'lucide-react';
import { generateDiagramFromPrompt } from '../services/aiService';
import { generateInfographicStream } from '../services/infographicService';
import { DiagramElement, GenerationHistory, ToolType, AIProviderConfig } from '../types';
import { ModelConfigModal } from './ModelConfigModal';
import { getAIConfig, getProviderDisplayName } from '../services/configService';

interface GeminiInputProps {
  history?: GenerationHistory[];
  onGenerationStart?: () => void; // Callback when generation starts (to clear canvas)
  onGenerationEnd?: () => void; // Callback when generation ends (success or failure)
  onElementsGenerated: (elements: DiagramElement[], prompt: string, image: string | null) => void;
}

export const GeminiInput: React.FC<GeminiInputProps> = ({ 
  history = [], 
  onGenerationStart,
  onGenerationEnd,
  onElementsGenerated
}) => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [image, setImage] = useState<string | null>(null); // Base64 string
  const [historyExpanded, setHistoryExpanded] = useState(true);
  const [useInfographic, setUseInfographic] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('auto'); // 'auto' 或具体模板名
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Infographic 模板选项 (基于官方 Premium 列表)
  const templates = [
    { value: 'auto', label: '🤖 智能选择', category: 'auto' },
    
    // Sequence (流程/步骤)
    { value: 'sequence-color-snake-steps-horizontal-icon-line', label: '🐍 蛇形流程', category: 'Sequence' },
    { value: 'sequence-ascending-stairs-3d-underline-text', label: '📊 3D阶梯', category: 'Sequence' },
    { value: 'sequence-mountain-underline-text', label: '🏔️ 山峰流程', category: 'Sequence' },
    { value: 'sequence-cylinders-3d-simple', label: '🛢️ 3D圆柱', category: 'Sequence' },
    { value: 'sequence-roadmap-vertical-simple', label: '🛣️ 垂直路线图', category: 'Sequence' },
    { value: 'sequence-pyramid-simple', label: '⚠️ 金字塔', category: 'Sequence' },
    { value: 'sequence-zigzag-steps-underline-text', label: '⚡️ 之字形步骤', category: 'Sequence' },
    
    // Comparison (对比)
    { value: 'compare-binary-horizontal-underline-text-vs', label: '🆚 左右PK', category: 'Comparison' },
    { value: 'compare-swot', label: '📋 SWOT分析', category: 'Comparison' },
    { value: 'compare-hierarchy-left-right-circle-node-pill-badge', label: '↔️ 左右层级对比', category: 'Comparison' },
    
    // Hierarchy (层级)
    { value: 'hierarchy-tree-tech-style-badge-card', label: '🌳 科技树(徽章)', category: 'Hierarchy' },
    { value: 'hierarchy-tree-curved-line-rounded-rect-node', label: '🌿 曲线树图', category: 'Hierarchy' },
    
    // Quadrant (象限)
    { value: 'quadrant-quarter-simple-card', label: '💠 四象限卡片', category: 'Quadrant' },
    
    // List (列表)
    { value: 'list-grid-badge-card', label: '🔲 网格卡片', category: 'List' },
    { value: 'list-row-horizontal-icon-arrow', label: '➡️ 图标箭头流程', category: 'List' },
  ];
  
  // AI Config state
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [aiConfig, setAiConfig] = useState<AIProviderConfig | null>(null);

  // Load AI config on mount
  useEffect(() => {
    setAiConfig(getAIConfig());
  }, []);

  const handleConfigSave = (config: AIProviderConfig) => {
    setAiConfig(config);
    setError(null); // Clear any previous API key errors
  };

  // Handle Paste for Images on the container
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.indexOf('image') !== -1) {
        const blob = item.getAsFile();
        if (blob) {
          const reader = new FileReader();
          reader.onload = (event) => {
            setImage(event.target?.result as string);
          };
          reader.readAsDataURL(blob);
        }
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // 模板别名映射 (Short Aliases)
  const templateAliases: Record<string, string> = {
    'vs': 'compare-binary-horizontal-underline-text-vs',
    'pk': 'compare-binary-horizontal-underline-text-vs',
    'swot': 'compare-swot',
    'compare': 'compare-hierarchy-row-letter-card-compact-card',
    'tree': 'hierarchy-tree-tech-style-badge-card',
    'snake': 'sequence-color-snake-steps-horizontal-icon-line',
    'stairs': 'sequence-ascending-stairs-3d-underline-text',
    'mountain': 'sequence-mountain-underline-text',
    'roadmap': 'sequence-roadmap-vertical-simple',
    'pyramid': 'sequence-pyramid-simple',
    'quadrant': 'quadrant-quarter-simple-card',
    'cylinders': 'sequence-cylinders-3d-simple',
    'zigzag': 'sequence-zigzag-steps-underline-text'
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setLoading(true);
    setError(null);
    
    // Clear canvas immediately when generation starts
    if (onGenerationStart) {
      onGenerationStart();
    }

    try {
      if (useInfographic) {
        // 解析提示词中的模板指令（支持别名）
        let templateOverride = selectedTemplate;
        let actualPrompt = prompt;
        
        // 匹配 /command 格式
        const templateCommandMatch = prompt.match(/^\/([a-z0-9-]+)\s+(.+)$/s);
        if (templateCommandMatch) {
          const [, command, content] = templateCommandMatch;
          const lowerCommand = command.toLowerCase();
          
          // 1. 检查是否是完整模板名
          const validTemplate = templates.find(t => t.value === lowerCommand);
          if (validTemplate) {
            templateOverride = lowerCommand;
            actualPrompt = content;
            console.log(`[GeminiInput] 检测到完整模板指令: /${lowerCommand}`);
          } 
          // 2. 检查是否是别名 (Alias)
          else if (templateAliases[lowerCommand]) {
            templateOverride = templateAliases[lowerCommand];
            actualPrompt = content;
            console.log(`[GeminiInput] 检测到别名指令: /${lowerCommand} -> ${templateOverride}`);
          }
        }
        
        // 收集完整的 DSL（不要流式更新，避免组件频繁重新挂载）
        let completeDsl = '';
        for await (const dsl of generateInfographicStream(actualPrompt, image, templateOverride)) {
          completeDsl = dsl;
          console.log('[GeminiInput] DSL generation progress:', dsl.length, 'chars');
        }
        
        // 生成完成后，一次性创建 infographic 元素
        console.log('[GeminiInput] DSL generation complete, creating element...');
        const infographicElement: DiagramElement = {
          id: `infographic-${Date.now()}`,
          type: ToolType.INFOGRAPHIC,
          x: 50,
          y: 50,
          width: 800,
          height: 600,
          dsl: completeDsl,
          strokeColor: '#000',
          fillColor: '#fff',
          strokeWidth: 1
        };
        onElementsGenerated([infographicElement], prompt, image);
      } else {
        const newElements = await generateDiagramFromPrompt(prompt, image);
        onElementsGenerated(newElements, prompt, image);
      }
    } catch (err) {
      console.error('[GeminiInput] 生成失败:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate diagram';
      setError(errorMessage);
    } finally {
      setLoading(false);
      // Reset generation state when generation ends (success or failure)
      if (onGenerationEnd) {
        onGenerationEnd();
      }
    }
  };

  return (
    <div 
      className="w-80 h-full bg-white border-l border-gray-200 flex flex-col shadow-xl z-20"
      onPaste={handlePaste}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-100 bg-gray-50 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-blue-600">
            <Sparkles size={20} />
            <h2 className="font-semibold text-sm uppercase tracking-wider">AI Generator</h2>
          </div>
          <button
            onClick={() => setShowConfigModal(true)}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
            title="Configure AI Service"
          >
            <Settings size={18} />
          </button>
        </div>
        {/* Current provider indicator */}
        {aiConfig && (
          <div className="mt-2 text-xs text-gray-500">
            Using: <span className="font-medium text-gray-700">{getProviderDisplayName(aiConfig.provider)}</span>
            {aiConfig.model && <span className="text-gray-400"> / {aiConfig.model}</span>}
          </div>
        )}
      </div>

      {/* Main Content - Input Area (固定，不滚动) */}
      <div className="flex-shrink-0 p-4 flex flex-col gap-4 border-b border-gray-100">
        {/* Prompt Input */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-gray-500">PROMPT</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe a flow chart, mind map, or system architecture..."
            className="w-full h-28 p-3 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none bg-gray-50 focus:bg-white transition-colors"
          />
        </div>

        {/* Image Input */}
        <div className="flex flex-col gap-2">
           <div className="flex justify-between items-center">
             <label className="text-xs font-medium text-gray-500">REFERENCE IMAGE (OPTIONAL)</label>
             {image && (
               <button onClick={() => setImage(null)} className="text-xs text-red-500 hover:text-red-600">Clear</button>
             )}
           </div>
           
           {!image ? (
             <div 
               onClick={() => fileInputRef.current?.click()}
               className="border-2 border-dashed border-gray-200 rounded-lg p-4 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-gray-50 transition-colors group"
             >
               <Upload size={20} className="text-gray-300 group-hover:text-blue-400 transition-colors" />
               <span className="text-xs text-gray-400 text-center">Click to upload or paste image</span>
             </div>
           ) : (
             <div className="relative rounded-lg overflow-hidden border border-gray-200 group">
               <img src={image} alt="Reference" className="w-full h-32 object-cover" />
               <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
             </div>
           )}
           <input
             type="file"
             ref={fileInputRef}
             onChange={handleFileChange}
             accept="image/*"
             className="hidden"
           />
        </div>

        {/* Config Warning */}
        {!aiConfig && (
          <div 
            onClick={() => setShowConfigModal(true)}
            className="p-3 bg-amber-50 text-amber-700 text-xs rounded-md border border-amber-200 cursor-pointer hover:bg-amber-100 transition-colors"
          >
            <span className="font-medium">No API Key configured.</span> Click here or the settings icon to configure.
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 text-red-600 text-xs rounded-md border border-red-100">
            {error}
          </div>
        )}

        {/* Infographic Option & Template Selector */}
        <div className="flex flex-col gap-3 mb-2">
          <div className="flex items-center gap-2">
            <input 
              type="checkbox" 
              id="useInfographic" 
              checked={useInfographic} 
              onChange={(e) => setUseInfographic(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <label htmlFor="useInfographic" className="text-xs font-medium text-gray-500 cursor-pointer">
              Use Infographic Engine <span className="text-green-600">✨</span>
            </label>
          </div>
          
          {useInfographic && (
            <>
              {/* Template Selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-500">📐 模板类型</label>
                <select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="text-xs border border-gray-200 rounded-md px-2 py-1.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50"
                >
                  {templates.map(t => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                
                {/* Template Command Hint */}
                <div className="text-xs text-gray-400 bg-gray-50 rounded px-2 py-1.5 border border-gray-100">
                  <div className="font-medium text-gray-500 mb-1">💡 快捷指令 (支持别名)：</div>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] font-mono text-gray-600">
                    <div>/vs 对比</div>
                    <div>/tree 树图</div>
                    <div>/swot 分析</div>
                    <div>/snake 蛇形</div>
                    <div>/stairs 阶梯</div>
                    <div>/roadmap 路线</div>
                  </div>
                </div>
                
                {/* Template-specific hints */}
                {(selectedTemplate.startsWith('compare-') || selectedTemplate === 'auto') && (
                  <div className="text-xs text-blue-600 bg-blue-50 rounded px-2 py-1.5 border border-blue-100">
                    💡 对比模板提示：输入 "A vs B" 格式，AI 会自动使用对比模板
                  </div>
                )}
              </div>
              
              {/* Test Button */}
              <button
                onClick={() => {
                  const testDsl = `infographic list-row-simple-horizontal-arrow
data
  items
    - label Step 1
      desc Start
    - label Step 2
      desc In Progress
    - label Step 3
      desc Complete`;
                  const testElement: DiagramElement = {
                    id: `test-infographic-${Date.now()}`,
                    type: ToolType.INFOGRAPHIC,
                    x: 100,
                    y: 100,
                    width: 800,
                    height: 400,
                    dsl: testDsl,
                    strokeColor: '#000',
                    fillColor: '#fff',
                    strokeWidth: 1
                  };
                  onElementsGenerated([testElement], 'Test Infographic', null);
                }}
                className="text-xs text-blue-600 hover:text-blue-700 underline self-start"
              >
                🧪 测试渲染
              </button>
            </>
          )}
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading || !prompt.trim() || !aiConfig}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium shadow-md shadow-blue-200 flex items-center justify-center gap-2 transition-all active:scale-95"
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles size={18} />
              Generate Diagram
            </>
          )}
        </button>
      </div>

      {/* History Section - 独立滚动区域 */}
      <div className="flex-1 flex flex-col min-h-0 bg-gray-50">
        {/* History Header - 固定 */}
        <div 
          className="flex-shrink-0 p-3 border-b border-gray-200 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors"
          onClick={() => history.length > 0 && setHistoryExpanded(!historyExpanded)}
        >
          <div className="flex items-center gap-2">
            <History size={16} className="text-gray-500" />
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
              History
            </span>
            {history.length > 0 && (
              <span className="bg-blue-600 text-white text-[10px] rounded-full px-1.5 py-0.5 min-w-[18px] flex items-center justify-center">
                {history.length}
              </span>
            )}
          </div>
          {history.length > 0 && (
            historyExpanded ? (
              <ChevronUp size={16} className="text-gray-400" />
            ) : (
              <ChevronDown size={16} className="text-gray-400" />
            )
          )}
        </div>

        {/* History List - 独立滚动 */}
        {historyExpanded && (
          <div className="flex-1 overflow-y-auto min-h-0">
            {history.length === 0 ? (
              <div className="p-6 text-center text-gray-400 text-xs">
                <History size={28} className="mx-auto mb-2 opacity-30" />
                <p className="font-medium">No history yet</p>
                <p className="mt-1 text-gray-300">Generate a diagram to see history here</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {history.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setPrompt(item.prompt);
                      setImage(item.image);
                    }}
                    className="p-3 bg-white hover:bg-blue-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      {item.image ? (
                        <img 
                          src={item.image} 
                          alt="Reference" 
                          className="w-12 h-12 object-cover rounded-md border border-gray-200 flex-shrink-0 shadow-sm"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-md border border-gray-200 bg-gray-50 flex items-center justify-center flex-shrink-0">
                          <Sparkles size={16} className="text-gray-300" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-700 line-clamp-2 mb-1 leading-relaxed">
                          {item.prompt || '(No prompt)'}
                        </p>
                        <div className="flex items-center gap-1 text-[10px] text-gray-400">
                          <Clock size={9} />
                          <span>{new Date(item.timestamp).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Config Modal */}
      <ModelConfigModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        onSave={handleConfigSave}
      />
    </div>
  );
};
