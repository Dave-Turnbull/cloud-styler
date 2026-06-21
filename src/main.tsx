import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { CloudStylerPage } from './pages/CloudStylerPage';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CloudStylerPage />
  </StrictMode>,
);
