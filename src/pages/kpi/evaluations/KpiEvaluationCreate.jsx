import { useState, useEffect, useRef } from 'react';
import {
  Card, Row, Col, Typography, Button,
  Form, Select, DatePicker, Breadcrumb,
  App, Spin, Radio, Divider, Result, List, Tag,
} from 'antd';
import { SaveOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

import kpiEvaluationApi      from '../../../services/kpi/kpiEvaluationApi';
import employeeOptionApi      from '../../../services/employee/employeeOptionApi';
import useKpiEvaluationStore from '../../../store/kpiEvaluationStore';
import handleApiError        from '../../../utils/handleApiError';

import EmployeeBulkSelector from './EmployeeBulkSelector';

const { RangePicker } = DatePicker;

const KpiEvaluationCreate = () => {
  const navigate             = useNavigate();
  const { message }          = App.useApp();
  const { fetchEvaluations } = useKpiEvaluationStore();

  const [form]                    = Form.useForm();
  const [employees, setEmployees] = useState([]);
  const [saving,    setSaving]    = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [hasMore,   setHasMore]   = useState(true);
  const [page,      setPage]      = useState(1);
  const [mode,      setMode]      = useState('individual'); // 'individual' | 'bulk'
  const [bulkResult, setBulkResult] = useState(null);        // result summary after bulk create

  const searchRef = useRef('');

  // ── Load employees ─────────────────────────────────────────────────────────
  const loadEmployees = async (search = '', pageNumber = 1, append = false) => {
    if (loading) return;
    setLoading(true);
    try {
      const { data } = await employeeOptionApi.getActive({ search, page: pageNumber}); 
      const options = data.employees.map((emp) => ({
        value: emp.id,
        label: `${emp.employee_code} - ${emp.full_name} (${emp.position_name || ''})`,
      }));

      setEmployees((prev) => append ? [...prev, ...options] : options);
      setHasMore(Boolean(data.next_page_url));
      setPage(pageNumber);
    } catch {
      message.error('Failed to load employees.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const handleSearch = (value) => {
    searchRef.current = value;
    loadEmployees(value, 1, false);
  };

  const handleClear = () => {
    searchRef.current = '';
    loadEmployees('', 1, false);
  };

  const handlePopupScroll = (e) => {
    const target = e.target;
    const reachedBottom = target.scrollTop + target.offsetHeight >= target.scrollHeight - 10;
    if (reachedBottom && hasMore && !loading) {
      loadEmployees(searchRef.current, page + 1, true);
    }
  };

  // ── Save — individual or bulk ────────────────────────────────────────────
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      const periodStart = dayjs(values.period[0]).format('YYYY-MM-DD');
      const periodEnd    = dayjs(values.period[1]).format('YYYY-MM-DD');

      if (mode === 'individual') {
        const payload = {
          employee_id:      values.employee_id,
          period_start:      periodStart,
          period_end:        periodEnd,
          evaluation_type:   values.evaluation_type,
        };

        const { data } = await kpiEvaluationApi.create(payload);

        if (data.success) {
          message.success(data.message);
          fetchEvaluations();
          navigate('/kpi-evaluations');
        } else {
          message.error(data.message || 'Failed to create evaluation.');
        }
      } else {
        const payload = {
          employee_ids:      values.employee_ids,
          period_start:      periodStart,
          period_end:        periodEnd,
          evaluation_type:   values.evaluation_type,
        };

        const { data } = await kpiEvaluationApi.bulkCreate(payload);

        if (data.success) {
          message.success(data.message);
          fetchEvaluations();
          setBulkResult(data); // show summary instead of navigating immediately
        } else {
          message.error(data.message || 'Failed to create evaluations.');
        }
      }
    } catch (error) {
      handleApiError(error, message);
    } finally {
      setSaving(false);
    }
  };

  const handleModeChange = (e) => {
    setMode(e.target.value);
    form.setFieldsValue({ employee_id: undefined, employee_ids: undefined });
  };

  // ── Bulk result summary screen ───────────────────────────────────────────
  if (bulkResult) {
    return (
      <>
        <Breadcrumb
          style={{ marginBottom: 16 }}
          items={[
            { title: <Link to='/'>Home</Link> },
            { title: <Link to='/kpi-evaluations'>KPI Evaluations</Link> },
            { title: 'Bulk Create Result' },
          ]}
        />
        <Card>
          <Result
            status={bulkResult.skipped.length > 0 ? 'warning' : 'success'}
            title={bulkResult.message}
          />

          {bulkResult.created.length > 0 && (
            <>
              <Typography.Text strong style={{ color: '#389e0d' }}>
                Created ({bulkResult.created.length})
              </Typography.Text>
              <List
                size='small'
                dataSource={bulkResult.created}
                renderItem={(item) => (
                  <List.Item>
                    <Tag color='success'>{item.name}</Tag>
                  </List.Item>
                )}
                style={{ marginBottom: 16 }}
              />
            </>
          )}

          {bulkResult.skipped.length > 0 && (
            <>
              <Typography.Text strong type='danger'>
                Skipped ({bulkResult.skipped.length})
              </Typography.Text>
              <List
                size='small'
                dataSource={bulkResult.skipped}
                renderItem={(item) => (
                  <List.Item>
                    <Tag color='error'>{item.name}</Tag> — {item.reason}
                  </List.Item>
                )}
                style={{ marginBottom: 16 }}
              />
            </>
          )}

          <Button type='primary' onClick={() => navigate('/kpi-evaluations')}>
            Back to Evaluations
          </Button>
        </Card>
      </>
    );
  }

  // ── Form screen ───────────────────────────────────────────────────────────
  return (
    <>
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { title: <Link to='/'>Home</Link> },
          { title: <Link to='/kpi-evaluations'>KPI Evaluations</Link> },
          { title: 'Create Evaluation' },
        ]}
      />

      <Card
        title={
          <Row align='middle' gutter={8}>
            <Col>
              <Button
                icon={<ArrowLeftOutlined />}
                type='text'
                onClick={() => navigate('/kpi-evaluations')}
              />
            </Col>
            <Col>
              <Typography.Title level={4} style={{ margin: 0 }}>
                Create KPI Evaluation
              </Typography.Title>
            </Col>
          </Row>
        }
        extra={
          <Button
            type='primary'
            icon={<SaveOutlined />}
            loading={saving}
            onClick={handleSave}
          >
            {mode === 'individual' ? 'Create Evaluation' : 'Create Evaluations'}
          </Button>
        }
      >
        {/* Creation Mode */}
        <Form.Item label='Creation Mode' style={{ marginBottom: 16 }}>
          <Radio.Group value={mode} onChange={handleModeChange}>
            <Radio.Button value='individual'>Individual</Radio.Button>
            <Radio.Button value='bulk'>Bulk</Radio.Button>
          </Radio.Group>
        </Form.Item>

        <Divider style={{ borderColor: '#b7eb8f', marginTop: 0 }} />

        <Form form={form} layout='vertical' style={{ maxWidth: 600 }}>

          {mode === 'individual' ? (
            <Form.Item
              name='employee_id'
              label='Employee'
              rules={[{ required: true, message: 'Please select an employee.' }]}
            >
              <Select
                placeholder='Search employee by name or code...'
                showSearch
                allowClear
                filterOption={false}
                options={employees}
                loading={loading}
                onSearch={handleSearch}
                onClear={handleClear}
                onPopupScroll={handlePopupScroll}
                notFoundContent={loading ? <Spin size='small' /> : 'No employees found'}
                style={{ width: '100%' }}
              />
            </Form.Item>
          ) : (
            <Form.Item
              name='employee_ids'
              label='Employees'
              rules={[{ required: true, message: 'Please select at least one employee.' }]}
            >
              <EmployeeBulkSelector
                value={[]}
                onChange={(ids) => form.setFieldValue('employee_ids', ids)}
              />
            </Form.Item>
          )}

          <Form.Item
            name='period'
            label='Evaluation Period'
            rules={[{ required: true, message: 'Please select the evaluation period.' }]}
          >
            <RangePicker
              style={{ width: '100%' }}
              format='YYYY-MM-DD'
              placeholder={['Period Start', 'Period End']}
            />
          </Form.Item>

          <Form.Item
            name='evaluation_type'
            label='Evaluation Type'
            initialValue='self'
            rules={[{ required: true, message: 'Please select an evaluation type.' }]}
          >
            <Radio.Group>
              <Radio value='self'>
                Self Evaluation Required
                <div>
                  <Typography.Text type='secondary' style={{ fontSize: 12 }}>
                    Employee fills self-grade first, then supervisor reviews.
                  </Typography.Text>
                </div>
              </Radio>
              <Radio value='supervisor' style={{ marginTop: 8 }}>
                Supervisor Only
                <div>
                  <Typography.Text type='secondary' style={{ fontSize: 12 }}>
                    Supervisor fills grades directly, no self-evaluation needed.
                  </Typography.Text>
                </div>
              </Radio>
            </Radio.Group>
          </Form.Item>

        </Form>
      </Card>
    </>
  );
};

export default KpiEvaluationCreate;