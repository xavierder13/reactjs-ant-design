// src/layouts/MainLayout.jsx

import * as React from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import {
  Layout,
  Menu,
  Avatar,
  Typography,
  Dropdown,
  Button,
  Divider,
  Badge,
  Space,
  Breadcrumb,
  Spin,
  ConfigProvider
} from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  TeamOutlined,
  SettingOutlined,
  LogoutOutlined,
  MenuOutlined,
  BellOutlined,
  DownOutlined,
  IdcardOutlined,
  SolutionOutlined,
  StarOutlined,
  BarChartOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import useAuth from '../hooks/useAuth';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

// ─── Page title map ────────────────────────────────────────────────────────────
const titleMap = {
  '/dashboard':              { title: 'Dashboard',           breadcrumb: ['Dashboard'] },
  '/users':                  { title: 'User Accounts',       breadcrumb: ['User Management', 'User Accounts'] },
  '/user/profile':           { title: 'My Profile',          breadcrumb: ['User Management', 'My Profile'] },
  '/roles':                  { title: 'Roles',               breadcrumb: ['Authorizations', 'Roles'] },
  '/permissions':            { title: 'Permissions',         breadcrumb: ['Authorizations', 'Permissions'] },
  '/employees':              { title: 'Employee Master Data', breadcrumb: ['Employee', 'Master Data'] },
  '/employees/create':       { title: 'Create Employee',     breadcrumb: ['Employee', 'Create'] },
  '/recruitment/:url':       { title: 'Applicant List',      breadcrumb: ['Recruitment', 'Applicant List'] },
  '/kpi-templates':          { title: 'KPI Templates',       breadcrumb: ['KPI Management', 'KPI Templates'] },
  '/kpi-templates/create':   { title: 'Create KPI Template', breadcrumb: ['KPI Management', 'KPI Templates', 'Create'] },
  '/kpi-evaluations':        { title: 'KPI Evaluations',     breadcrumb: ['KPI Management', 'Evaluations'] },
  '/kpi-evaluations/create': { title: 'Create Evaluation',     breadcrumb: ['KPI Management', 'Evaluations', 'Create'] },
  '/my-evaluations':         { title: 'My Evaluations',        breadcrumb: ['KPI Management', 'My Evaluations'] },
  '/manpower-requests':        { title: 'Manpower Requests',       breadcrumb: ['Manpower Request', 'All Requests'] },
  '/manpower-requests/create': { title: 'Create Manpower Request', breadcrumb: ['Manpower Request', 'Create'] },

};

