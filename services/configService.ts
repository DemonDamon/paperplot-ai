import { AIProviderConfig, AIProviderType, AIProviderPreset } from '../types';

const STORAGE_KEY = 'paperplot-ai-config';

// Provider presets with default configurations
export const PROVIDER_PRESETS: Record<AIProviderType, AIProviderPreset> = {
  gemini: {
    name: 'Google Gemini',
    defaultBaseUrl: '', // Uses SDK internally
    defaultModel: 'gemini-2.0-flash',
    models: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
  },
  bailian: {
    name: '阿里云百炼',
    defaultBaseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    defaultModel: 'qwen-plus',
    models: ['qwen-plus', 'qwen-turbo', 'qwen-max', 'qwen-vl-plus'],
  },
  openai: {
    name: 'OpenAI',
    defaultBaseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  },
  glm: {
    name: '智谱 GLM',
    defaultBaseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    defaultModel: 'glm-4',
    models: ['glm-4', 'glm-4-flash', 'glm-4v'],
  },
  minimax: {
    name: 'MiniMax',
    defaultBaseUrl: 'https://api.minimax.chat/v1',
    defaultModel: 'abab6.5-chat',
    models: ['abab6.5-chat', 'abab5.5-chat'],
  },
  deepseek: {
    name: 'DeepSeek',
    defaultBaseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    models: ['deepseek-chat', 'deepseek-coder'],
  },
  qwen: {
    name: '通义千问',
    defaultBaseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    defaultModel: 'qwen-max',
    models: ['qwen-max', 'qwen-plus', 'qwen-turbo'],
  },
};

/**
 * Get AI configuration from localStorage, falling back to environment variables
 */
export function getAIConfig(): AIProviderConfig | null {
  // First try localStorage
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const config = JSON.parse(stored) as AIProviderConfig;
      if (config.provider && config.apiKey) {
        return config;
      }
    }
  } catch (e) {
    console.warn('[ConfigService] Failed to parse stored config:', e);
  }

  // Fallback to environment variables
  const envProvider = import.meta.env.VITE_AI_PROVIDER as AIProviderType | undefined;
  
  if (envProvider) {
    const envConfig = getEnvConfigForProvider(envProvider);
    if (envConfig) {
      return envConfig;
    }
  }

  // Try Gemini as default
  const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (geminiKey) {
    return {
      provider: 'gemini',
      apiKey: geminiKey,
      model: 'gemini-2.0-flash',
    };
  }

  return null;
}

/**
 * Get environment config for a specific provider
 */
function getEnvConfigForProvider(provider: AIProviderType): AIProviderConfig | null {
  const preset = PROVIDER_PRESETS[provider];
  
  switch (provider) {
    case 'gemini': {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (apiKey) {
        return {
          provider,
          apiKey,
          model: preset.defaultModel,
        };
      }
      break;
    }
    case 'bailian': {
      const apiKey = import.meta.env.VITE_BAILIAN_API_KEY;
      if (apiKey) {
        return {
          provider,
          apiKey,
          baseUrl: import.meta.env.VITE_BAILIAN_BASE_URL || preset.defaultBaseUrl,
          model: import.meta.env.VITE_BAILIAN_MODEL || preset.defaultModel,
        };
      }
      break;
    }
    case 'openai': {
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
      if (apiKey) {
        return {
          provider,
          apiKey,
          baseUrl: import.meta.env.VITE_OPENAI_BASE_URL || preset.defaultBaseUrl,
          model: import.meta.env.VITE_OPENAI_MODEL || preset.defaultModel,
        };
      }
      break;
    }
    case 'glm': {
      const apiKey = import.meta.env.VITE_GLM_API_KEY;
      if (apiKey) {
        return {
          provider,
          apiKey,
          baseUrl: import.meta.env.VITE_GLM_BASE_URL || preset.defaultBaseUrl,
          model: import.meta.env.VITE_GLM_MODEL || preset.defaultModel,
        };
      }
      break;
    }
    case 'minimax': {
      const apiKey = import.meta.env.VITE_MINIMAX_API_KEY;
      if (apiKey) {
        return {
          provider,
          apiKey,
          baseUrl: import.meta.env.VITE_MINIMAX_BASE_URL || preset.defaultBaseUrl,
          model: import.meta.env.VITE_MINIMAX_MODEL || preset.defaultModel,
        };
      }
      break;
    }
    case 'deepseek':
    case 'qwen': {
      // These use OpenAI-compatible API, check if configured via OpenAI vars
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
      if (apiKey) {
        return {
          provider,
          apiKey,
          baseUrl: preset.defaultBaseUrl,
          model: preset.defaultModel,
        };
      }
      break;
    }
  }
  
  return null;
}

/**
 * Save AI configuration to localStorage
 */
export function saveAIConfig(config: AIProviderConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('[ConfigService] Failed to save config:', e);
    throw new Error('Failed to save configuration');
  }
}

/**
 * Reset AI configuration (remove from localStorage)
 */
export function resetAIConfig(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('[ConfigService] Failed to reset config:', e);
  }
}

/**
 * Check if a config exists (either in localStorage or env)
 */
export function hasAIConfig(): boolean {
  return getAIConfig() !== null;
}

/**
 * Get the display name for a provider
 */
export function getProviderDisplayName(provider: AIProviderType): string {
  return PROVIDER_PRESETS[provider]?.name || provider;
}
