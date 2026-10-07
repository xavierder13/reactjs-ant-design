import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, Row, Col, Typography, Input, Space, Button, Breadcrumb, Table, Alert, App } from "antd";
import { ReloadOutlined, SearchOutlined, CloudSyncOutlined } from "@ant-design/icons";

import employeeApi from "../../../services/employee/employeeApi";
import handleApiError from "../../../utils/handleApiError";
import useAuth from "../../../hooks/useAuth";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100, 500];
const SEARCH_FIELDS = ["name", "employment_position", "branch_name", "branch_complied", "employment_branch", "email", "contact_no"];

// Portal dates arrive as MM/DD/YYYY strings — sort them as dates.
const dateKey = (v) => (v ? v.replace(/^(\d{2})\/(\d{2})\/(\d{4})$/, "$3$1$2") : "");

const columns = [
  { title: "Full Name", dataIndex: "name", key: "name", sorter: (a, b) => (a.name || "").localeCompare(b.name || "") },
  { title: "Position", dataIndex: "employment_position", key: "employment_position", render: (v) => v || "-" },
  { title: "Branch Applied", dataIndex: "branch_name", key: "branch_name", render: (v) => v || "-" },
  { title: "Branch Complied", dataIndex: "branch_complied", key: "branch_complied", render: (v) => v || "-" },
  { title: "Employment Branch", dataIndex: "employment_branch", key: "employment_branch", render: (v) => v || "-" },
  { title: "Orientation Date", dataIndex: "orientation_date", key: "orientation_date", render: (v) => v || "-", sorter: (a, b) => dateKey(a.orientation_date).localeCompare(dateKey(b.orientation_date)) },
  {
    title: "Signed Contract Date", dataIndex: "signing_of_contract_date", key: "signing_of_contract_date", render: (v) => v || "-",
    sorter: (a, b) => dateKey(a.signing_of_contract_date).localeCompare(dateKey(b.signing_of_contract_date)), defaultSortOrder: "descend",
  },
];

// New Hired — port of vueportal EmployeeNewHired.vue: applicants hired in the
// careers portal and not yet in Employee Master Data. Select rows and Sync
// to create them (Probationary). Synced rows leave this list.
export default function NewHiredList() {
  const { message: messageApi, modal } = App.useApp();
  const { hasRole, hasPermission } = useAuth();
  const canSync = hasRole("Administrator") || hasPermission("employee-master-data-sync-new-hired");

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [pageSize, setPageSize] = useState(20);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await employeeApi.getNewHired();
      setRows(Array.isArray(data.employees) ? data.employees : []);
      setSelectedKeys([]);
    } catch (error) {
      handleApiError(error, messageApi);
    } finally {
      setLoading(false);
    }
  }, [messageApi]);

  useEffect(() => {
    const refresh = async () => { await load(); };
    refresh();
  }, [load]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) => SEARCH_FIELDS.some((f) => String(r[f] ?? "").toLowerCase().includes(term)));
  }, [rows, search]);

  const sync = () => {
    const selected = rows.filter((r) => selectedKeys.includes(r.id));
    modal.confirm({
      title: `Sync ${selected.length} hired applicant${selected.length === 1 ? "" : "s"}?`,
      content: "Each will be added to Employee Master Data as a Probationary employee (skipped if an employee with the same name, birthdate and gender already exists) and removed from this list. Run Generate Referral Codes afterwards to give them referral codes.",
      okText: "Sync",
      onOk: async () => {
        setSyncing(true);
        try {
          await employeeApi.syncNewHired(selected);
          messageApi.success(`${selected.length} hired applicant${selected.length === 1 ? "" : "s"} synced.`);
          await load();
        } catch (error) {
          handleApiError(error, messageApi);
        } finally {
          setSyncing(false);
        }
      },
    });
  };

  return (
    <>
      <Breadcrumb
        style={{ margin: "16px 0", marginTop: 0 }}
        items={[
          { title: <Link to="/">Home</Link> },
          { title: "Employee" },
          { title: "New Hired" },
        ]}
      />
      <Card
        title={
          <Row justify="space-between" align="middle" gutter={[8, 8]} wrap>
            <Col flex="none">
              <Typography.Title level={4} style={{ margin: 0 }}>New Hired</Typography.Title>
            </Col>
            <Col flex="none">
              <Space wrap>
                {canSync && (
                  <Button type="primary" icon={<CloudSyncOutlined />} onClick={sync} disabled={!selectedKeys.length || loading} loading={syncing}>
                    Sync{selectedKeys.length ? ` (${selectedKeys.length})` : ""}
                  </Button>
                )}
                <Button icon={<ReloadOutlined />} onClick={load} disabled={loading || syncing}>Refresh</Button>
              </Space>
            </Col>
          </Row>
        }
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          title="Applicants who passed orientation and signed their contract in the careers portal, not yet in Employee Master Data."
        />
        <Space wrap style={{ marginBottom: 16 }}>
          <Input
            placeholder="Search name, position, branch..."
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
            style={{ width: 280 }}
          />
          <Typography.Text type="secondary">
            {filtered.length.toLocaleString()} hired applicant{filtered.length === 1 ? "" : "s"}
            {selectedKeys.length ? ` · ${selectedKeys.length} selected` : ""}
          </Typography.Text>
        </Space>
        <Table
          rowKey="id"
          size="small"
          columns={columns}
          dataSource={filtered}
          loading={loading}
          rowSelection={canSync ? { selectedRowKeys: selectedKeys, onChange: setSelectedKeys, preserveSelectedRowKeys: true } : undefined}
          scroll={{ x: "max-content" }}
          pagination={{ pageSize, pageSizeOptions: PAGE_SIZE_OPTIONS, showSizeChanger: true, onShowSizeChange: (_, size) => setPageSize(size), showTotal: (total) => `${total.toLocaleString()} total` }}
        />
      </Card>
    </>
  );
}
