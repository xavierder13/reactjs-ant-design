import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Card, Row, Col, Typography, Input, Space, Button, Breadcrumb, Table, Tag, Tooltip, Popconfirm, Select, App,
} from "antd";
import { ReloadOutlined, SearchOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";

import handleApiError from "../../../utils/handleApiError";
import { formatDate } from "../../../utils/formatDate";
import useListAccess from "./useListAccess";
import { tablePagination } from '../../../utils/tablePagination';

// Columns every open-case row carries (the backend queue joins the employee
// and branch onto each record); the page's own `columns` go between these
// and Status.
const LEADING_COLUMNS = [
  { title: "Employee Code", dataIndex: "employee_code" },
  { title: "Employee Name", dataIndex: "employee_name" },
  { title: "Branch", dataIndex: "branch" },
  { title: "Date Created", dataIndex: "create_date", render: (v) => formatDate(v) },
];
// vueportal shows anything not explicitly closed as Open — the queue only
// returns null/'Open' statuses anyway.
const STATUS_COLUMN = { title: "Status", dataIndex: "status", render: () => <Tag color="blue">Open</Tag> };

// A global open-cases queue — the React counterpart of vueportal's
// EmployeeNTEList.vue / EmployeeDisciplinaryList.vue. The backend returns
// every open record in the caller's scope at once (branch/subordinate
// scoping is server-side), so search, the branch filter and paging are
// client-side. A record closed from the edit modal drops off on reload.
//
// `load()` resolves to the rows; `remove(record)` deletes one; `EditModal`
// gets { record, onClose, onSaved }.
export default function OpenCaseList({
  title, load, columns: caseColumns, editPermission, deletePermission, remove, EditModal,
}) {
  const columns = useMemo(() => [...LEADING_COLUMNS, ...caseColumns, STATUS_COLUMN], [caseColumns]);
  const { message: messageApi } = App.useApp();
  const { can } = useListAccess();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [branch, setBranch] = useState();
  const [editing, setEditing] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const canEdit = can(editPermission);
  const canDelete = can(deletePermission);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await load());
    } catch (error) {
      handleApiError(error, messageApi);
    } finally {
      setLoading(false);
    }
  }, [load, messageApi]);

  useEffect(() => {
    const run = async () => { await fetchRows(); };
    run();
  }, [fetchRows]);

  const branchOptions = useMemo(
    () => [...new Set(rows.map((r) => r.branch).filter(Boolean))].sort().map((b) => ({ label: b, value: b })),
    [rows],
  );

  const visibleRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((r) => (!branch || r.branch === branch)
      && (!term || columns.some((c) => c !== STATUS_COLUMN && String(r[c.dataIndex] ?? "").toLowerCase().includes(term))));
  }, [rows, search, branch, columns]);

  const handleDelete = async (record) => {
    setDeletingId(record.id);
    try {
      await remove(record);
      messageApi.success("Record deleted.");
      await fetchRows();
    } catch (error) {
      handleApiError(error, messageApi);
    } finally {
      setDeletingId(null);
    }
  };

  const tableColumns = [
    { title: "#", key: "row_no", width: 50, render: (_, __, index) => index + 1 },
    ...columns.map((c) => ({ ...c, key: c.dataIndex })),
    ...(canEdit || canDelete ? [{
      title: "Actions",
      key: "actions",
      fixed: "right",
      width: 90,
      render: (_, record) => (
        <Space>
          {canEdit && (
            <Tooltip title="Edit">
              <Button color="green" variant="outlined" icon={<EditOutlined />} size="small" onClick={() => setEditing(record)} />
            </Tooltip>
          )}
          {canDelete && (
            <Popconfirm
              title="Delete this record?"
              description="This cannot be undone."
              onConfirm={() => handleDelete(record)}
              okButtonProps={{ danger: true, loading: deletingId === record.id }}
              okText="Delete"
            >
              <Tooltip title="Delete">
                <Button danger icon={<DeleteOutlined />} size="small" />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    }] : []),
  ];

  return (
    <>
      <Breadcrumb
        style={{ margin: "16px 0", marginTop: 0 }}
        items={[
          { title: <Link to="/">Home</Link> },
          { title: <Link to="/employees">Employee Master Data</Link> },
          { title },
        ]}
      />
      <Card
        title={
          <Row justify="space-between" align="middle" gutter={[8, 8]} wrap>
            <Col flex="none">
              <Space>
                <Typography.Title level={4} style={{ margin: 0 }}>{title}</Typography.Title>
                <Tag color="blue">Open</Tag>
              </Space>
            </Col>
            <Col flex="none">
              <Button icon={<ReloadOutlined />} onClick={fetchRows} disabled={loading}>Refresh</Button>
            </Col>
          </Row>
        }
      >
        <Space wrap style={{ marginBottom: 16 }}>
          <Input
            placeholder="Search..."
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
            style={{ width: 260 }}
          />
          <Select
            value={branch}
            onChange={setBranch}
            placeholder="All Branches"
            allowClear
            showSearch
            options={branchOptions}
            style={{ width: 200 }}
          />
        </Space>

        <Table
          rowKey="id"
          size="small"
          columns={tableColumns}
          dataSource={visibleRows}
          loading={loading}
          scroll={{ x: "max-content" }}
          pagination={tablePagination(10)}
        />
      </Card>

      <EditModal
        record={editing}
        onClose={() => setEditing(null)}
        onSaved={() => { setEditing(null); fetchRows(); }}
      />
    </>
  );
}
