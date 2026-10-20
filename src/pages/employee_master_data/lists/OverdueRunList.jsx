import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Card, Table, Button, Space, Input, Tooltip, Popconfirm, Typography, Alert, App } from "antd";
import { ReloadOutlined, SearchOutlined } from "@ant-design/icons";

import handleApiError from "../../../utils/handleApiError";

// Shared by the Overdue Deactivation / Overdue Regularization pages: the
// employees a nightly job (Deactivate Resigned / Regularize Passed) would
// update but hasn't — e.g. the scheduler didn't run — with a per-row run,
// run for the selected rows, and run for everyone listed. Each run is the
// job's own update, limited to those employees.
//
// Props: fetchRows() → axios ({ employees }), runFor(ids) → axios
// ({ message, processed }), columns (name / code columns are added here),
// action: { label, icon, buttonProps } for the row button, `about` (text
// above the table), filterRows(rows) (optional, e.g. past-due only),
// toolbarExtra (optional, left of the search).
export default function OverdueRunList({ fetchRows, runFor, columns, action, about, filterRows, toolbarExtra }) {
  const { message } = App.useApp();
  // the record's Back to List returns here (with the page's view, e.g. ?past_due=1)
  const { pathname, search: query } = useLocation();
  const returnTo = pathname + query;
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(null); // 'all' | 'selected' | row id
  const [selected, setSelected] = useState([]);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await fetchRows();
      setRows(data.employees || []);
      setSelected([]);
    } catch (error) {
      handleApiError(error, message);
    } finally {
      setLoading(false);
    }
  }, [fetchRows, message]);

  useEffect(() => {
    const run = async () => { await load(); };
    run();
  }, [load]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (filterRows ? filterRows(rows) : rows).filter((r) => !term
      || [r.name, r.employee_code, r.branch, r.position].some((v) => String(v || "").toLowerCase().includes(term)));
  }, [rows, search, filterRows]);

  const run = async (ids, key) => {
    setRunning(key);
    try {
      const { data } = await runFor(ids);
      message.success(`${data.processed ?? ids.length} employee(s) updated.`);
      await load();
    } catch (error) {
      handleApiError(error, message);
    } finally {
      setRunning(null);
    }
  };

  const allColumns = [
    { title: "Employee Code", dataIndex: "employee_code", key: "employee_code", width: 130 },
    { title: "Employee Name", dataIndex: "name", key: "name", render: (v, r) => <Link to={`/employees/${r.id}`} state={{ returnTo }}>{v}</Link> },
    { title: "Branch", dataIndex: "branch", key: "branch", render: (v) => v || "-" },
    { title: "Position", dataIndex: "position", key: "position", render: (v) => v || "-" },
    ...columns,
    {
      title: "Actions",
      key: "actions",
      width: 80,
      render: (_, r) => (
        <Space>
          <Popconfirm title={`${action.label} ${r.name}?`} okText={action.label} onConfirm={() => run([r.id], r.id)}>
            <Tooltip title={action.label}>
              <Button size="small" icon={action.icon} loading={running === r.id} disabled={running !== null && running !== r.id} {...action.buttonProps} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const visibleIds = visible.map((r) => r.id);

  return (
    <Card size="small">
      {about && <Alert type="info" showIcon title={about} style={{ marginBottom: 16 }} />}
      <Space wrap style={{ marginBottom: 16, width: "100%", justifyContent: "space-between" }}>
        <Space wrap>
          {toolbarExtra}
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Search name, code, branch, position"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 280 }}
          />
          <Typography.Text type="secondary">{visible.length} employee(s)</Typography.Text>
        </Space>
        <Space wrap>
          <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>Refresh</Button>
          <Popconfirm
            title={`${action.label} ${selected.length} selected employee(s)?`}
            okText={action.label}
            disabled={!selected.length}
            onConfirm={() => run(selected, "selected")}
          >
            <Button disabled={!selected.length || (running !== null && running !== "selected")} loading={running === "selected"}>
              {action.label} Selected ({selected.length})
            </Button>
          </Popconfirm>
          <Popconfirm
            title={`${action.label} all ${visible.length} employee(s) listed?`}
            okText={action.label}
            disabled={!visible.length}
            onConfirm={() => run(visibleIds, "all")}
          >
            <Button type="primary" disabled={!visible.length || (running !== null && running !== "all")} loading={running === "all"}>
              {action.label} All
            </Button>
          </Popconfirm>
        </Space>
      </Space>
      <Table
        rowKey="id"
        size="small"
        loading={loading}
        columns={allColumns}
        dataSource={visible}
        rowSelection={{ selectedRowKeys: selected, onChange: setSelected }}
        pagination={{ pageSize: 10, showSizeChanger: true }}
        scroll={{ x: "max-content" }}
      />
    </Card>
  );
}
