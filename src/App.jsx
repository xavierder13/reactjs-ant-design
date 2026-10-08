// src/App.jsx

import { App as AntApp, ConfigProvider } from 'antd';
import AppRoutes from './routes/AppRoutes';

const App = () => {
  return (
    <ConfigProvider
      // Every paged table offers records per page — also the ones that keep
      // AntD's default pagination (see src/utils/tablePagination.js).
      pagination={{ showSizeChanger: true }}
      theme={{
        token: {
          colorPrimary: '#389e0d',
          colorLink: '#389e0d',
          colorLinkHover: '#1a4d0f',
        },
        components: {
          // Every dialog: full-width divider under the title and above the
          // action buttons. Padding moves from the content box to each
          // section so the dividers run edge to edge.
          Modal: {
            contentPadding: 0,
            headerPadding: '16px 24px',
            headerMarginBottom: 0,
            headerBorderBottom: '1px solid rgba(5, 5, 5, 0.06)',
            bodyPadding: 24,
            footerPadding: '12px 24px',
            footerMarginTop: 0,
            footerBorderTop: '1px solid rgba(5, 5, 5, 0.06)',
          },
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