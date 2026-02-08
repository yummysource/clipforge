import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

/**
 * Vite 构建配置
 * @description Tauri 开发环境使用 localhost:1420 作为前端开发服务器
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  // Tauri 开发模式下使用 1420 端口避免冲突
  server: {
    port: 1420,
    strictPort: true,
  },

  // 清除 console 和 debugger（生产构建）
  esbuild: {
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
  },
});
