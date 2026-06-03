// src/App.jsx

import { App as AntApp, ConfigProvider } from 'antd';
import AppRoutes from './routes/AppRoutes';

const App = () => {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#389e0d',
          colorLink: '#389e0d',
          colorLinkHover: '#1a4d0f',
        },
      }}
    >
      <AntApp>
        <AppRoutes />
      </AntApp>
    </ConfigProvider>
  );
};

export default App;