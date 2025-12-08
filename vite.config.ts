import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
    // Vite 会自动加载 .env.local 文件并以 VITE_ 开头的变量注入到 import.meta.env
    // 这里不需要手动 define，只需要确保环境变量以 VITE_ 开头即可
    return {
      server: {
        port: 3001,
        host: '0.0.0.0',
        proxy: {
          // 代理 OpenAI 兼容 API 请求，解决 CORS 问题
          '/api/openai': {
            target: 'http://47.251.106.113:3010',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api\/openai/, '/v1/chat/completions'),
            secure: false, // 如果是 http，设置为 false
            configure: (proxy, _options) => {
              proxy.on('error', (err, _req, _res) => {
                console.log('代理错误:', err);
              });
              proxy.on('proxyReq', (proxyReq, req, res) => {
                console.log('代理请求:', req.method, req.url, '->', proxyReq.path);
              });
            },
          },
        },
      },
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
