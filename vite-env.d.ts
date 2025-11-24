/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AI_PROVIDER?: string;
  readonly VITE_GEMINI_API_KEY?: string;
  readonly VITE_BAILIAN_API_KEY?: string;
  readonly VITE_BAILIAN_BASE_URL?: string;
  readonly VITE_BAILIAN_MODEL?: string;
  readonly VITE_GLM_API_KEY?: string;
  readonly VITE_GLM_BASE_URL?: string;
  readonly VITE_GLM_MODEL?: string;
  readonly VITE_MINIMAX_API_KEY?: string;
  readonly VITE_MINIMAX_BASE_URL?: string;
  readonly VITE_MINIMAX_MODEL?: string;
  readonly VITE_OPENAI_API_KEY?: string;
  readonly VITE_OPENAI_BASE_URL?: string;
  readonly VITE_OPENAI_MODEL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

