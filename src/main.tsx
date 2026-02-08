/**
 * @file React 应用入口
 * @description 挂载 React 根组件到 DOM，引入全局样式
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
