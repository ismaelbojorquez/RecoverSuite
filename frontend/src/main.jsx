import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import GlobalErrorProvider from './components/GlobalErrorProvider.jsx';
import AuthProvider from './components/AuthProvider.jsx';
import { AppThemeProvider } from './theme.js';
import { NotifyProvider } from './hooks/useNotify.jsx';
import './styles/design-tokens.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppThemeProvider>
      <NotifyProvider>
        <AuthProvider>
          <GlobalErrorProvider>
            <App />
          </GlobalErrorProvider>
        </AuthProvider>
      </NotifyProvider>
    </AppThemeProvider>
  </React.StrictMode>
);
