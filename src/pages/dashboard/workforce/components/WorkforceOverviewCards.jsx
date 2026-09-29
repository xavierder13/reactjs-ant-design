import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Card, Skeleton, Typography } from 'antd';
import {
  TeamOutlined, UserAddOutlined, SafetyCertificateOutlined, UserDeleteOutlined,
  FileTextOutlined, WarningOutlined, SolutionOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import useAuth from '../../../../hooks/useAuth';
import employeeApi from '../../../../services/employee/employeeApi';
import nteApi from '../../../../services/employee/nteApi';
import disciplinaryApi from '../../../../services/employee/disciplinaryApi';
import recruitmentApi from '../../../../services/recruitment/recruitmentApi';

const { Text } = Typography;

// The HR / Payroll dashboard's "Employee Master Data" cards (vueportal
// DashboardHR.vue) + Resigned This Month (Employee Master Data index).
// Each card calls the same endpoint the Vue card does, so counts match
// vueportal exactly, and is shown only with the permission that endpoint's
// middleware checks (Administrator always). Company-wide — the page's
// branch/department filter doesn't apply here.
// Neutral request bodies: this page has no search, so table_headers is [].
const LIST_BODY = { items_per_page: 1, search: '', search_branch: '', table_headers: [] };

const CARD_DEFS = [
  {
    // anyone sees the count; opening the list needs the list permission
    key: 'totalEmployees', label: 'Total Employees', icon: <TeamOutlined />, permission: null,
    link: '/employees', linkPermission: 'employee-master-data-list',
    fetchCount: async () => (await recruitmentApi.getTotalActiveEmployees()).data.total_active_employees,
  },
  {
    // EmployeeMasterDataMaintenance gates hired_this_month on this permission
    key: 'hiredThisMonth', label: 'Hired This Month', icon: <UserAddOutlined />, permission: 'employee-master-data-for-regularization',
    link: '/employees/hired-this-month',
    fetchCount: async () => (await employeeApi.getHiredThisMonth(LIST_BODY)).data.employees.total,
  },
  {
    key: 'forRegularization', label: 'For Regularization', icon: <SafetyCertificateOutlined />, permission: 'employee-master-data-for-regularization',
    link: '/employees/for-regularization',
    fetchCount: async () => (await employeeApi.getForRegularization({ ...LIST_BODY, include_sales_specialist: false })).data.employees.total,
  },
  {
    key: 'resigned', label: 'Resigned This Month', icon: <UserDeleteOutlined />, permission: 'employee-master-data-resigned-list',
    link: '/employees/resigned',
    fetchCount: async () => (await employeeApi.getResigned({
      ...LIST_BODY,
      date_field_param: 'resignation_date_filed',
      date_from: dayjs().startOf('month').format('YYYY-MM-DD'),
      date_to: dayjs().format('YYYY-MM-DD'),
    })).data.employees.total,
  },
  {
    key: 'nte', label: 'NTE (Open)', icon: <FileTextOutlined />, permission: 'employee-master-data-nte-list',
    link: '/employees/nte',
    fetchCount: async () => (await nteApi.getOpenQueue()).data.explanations.length,
  },
  {
    key: 'disciplinary', label: 'Disciplinary (Open)', icon: <WarningOutlined />, permission: 'employee-master-data-disciplinary-list',
    link: '/employees/disciplinary',
    fetchCount: async () => (await disciplinaryApi.getOpenQueue()).data.disciplinaries.length,
  },
  {
    // same sum as DashboardHR's vacancyCount: open headcount where required > current
    key: 'vacancies', label: 'Total Vacancies', icon: <SolutionOutlined />, permission: 'vacancy-list',
    link: '/vacancies',
    fetchCount: async () => (await recruitmentApi.getVacancies()).data.vacancies
      .reduce((sum, v) => sum + Math.max(v.required - v.current, 0), 0),
  },
];

const WorkforceOverviewCards = ({ refreshKey }) => {
  const navigate = useNavigate();
  const { roles, permissions } = useAuth();

  // Each card opens its list page (same pages the vueportal HR / Payroll
  // dashboard cards open); a card's link needs the same permission as its
  // count, except Total Employees (see linkPermission).
  const visibleCards = useMemo(() => {
    const isAdmin = roles.includes('Administrator');
    const allowed = (p) => !p || isAdmin || permissions.includes(p);
    return CARD_DEFS
      .filter((c) => allowed(c.permission))
      .map((c) => ({ ...c, clickable: allowed(c.linkPermission || c.permission) }));
  }, [roles, permissions]);

  const [counts, setCounts] = useState({});

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      await Promise.all(visibleCards.map(async (card) => {
        let count = null;
        try {
          count = await card.fetchCount();
        } catch (error) {
          console.error(`[WorkforceDashboard] ${card.label} count failed:`, error);
        }
        if (!cancelled) setCounts((prev) => ({ ...prev, [card.key]: count }));
      }));
    };
    load();
    return () => { cancelled = true; };
  }, [visibleCards, refreshKey]);

  return (
    <Row gutter={[12, 12]}>
      {visibleCards.map((card) => (
        <Col key={card.key} flex='1 1 150px'>
          <Card
            size='small'
            hoverable={card.clickable}
            onClick={card.clickable ? () => navigate(card.link) : undefined}
            onKeyDown={card.clickable ? (e) => { if (e.key === 'Enter') navigate(card.link); } : undefined}
            role={card.clickable ? 'link' : undefined}
            tabIndex={card.clickable ? 0 : undefined}
            aria-label={card.clickable ? `${card.label} — open list` : undefined}
            style={{ height: '100%', borderRadius: 8, cursor: card.clickable ? 'pointer' : 'default' }}
            styles={{ body: { padding: '12px 14px' } }}
          >
            <Text type='secondary' style={{ fontSize: 12 }}>
              <span style={{ marginRight: 6 }}>{card.icon}</span>{card.label}
            </Text>
            {card.key in counts ? (
              <div style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.3, marginTop: 4 }}>
                {counts[card.key] != null
                  ? counts[card.key].toLocaleString()
                  : <Text type='secondary' style={{ fontSize: 16 }}>—</Text>}
              </div>
            ) : (
              <Skeleton.Button active size='small' style={{ width: 56, marginTop: 8 }} />
            )}
          </Card>
        </Col>
      ))}
    </Row>
  );
};

export default WorkforceOverviewCards;
