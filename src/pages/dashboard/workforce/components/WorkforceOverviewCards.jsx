import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Card, Skeleton, Typography } from 'antd';
import {
  TeamOutlined, UserAddOutlined, SafetyCertificateOutlined, UserDeleteOutlined,
  FileTextOutlined, WarningOutlined, SolutionOutlined, RightOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import useAuth from '../../../../hooks/useAuth';
import employeeApi from '../../../../services/employee/employeeApi';
import nteApi from '../../../../services/employee/nteApi';
import disciplinaryApi from '../../../../services/employee/disciplinaryApi';
import recruitmentApi from '../../../../services/recruitment/recruitmentApi';
import { TONES } from './workforceTones';
import { IconBadge } from './StatTile';

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
    key: 'totalEmployees', tone: TONES.people, label: 'Total Employees', icon: <TeamOutlined />, permission: null,
    link: '/employees', linkPermission: 'employee-master-data-list',
    fetchCount: async () => (await recruitmentApi.getTotalActiveEmployees()).data.total_active_employees,
  },
  {
    // EmployeeMasterDataMaintenance gates hired_this_month on this permission
    key: 'hiredThisMonth', tone: TONES.growth, label: 'Hired This Month', icon: <UserAddOutlined />, permission: 'employee-master-data-for-regularization',
    link: '/employees/hired-this-month',
    fetchCount: async () => (await employeeApi.getHiredThisMonth(LIST_BODY)).data.employees.total,
  },
  {
    key: 'forRegularization', tone: TONES.warning, label: 'For Regularization', icon: <SafetyCertificateOutlined />, permission: 'employee-master-data-for-regularization',
    link: '/employees/for-regularization',
    fetchCount: async () => (await employeeApi.getForRegularization({ ...LIST_BODY, include_sales_specialist: false })).data.employees.total,
  },
  {
    key: 'resigned', tone: TONES.serious, label: 'Resigned This Month', icon: <UserDeleteOutlined />, permission: 'employee-master-data-resigned-list',
    link: '/employees/resigned',
    fetchCount: async () => (await employeeApi.getResigned({
      ...LIST_BODY,
      date_field_param: 'resignation_date_filed',
      date_from: dayjs().startOf('month').format('YYYY-MM-DD'),
      date_to: dayjs().format('YYYY-MM-DD'),
    })).data.employees.total,
  },
  {
    key: 'nte', tone: TONES.warning, label: 'NTE (Open)', icon: <FileTextOutlined />, permission: 'employee-master-data-nte-list',
    link: '/employees/nte',
    fetchCount: async () => (await nteApi.getOpenQueue()).data.explanations.length,
  },
  {
    key: 'disciplinary', tone: TONES.critical, label: 'Disciplinary (Open)', icon: <WarningOutlined />, permission: 'employee-master-data-disciplinary-list',
    link: '/employees/disciplinary',
    fetchCount: async () => (await disciplinaryApi.getOpenQueue()).data.disciplinaries.length,
  },
  {
    // same sum as DashboardHR's vacancyCount: open headcount where required > current
    key: 'vacancies', tone: TONES.people, label: 'Total Vacancies', icon: <SolutionOutlined />, permission: 'vacancy-list',
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
            style={{ height: '100%', borderRadius: 10, overflow: 'hidden', borderTop: `3px solid ${card.tone}`, cursor: card.clickable ? 'pointer' : 'default' }}
            styles={{ body: { padding: '12px 14px', height: '100%', display: 'flex', flexDirection: 'column' } }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <IconBadge icon={card.icon} tone={card.tone} />
              <Text type='secondary' style={{ fontSize: 12, lineHeight: 1.3 }}>{card.label}</Text>
            </div>
            {card.key in counts ? (
              <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.2, marginTop: 10, color: '#1f1f1d' }}>
                {counts[card.key] != null
                  ? counts[card.key].toLocaleString()
                  : <Text type='secondary' style={{ fontSize: 16 }}>—</Text>}
              </div>
            ) : (
              <Skeleton.Button active size='small' style={{ width: 56, marginTop: 12 }} />
            )}
            {card.clickable && (
              <Text type='secondary' style={{ fontSize: 11, marginTop: 'auto', paddingTop: 6 }}>
                View list <RightOutlined style={{ fontSize: 9 }} />
              </Text>
            )}
          </Card>
        </Col>
      ))}
    </Row>
  );
};

export default WorkforceOverviewCards;