// ─── Menu data ─────────────────────────────────────────────────────────────────
const menuData = [
  { key: 'dashboard', title: 'Dashboard', link: '/dashboard', icon: <DashboardOutlined /> },
  { type: 'divider' },

  // ── Human Resource ──────────────────────────────────────────────────────────
  {
    key: 'human-resource',
    type: 'group',
    label: 'Human Resource',
    children: [
      {
        key: 'employee',
        title: 'Employee',
        icon: <IdcardOutlined />,
        children: [
          { key: 'master-data',    title: 'Master Data',    link: '/employees',         permissions: ['employee-master-data-list'] },
          { key: 'master-data-create',    title: 'Master Data Create',    link: '/employees/create',         permissions: ['employee-master-data-create'] },
        ]
      },
      {
        key: 'recruitment',
        title: 'Recruitment',
        icon: <SolutionOutlined />,
        children: [
          { key: 'job-applicants',    title: 'Job Applicants',    link: '/recruitment/applicant-list',         permissions: ['careers-applicant-list'] },
          { key: 'screening',         title: 'Screening',         link: '/recruitment/screening-list',         permissions: ['careers-screening-list'] },
          { key: 'initial-interview', title: 'Initial Interview', link: '/recruitment/initial-interview-list', permissions: ['careers-initial-interview-list'] },
          { key: 'exam',              title: 'Exam',              link: '/recruitment/iq-test-list',           permissions: ['careers-iq-test-list'] },
          { key: 'bi-basic-req',      title: 'B.I & Basic Req.',  link: '/recruitment/bi-list',                permissions: ['careers-bi-list'] },
          { key: 'final-interview',   title: 'Final Interview',   link: '/recruitment/final-interview-list',   permissions: ['careers-final-interview-list'] },
          { key: 'orientation',       title: 'Orientation',       link: '/recruitment/orientation-list',       permissions: ['careers-orientation-list'] },
        ],
      },
      {
        key: 'manpower-request',
        title: 'Manpower Request',
        icon: <FileTextOutlined />,
        children: [
          { key: 'manpower-request-list',   title: 'All Requests',    link: '/manpower-requests',        permissions: ['manpower-request-list', 'manpower-request-list-all'] },
          { key: 'manpower-request-create', title: 'Create Request',  link: '/manpower-requests/create',  permissions: ['manpower-request-create'] },
        ],
      },
    ],
  },

  { type: 'divider' },

  // ── KPI Management ─────────────────────────────────────────────────
  {
    key: 'kpi-management',
    type: 'group',
    label: 'KPI Management',
    children: [
      {
        key: 'kpi-template',
        title: 'KPI Template',
        icon: <BarChartOutlined />,
        children: [
          { key: 'kpi-template-list',  title: 'Template List',    link: '/kpi-templates',        permissions: ['kpi-template-list'] },
          { key: 'kpi-template-create',  title: 'Template Create',         link: '/kpi-templates/create',  permissions: ['kpi-template-create', 'kpi-template-edit'] },
        ],
      },
      {
        key: 'kpi-evaluations',
        title: 'Evaluations',
        icon: <FileTextOutlined />,
        children: [
          { key: 'kpi-evaluation-list',   title: 'All Evaluations', link: '/kpi-evaluations',        permissions: ['kpi-evaluation-list'] },
          { key: 'kpi-evaluation-create', title: 'Create Evaluation', link: '/kpi-evaluations/create', permissions: ['kpi-evaluation-create'] },
          { key: 'kpi-my-evaluations',    title: 'My Evaluations',  link: '/my-evaluations',          permissions: ['kpi-self-evaluation-list'] },
        ],
      },      
    ],
  },

  // ── Set Up & Authorizations ─────────────────────────────────────────────────
  {
    key: 'setup-group',
    type: 'group',
    label: 'Set Up & Authorizations',
    children: [
      {
        key: 'user-management',
        title: 'User Management',
        icon: <UserOutlined />,
        children: [
          { key: 'user-list', title: 'User Accounts', link: '/users', permissions: ['user-list'] },
        ],
      },
      { key: 'roles',       title: 'Roles',       icon: <TeamOutlined />,    link: '/roles',       permissions: ['role-list'] },
      { key: 'permissions', title: 'Permissions', icon: <SettingOutlined />, link: '/permissions', permissions: ['permission-list'] },
    ],
  },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────
function getMenuState(items, path) {
  let activeKey = '';
  let openKeys = [];

  // Pass 1: Exact match
  const findExact = (items, parents = []) => {
    for (const item of items) {
      if (!item || item.type === 'divider') continue;

      if (item.link === path) {
        activeKey = item.key;
        openKeys = parents;
        return true;
      }

      if (item.children && findExact(item.children, [...parents, item.key])) {
        return true;
      }
    }

    return false;
  };

  // Pass 2: Prefix match
  const findPartial = (items, parents = []) => {
    for (const item of items) {
      if (!item || item.type === 'divider') continue;

      if (
        item.link &&
        path.startsWith(item.link + '/')
      ) {
        activeKey = item.key;
        openKeys = parents;
        return true;
      }

      if (item.children && findPartial(item.children, [...parents, item.key])) {
        return true;
      }
    }

    return false;
  };

  findExact(items) || findPartial(items);

  return { activeKey, openKeys };
}

// ─── Main Layout ───────────────────────────────────────────────────────────────
const MainLayout = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, isLoaded, hasPermission, hasRole, hasAnyPermission, clearAuth } = useAuth();
  const [collapsed, setCollapsed] = React.useState(false);

  const getPageMeta = (pathname) => {
    if (titleMap[pathname]) return titleMap[pathname];
    if (/^\/kpi-templates\/\d+\/edit$/.test(pathname))
      return { title: 'Edit KPI Template', breadcrumb: ['KPI Management', 'KPI Templates', 'Edit'] };
    if (/^\/employees\/\d+$/.test(pathname))
      return { title: 'View Employee', breadcrumb: ['Employee', 'View'] };
    if (/^\/employees\/\d+\/edit$/.test(pathname))
      return { title: 'Edit Employee', breadcrumb: ['Employee', 'Edit'] };
    if (/^\/kpi-evaluations\/\d+$/.test(pathname))
      return { title: 'View Evaluation', breadcrumb: ['KPI Management', 'Evaluations', 'View'] };
    if (/^\/my-evaluations\/\d+$/.test(pathname))
      return { title: 'Self Evaluation', breadcrumb: ['KPI Management', 'My Evaluations', 'Fill'] };
    if (/^\/manpower-requests\/\d+\/edit$/.test(pathname))
      return { title: 'Edit Manpower Request', breadcrumb: ['Manpower Request', 'Edit'] };
    if (/^\/manpower-requests\/\d+\/print$/.test(pathname))
      return { title: 'Print Manpower Request', breadcrumb: ['Manpower Request', 'Print'] };
    if (/^\/manpower-requests\/\d+$/.test(pathname))
      return { title: 'View Manpower Request', breadcrumb: ['Manpower Request', 'View'] };
    return { title: '', breadcrumb: ['Home'] };
  };

  const pageMeta = getPageMeta(pathname);

  const { activeKey, openKeys } = getMenuState(menuData, pathname);

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  // ─── Menu item generator ─────────────────────────────────────────────────────
  const generateMenuItem = (item) => {
    if (!item) return null;

    if (item.type === 'divider') return { type: 'divider' };

    if (item.type === 'group') {
      const children = item.children?.map(generateMenuItem).filter(Boolean);
      if (!children?.length) return null;
      return {
        type: 'group',
        key: item.key,
        label: (
          <span style={{
            fontSize: 10,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.35)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}>
            {item.label}
          </span>
        ),
        children,
      };
    }

    if (item.permission && !hasPermission(item.permission)) return null;
    if (item.permissions && !item.permissions.some((p) => hasPermission(p))) return null;

    if (item.children) {
      const children = item.children.map(generateMenuItem).filter(Boolean);
      if (!children.length) return null;
      return {
        key: item.key,
        icon: React.isValidElement(item.icon)
          ? React.cloneElement(item.icon, { style: { color: 'rgba(255,255,255,0.65)', fontSize: 14 } })
          : item.icon,
        label: <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>{item.title}</span>,
        children,
      };
    }

    const isActive = item.key === activeKey;
    return {
      key: item.key,
      icon: React.isValidElement(item.icon)
        ? React.cloneElement(item.icon, {
            style: { color: isActive ? '#fff' : 'rgba(255,255,255,0.65)', fontSize: 14 },
          })
        : item.icon,
      label: item.link
        ? <Link to={item.link} style={{ color: isActive ? '#fff' : 'rgba(255,255,255,0.85)', fontSize: 13 }}>{item.title}</Link>
        : <span style={{ color: isActive ? '#fff' : 'rgba(255,255,255,0.85)', fontSize: 13 }}>{item.title}</span>,
    };
  };

  const isEmployeeOnly = hasRole('KPI Self Evaluation') && !hasAnyPermission('hr-payroll-dashboard');
  
  const menuItems = isEmployeeOnly
    ? [
        {
          key:   'my-evaluations',
          icon:  <StarOutlined style={{ color: 'rgba(255,255,255,0.65)', fontSize: 14 }} />,
          label: <Link to='/my-evaluations' style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>My Evaluations</Link>,
        },
      ]
    : menuData.map(generateMenuItem).filter(Boolean);

  // ─── Avatar dropdown ──────────────────────────────────────────────────────────
  const avatarMenu = {
    items: [
      { key: 'profile', label: 'Profile', icon: <UserOutlined />,  onClick: () => navigate('/user/profile') },
      { type: 'divider' },
      { key: 'logout',  label: 'Logout',  icon: <LogoutOutlined />, onClick: handleLogout },
    ],
  };

  // ─── Breadcrumb items ─────────────────────────────────────────────────────────
  const breadcrumbItems = pageMeta.breadcrumb.map((segment, i) => ({
    title:
      i < pageMeta.breadcrumb.length - 1 ? (
        <span style={{ color: '#8c8c8c' }}>{segment}</span>
      ) : (
        <span style={{ color: '#389e0d' }}>{segment}</span>
      ),
  }));

  // ─── Loading state ────────────────────────────────────────────────────────────
  if (!isLoaded) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh', overflow: 'hidden' }}>

      {/* ── Sidebar ────────────────────────────────────────────────────────────── */}
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={(value) => setCollapsed(value)}
        breakpoint="lg"
        collapsedWidth={0}
        trigger={null}
        width={240}
        style={{
          background: '#1a4d0f',
          margin: 0,
          padding: 0,
          overflow: 'hidden',
          height: '100vh',
          position: 'sticky',
          top: 0,
          left: 0,
        }}
      >
        {/* ── Brand ──────────────────────────────────────────── */}
        <div
          style={{
          padding: '20px 16px 12px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          marginBottom: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
              width: 32,
              height: 32,
              background: '#389e0d',
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              }}
            >
              <Typography.Text style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>
                HR
              </Typography.Text>
            </div>
            {!collapsed && (
                <div>
                <Typography.Text style={{ color: '#fff', fontSize: 12, fontWeight: 600, display: 'block' }}>
                    ADDESSA Corp
                </Typography.Text>
                <Typography.Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>
                    HRIS
                </Typography.Text>
                </div>
            )}
          </div>
        </div>

        {/* ── User info ──────────────────────────────────────── */}
        {/* {!collapsed && (
          <div
            style={{
                padding: '8px 16px 12px',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                marginBottom: 8,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar
              size={32}
              icon={<UserOutlined />}
              style={{ background: '#389e0d', flexShrink: 0 }}
              />
              <div style={{ overflow: 'hidden' }}>
                <Typography.Text style={{ color: '#fff', fontSize: 12, fontWeight: 600, display: 'block' }} ellipsis>
                    {user?.name}
                </Typography.Text>
                <Typography.Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>
                    {user?.role ?? 'User'}
                </Typography.Text>
              </div>
            </div>
          </div>
        )} */}

        {/* ── Menu ───────────────────────────────────────────── */}
        <ConfigProvider
          theme={{
            components: {
              Menu: {
                darkItemBg:             '#1a4d0f',
                darkSubMenuItemBg:      '#163d0b',    // ← submenu expanded bg
                darkItemSelectedBg:     '#389e0d',    // ← active item bg
                darkItemHoverBg:        '#215c12',    // ← hover bg
                darkItemSelectedColor:  '#ffffff',
                darkItemColor:          'rgba(255,255,255,0.85)',
                darkGroupTitleColor:    'rgba(255,255,255,0.35)',
              },
            },
          }}
        >
          <Menu
            mode="inline"
            selectedKeys={[activeKey]}
            defaultOpenKeys={openKeys}
            items={menuItems}
            theme="dark"
            style={{
              background: '#1a4d0f',
              border: 'none',
              height: 'calc(100vh - 180px)',
              overflowY: 'auto',
            }}
          />
        </ConfigProvider>
      </Sider>

      <Layout>

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <Header
          style={{
            height: 52,
            padding: '0 16px',
            background: '#fff',
            borderBottom: '2px solid #389e0d',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          {/* Left: hamburger + breadcrumb */}
          <Space align="center" size={12}>
            <Button
              type="text"
              icon={<MenuOutlined style={{ color: '#389e0d' }} />}
              onClick={() => setCollapsed(!collapsed)}
              style={{
                background: '#f6ffed',
                border: '0.5px solid #d9f7be',
                borderRadius: 6,
                width: 34,
                height: 34,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginLeft: -5,
              }}
            />
            <div>
              <Text strong style={{ fontSize: 14, color: '#1a4d0f', display: 'block', lineHeight: 1.3 }}>
                {pageMeta.title}
              </Text>
              <Breadcrumb items={breadcrumbItems} style={{ fontSize: 11 }} />
            </div>
          </Space>

          {/* Right: bell + user chip */}
          <Space align="center" size={10}>
            <Badge count={0} size="small">
              <Button
                type="text"
                icon={<BellOutlined style={{ color: '#389e0d', fontSize: 16 }} />}
                style={{
                  background: '#f6ffed',
                  border: '0.5px solid #d9f7be',
                  borderRadius: 6,
                  width: 34,
                  height: 34,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              />
            </Badge>

            <Dropdown menu={avatarMenu} placement="bottomRight" trigger={['click']}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  padding: '4px 10px 4px 4px',
                  borderRadius: 8,
                  border: '0.5px solid #d9f7be',
                  background: '#fff',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#f6ffed')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
              >
                <Avatar
                  size={28}
                  icon={<UserOutlined />}
                  style={{ background: '#d9f7be', color: '#276221', fontSize: 11, fontWeight: 600 }}
                />
                <div style={{ lineHeight: 1.3 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#1a4d0f' }}>{user?.name}</div>
                  <div style={{ fontSize: 11, color: '#8c8c8c' }}>{user?.role ?? 'User'}</div>
                </div>
                <DownOutlined style={{ fontSize: 10, color: '#8c8c8c', marginLeft: 2 }} />
              </div>
            </Dropdown>
          </Space>
        </Header>

        {/* ── Content ────────────────────────────────────────────────────────── */}
        <Content
          style={{
            margin: 10,
            background: '#fff',
            padding: 24,
            borderRadius: 8,
            overflow: 'auto',
            height: 'calc(100vh - 52px - 20px)',
          }}
        >
          <Outlet />
        </Content>

      </Layout>
    </Layout>
  );
};

export default MainLayout;