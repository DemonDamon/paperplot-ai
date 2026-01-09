import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 自定义插件：移除默认 CSP，允许 unsafe-eval
function removeCSPPlugin(): Plugin {
  return {
    name: 'remove-csp',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // 设置宽松的 CSP 头部，允许 eval 和 antv 资源
        res.setHeader(
          'Content-Security-Policy',
          "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; script-src * 'unsafe-inline' 'unsafe-eval' blob:; style-src * 'unsafe-inline'; style-src-elem * 'unsafe-inline'; font-src * data:; img-src * data: blob:;"
        );
        next();
      });
    },
  };
}

export default defineConfig(({ mode }) => {
    return {
      server: {
        port: 3001,
        host: '0.0.0.0',
        proxy: {
          // 代理 OpenAI 兼容 API 请求，解决 CORS 问题
          '/api/openai': {
            target: 'http://47.251.106.113:3010',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api\/openai/, '/v1'),
            secure: false,
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
      plugins: [
        removeCSPPlugin(),
        react()
      ],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
