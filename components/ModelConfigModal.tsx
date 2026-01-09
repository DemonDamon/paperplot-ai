import React, { useState, useEffect } from 'react';
import { X, Eye, EyeOff, ChevronDown, Sparkles, Bot, Brain, Zap, Globe } from 'lucide-react';
import { AIProviderConfig, AIProviderType } from '../types';
import { PROVIDER_PRESETS, getAIConfig, saveAIConfig, resetAIConfig } from '../services/configService';

interface ModelConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: AIProviderConfig) => void;
}

// Provider icons mapping
const ProviderIcon: React.FC<{ provider: AIProviderType; size?: number }> = ({ provider, size = 18 }) => {
  const iconProps = { size, className: "flex-shrink-0" };
  switch (provider) {
    case 'gemini':
      return <Sparkles {...iconProps} className="text-blue-500" />;
    case 'openai':
      return <Bot {...iconProps} className="text-green-600" />;
    case 'bailian':
    case 'qwen':
      return <Globe {...iconProps} className="text-orange-500" />;
    case 'glm':
      return <Brain {...iconProps} className="text-purple-500" />;
    case 'deepseek':
      return <Zap {...iconProps} className="text-cyan-500" />;
    case 'minimax':
      return <Bot {...iconProps} className="text-pink-500" />;
    default:
      return <Bot {...iconProps} />;
  }
};

const PROVIDERS: AIProviderType[] = ['gemini', 'bailian', 'openai', 'glm', 'deepseek', 'qwen', 'minimax'];

export const ModelConfigModal: React.FC<ModelConfigModalProps> = ({ isOpen, onClose, onSave }) => {
  const [provider, setProvider] = useState<AIProviderType>('gemini');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [model, setModel] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [providerDropdownOpen, setProviderDropdownOpen] = useState(false);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);

  // Load existing config on mount
  useEffect(() => {
    if (isOpen) {
      const config = getAIConfig();
      if (config) {
        setProvider(config.provider);
        setApiKey(config.apiKey);
        setBaseUrl(config.baseUrl || '');
        setModel(config.model || '');
      } else {
        // Reset to defaults
        setProvider('gemini');
        setApiKey('');
        setBaseUrl('');
        setModel('');
      }
    }
  }, [isOpen]);

  // Update defaults when provider changes
  useEffect(() => {
    const preset = PROVIDER_PRESETS[provider];
    if (preset) {
      setBaseUrl(preset.defaultBaseUrl);
      setModel(preset.defaultModel);
    }
  }, [provider]);

  const handleSave = () => {
    if (!apiKey.trim()) {
      alert('Please enter an API Key');
      return;
    }

    // 清理 Base URL：移除末尾的 /chat/completions（如果有）
    let cleanedBaseUrl = baseUrl.trim();
    if (cleanedBaseUrl) {
      // 移除末尾斜杠
      cleanedBaseUrl = cleanedBaseUrl.replace(/\/+$/, '');
      // 移除 /chat/completions 后缀（不管大小写）
      cleanedBaseUrl = cleanedBaseUrl.replace(/\/chat\/completions$/i, '');
      // 再次移除末尾斜杠
      cleanedBaseUrl = cleanedBaseUrl.replace(/\/+$/, '');
    }

    const config: AIProviderConfig = {
      provider,
      apiKey: apiKey.trim(),
      baseUrl: cleanedBaseUrl || undefined,
      model: model.trim() || undefined,
    };

    saveAIConfig(config);
    onSave(config);
    onClose();
  };

  const handleReset = () => {
    resetAIConfig();
    setProvider('gemini');
    setApiKey('');
    setBaseUrl('');
    setModel('');
  };

  if (!isOpen) return null;

  const currentPreset = PROVIDER_PRESETS[provider];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">Configure Model Service</h2>
          <button 
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          {/* Provider Select */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">Provider</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setProviderDropdownOpen(!providerDropdownOpen)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white hover:border-pink-500 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <ProviderIcon provider={provider} />
                  <span>{currentPreset?.name || provider}</span>
                </div>
                <ChevronDown size={18} className={`text-gray-400 transition-transform ${providerDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {providerDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-600 rounded-xl shadow-xl z-10 overflow-hidden">
                  {PROVIDERS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        setProvider(p);
                        setProviderDropdownOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-700 transition-colors ${
                        provider === p ? 'bg-pink-500/20 text-pink-400' : 'text-white'
                      }`}
                    >
                      <ProviderIcon provider={p} />
                      <span>{PROVIDER_PRESETS[p].name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Base URL (hide for Gemini which uses SDK) */}
          {provider !== 'gemini' && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">Base URL</label>
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder={currentPreset?.defaultBaseUrl || 'https://api.example.com/v1'}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:border-pink-500 focus:outline-none transition-colors"
              />
            </div>
          )}

          {/* API Key */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">API Key</label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="w-full px-4 py-3 pr-12 bg-gray-800 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:border-pink-500 focus:outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-white transition-colors"
              >
                {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Model Select */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">Model</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white hover:border-pink-500 transition-colors"
              >
                <span>{model || currentPreset?.defaultModel || 'Select model'}</span>
                <ChevronDown size={18} className={`text-gray-400 transition-transform ${modelDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {modelDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-600 rounded-xl shadow-xl z-10 overflow-hidden max-h-48 overflow-y-auto">
                  {currentPreset?.models.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setModel(m);
                        setModelDropdownOpen(false);
                      }}
                      className={`w-full px-4 py-3 text-left hover:bg-gray-700 transition-colors ${
                        model === m ? 'bg-pink-500/20 text-pink-400' : 'text-white'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 p-5 border-t border-gray-700">
          <button
            onClick={handleSave}
            className="flex-1 py-3 bg-pink-500 hover:bg-pink-600 text-white font-medium rounded-xl transition-colors"
          >
            Save
          </button>
          <button
            onClick={handleReset}
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-xl transition-colors"
          >
            Reset
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-xl transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
