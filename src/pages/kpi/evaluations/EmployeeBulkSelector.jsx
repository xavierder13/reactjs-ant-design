import { useState, useEffect, useRef } from 'react';
import {
  Row, Col, Input, Table, List,
  Button, Typography, Empty, Tag,
} from 'antd';
import { SearchOutlined, CloseOutlined, ClearOutlined } from '@ant-design/icons';

import kpiEvaluationApi from '../../../services/kpi/kpiEvaluationApi';

const EmployeeBulkSelector = ({ value = [], onChange }) => {
  const [employees, setEmployees]   = useState([]);
  const [loading,   setLoading]     = useState(false);
  const [page,      setPage]        = useState(1);
  const [hasMore,   setHasMore]     = useState(true);
  const [search,    setSearch]      = useState('');

  // selected employees stored as full objects { id, full_name, employee_code, position_name }
  const [selected, setSelected] = useState(value);

  const searchRef    = useRef('');
  const tableBodyRef  = useRef(null);

  // ── Load employees ─────────────────────────────────────────────────────────
  const loadEmployees = async (searchValue = '', pageNumber = 1, append = false) => {
    setLoading(true);
    try {
      const { data } = await kpiEvaluationApi.getEmployees({
        search: searchValue,
        page:   pageNumber,
      });

      setEmployees((prev) => append ? [...prev, ...data.data] : data.data);
      setHasMore(Boolean(data.next_page_url));
      setPage(pageNumber);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  // ── Sync selected back to parent form ────────────────────────────────────
  useEffect(() => {
    onChange?.(selected.map((e) => e.id));
  }, [selected]);

  // ── Search ─────────────────────────────────────────────────────────────────
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearch(val);
    searchRef.current = val;
    loadEmployees(val, 1, false);
  };

  // ── Scroll to load more ───────────────────────────────────────────────────
  const handleScroll = (e) => {
    const target = e.target;
    const reachedBottom = target.scrollTop + target.offsetHeight >= target.scrollHeight - 10;
    if (reachedBottom && hasMore && !loading) {
      loadEmployees(searchRef.current, page + 1, true);
    }
  };

  // ── Selection handlers ────────────────────────────────────────────────────
  const isSelected = (id) => selected.some((e) => e.id === id);

  const toggleSelect = (employee) => {
    setSelected((prev) =>
      isSelected(employee.id)
        ? prev.filter((e) => e.id !== employee.id)
        : [...prev, employee]
    );
  };

  const removeSelected = (id) => {
    setSelected((prev) => prev.filter((e) => e.id !== id));
  };

  const clearAll = () => setSelected([]);

  // ── Table columns ──────────────────────────────────────────────────────────
  const columns = [
    {
      title:  '',
      key:    'checkbox',
      width:  40,
      render: (_, record) => (
        <input
          type='checkbox'
          checked={isSelected(record.id)}
          onChange={() => toggleSelect(record)}
        />
      ),
    },
    {
      title:  'Employee',
      key:    'name',
      render: (_, record) => (
        <div>
          <Typography.Text strong>{record.full_name}</Typography.Text>
          <div>
            <Typography.Text type='secondary' style={{ fontSize: 11 }}>
              {record.employee_code} · {record.position_name || '-'}
            </Typography.Text>
          </div>
        </div>
      ),
    },
  ];

  return (
    <Row gutter={16}>
      {/* ── Left: search + select table ─────────────────────────────────── */}
      <Col xs={24} md={14}>
        <Input
          placeholder='Search employee by name or code...'
          prefix={<SearchOutlined />}
          value={search}
          onChange={handleSearchChange}
          style={{ marginBottom: 8 }}
          allowClear
        />

        <div
          onScroll={handleScroll}
          style={{
            border:       '1px solid #d9d9d9',
            borderRadius: 8,
            maxHeight:    360,
            overflowY:    'auto',
          }}
        >
          <Table
            rowKey='id'
            columns={columns}
            dataSource={employees}
            pagination={false}
            size='small'
            loading={loading}
            onRow={(record) => ({
              onClick: () => toggleSelect(record),
              style:   { cursor: 'pointer' },
            })}
          />
        </div>

        <Typography.Text type='secondary' style={{ fontSize: 11 }}>
          Scroll down to load more employees.
        </Typography.Text>
      </Col>

      {/* ── Right: selected list ────────────────────────────────────────── */}
      <Col xs={24} md={10}>
        <Row justify='space-between' align='middle' style={{ marginBottom: 8 }}>
          <Col>
            <Typography.Text strong>
              Selected ({selected.length})
            </Typography.Text>
          </Col>
          {selected.length > 0 && (
            <Col>
              <Button
                size='small'
                type='text'
                danger
                icon={<ClearOutlined />}
                onClick={clearAll}
              >
                Clear All
              </Button>
            </Col>
          )}
        </Row>

        <div
          style={{
            border:       '1px solid #d9d9d9',
            borderRadius: 8,
            maxHeight:    360,
            overflowY:    'auto',
            padding:      selected.length === 0 ? 24 : 0,
          }}
        >
          {selected.length === 0 ? (
            <Empty description='No employees selected' />
          ) : (
            <List
              size='small'
              dataSource={selected}
              renderItem={(item) => (
                <List.Item
                  style={{ padding: '8px 12px' }}
                  actions={[
                    <Button
                      type='text'
                      danger
                      size='small'
                      icon={<CloseOutlined />}
                      onClick={() => removeSelected(item.id)}
                    />,
                  ]}
                >
                  <div>
                    <Typography.Text strong style={{ fontSize: 13 }}>
                      {item.full_name}
                    </Typography.Text>
                    <div>
                      <Typography.Text type='secondary' style={{ fontSize: 11 }}>
                        {item.employee_code} · {item.position_name || '-'}
                      </Typography.Text>
                    </div>
                  </div>
                </List.Item>
              )}
            />
          )}
        </div>
      </Col>
    </Row>
  );
};

export default EmployeeBulkSelector;