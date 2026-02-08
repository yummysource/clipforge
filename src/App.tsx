/**
 * @file 应用根组件
 * @description 配置 React Router 路由，定义所有页面的路由映射
 */
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { HomePage } from '@/pages/HomePage';
import { ConvertPage } from '@/pages/ConvertPage';
import { CompressPage } from '@/pages/CompressPage';
import { TrimPage } from '@/pages/TrimPage';
import { MergePage } from '@/pages/MergePage';
import { AudioPage } from '@/pages/AudioPage';
import { WatermarkPage } from '@/pages/WatermarkPage';
import { ResizePage } from '@/pages/ResizePage';
import { GifPage } from '@/pages/GifPage';
import { SubtitlePage } from '@/pages/SubtitlePage';
import { DownloadPage } from '@/pages/DownloadPage';
import { SettingsPage } from '@/pages/SettingsPage';

/**
 * 应用根组件
 *
 * 使用 BrowserRouter 配置路由，所有功能页面嵌套在 AppLayout 布局组件内。
 * 首页显示 3x3 功能卡片网格，各功能页面通过路由切换。
 */
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<HomePage />} />
          <Route path="convert" element={<ConvertPage />} />
          <Route path="compress" element={<CompressPage />} />
          <Route path="trim" element={<TrimPage />} />
          <Route path="merge" element={<MergePage />} />
          <Route path="audio" element={<AudioPage />} />
          <Route path="watermark" element={<WatermarkPage />} />
          <Route path="resize" element={<ResizePage />} />
          <Route path="gif" element={<GifPage />} />
          <Route path="subtitle" element={<SubtitlePage />} />
          <Route path="download" element={<DownloadPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
