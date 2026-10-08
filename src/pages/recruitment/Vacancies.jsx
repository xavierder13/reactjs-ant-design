import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Card, Row, Col, Typography, Input, Space, Button, Breadcrumb, Table, Tag, Checkbox, Statistic, App,
} from "antd";
import { ReloadOutlined, SearchOutlined, ExportOutlined } from "@ant-design/icons";

import recruitmentApi from "../../services/recruitment/recruitmentApi";
import handleApiError from "../../utils/handleApiError";
import downloadBlobResponse from "../../utils/downloadBlobResponse";
import useAuth from "../../hooks/useAuth";
import { tablePagination } from '../../utils/tablePagination';

const byText = (key) => (a, b) => String(a[key] ?? "").localeCompare(String(b[key] ?? ""));
const byNumber = (key) => (a, b) => a[key] - b[key];

// Vacancies — vueportal views/recruitment/Vacancies.vue. The backend returns
// every position × branch whose required headcount differs from its current
// active headcount; by default only real vacancies (required > current) are
// shown, and "Show Excess" adds the over-staffed rows (negative vacancy).
// Export sends exactly the rows on screen (search and toggle applied).
//
// vueportal's row "view" icon isn't carried over: it only console.logs a
// get_vacancy_duration_details response, and that endpoint is unfinished
// (hardcoded branch, position name compared to an id).
export default function Vacancies() {
  const { message: messageApi } = App.useApp();
  const { hasRole, hasPermission } = useAuth();
  const [vacancies, setVacancies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [search, setSearch] = useState("");
  const [showExcess, setShowExcess] = useState(false);

  const canExport = hasRole("Administrator") || hasPermission("vacancy-export");

  const fetchVacancies = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await recruitmentApi.getVacancies();
      setVacancies(data.vacancies || []);
    } catch (error) {
      handleApiError(error, messageApi);
    } finally {
      setLoading(false);
    }
  }, [messageApi]);

  useEffect(() => {
    const load = async () => { await fetchVacancies(); };
    load();
  }, [fetchVacancies]);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return vacancies
      .filter((v) => showExcess || v.required > v.current)
      .map((v) => ({ ...v, key: `${v.position_id}-${v.branch_id}`, vacancy: v.required - v.current }))
      .filter((v) => !term || [v.position, v.branch, v.required, v.current, v.vacancy]
        .some((field) => String(field ?? "").toLowerCase().includes(term)));
  }, [vacancies, search, showExcess]);

  const totalOpen = useMemo(() => rows.reduce((sum, r) => sum + Math.max(r.vacancy, 0), 0), [rows]);

  const handleExport = async () => {
    if (!rows.length) {
      messageApi.warning("No record found.");
      return;
    }
    setExporting(true);
    try {
      const response = await recruitmentApi.exportVacancies(rows.map(({ position, branch, required, current, vacancy }) => ({
        position, branch, required, current, vacancy,
      })));
      const filename = showExcess ? "Vacancies (with Excess).xls" : "Vacancies.xls";
      if (await downloadBlobResponse(response, filename, messageApi)) messageApi.success("Export downloaded.");
    } catch (error) {
      handleApiError(error, messageApi);
    } finally {
      setExporting(false);
    }
  };

  const columns = [
    { title: "Position", dataIndex: "position", key: "position", sorter: byText("position") },
    { title: "Branch", dataIndex: "branch", key: "branch", sorter: byText("branch") },
    {
      title: "Required Employees", dataIndex: "required", key: "required", align: "right", sorter: byNumber("required"),
      render: (v) => <Tag color="blue">{v}</Tag>,
    },
    {
      title: "Current Employees", dataIndex: "current", key: "current", align: "right", sorter: byNumber("current"),
      render: (v) => <Tag color="green">{v}</Tag>,
    },
    {
      title: "Vacancy", dataIndex: "vacancy", key: "vacancy", align: "right", sorter: byNumber("vacancy"), defaultSortOrder: "descend",
      render: (v) => <Tag color={v < 0 ? "orange" : "red"}>{v}</Tag>,
    },
  ];

  return (
    <>
      <Breadcrumb
        style={{ margin: "16px 0", marginTop: 0 }}
        items={[{ title: <Link to="/">Home</Link> }, { title: "Vacancies" }]}
      />
      <Card
        title={
          <Row justify="space-between" align="middle" gutter={[8, 8]} wrap>
            <Col flex="none">
              <Typography.Title level={4} style={{ margin: 0 }}>Vacancies</Typography.Title>
            </Col>
            <Col flex="none">
              <Space wrap>
                <Button icon={<ReloadOutlined />} onClick={fetchVacancies} disabled={loading}>Refresh</Button>
                {canExport && <Button icon={<ExportOutlined />} onClick={handleExport} loading={exporting}>Export</Button>}
              </Space>
            </Col>
          </Row>
        }
      >
        <Row justify="space-between" align="middle" gutter={[8, 8]} wrap style={{ marginBottom: 16 }}>
          <Col flex="none">
            <Space wrap>
              <Input
                placeholder="Search..."
                prefix={<SearchOutlined />}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                allowClear
                style={{ width: 260 }}
              />
              <Checkbox checked={showExcess} onChange={(e) => setShowExcess(e.target.checked)}>Show Excess</Checkbox>
            </Space>
          </Col>
          <Col flex="none">
            <Statistic title="Open positions to fill" value={totalOpen} />
          </Col>
        </Row>

        <Table
          rowKey="key"
          size="small"
          columns={columns}
          dataSource={rows}
          loading={loading}
          scroll={{ x: "max-content" }}
          pagination={tablePagination(10)}
        />
      </Card>
    </>
  );
}
