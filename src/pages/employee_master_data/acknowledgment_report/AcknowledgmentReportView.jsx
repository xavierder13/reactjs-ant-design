import { useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, Descriptions, Table, Breadcrumb, Button, Spin, Tag, App } from "antd";
import useAcknowledgmentReportStore from "../../../store/acknowledgmentReportStore";
import employeeAcknowledgmentReportApi from "../../../services/employee/employeeAcknowledgmentReportApi";
import handleApiError from "../../../utils/handleApiError";

// Unlike the Employee Master Data core record, this feature's backend DOES
// have a real single-record fetch (`view()`, POST { acknowledgment_id }) —
// so, unlike EditEmployee.jsx/ViewEmployee.jsx, this page fetches by the
// :id route param directly rather than depending on router state, and
// works fine on a direct link or refresh.
export default function AcknowledgmentReportView() {
  const { id } = useParams();
  const { message: messageApi } = App.useApp();
  const current = useAcknowledgmentReportStore((s) => s.current);
  const isLoadingCurrent = useAcknowledgmentReportStore((s) => s.isLoadingCurrent);
  const fetchById = useAcknowledgmentReportStore((s) => s.fetchById);

  useEffect(() => { fetchById(id); }, [id]);

  const handleExport = async () => {
    try {
      const response = await employeeAcknowledgmentReportApi.export(id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'Employee_Branch_Report.xlsx';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      handleApiError(error, messageApi);
    }
  };

  if (isLoadingCurrent || !current) {
    return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />;
  }

  return (
    <>
      <Breadcrumb
        style={{ margin: "16px 0", marginTop: 0 }}
        items={[
          { title: <Link to="/">Home</Link> },
          { title: <Link to="/acknowledgment-reports">Acknowledgment Reports</Link> },
          { title: "View" },
        ]}
      />
      <Card
        title="Acknowledgment Report"
        extra={<Button onClick={handleExport}>Export</Button>}
      >
        <Descriptions
          bordered
          size="small"
          column={2}
          style={{ marginBottom: 16 }}
          items={[
            { key: 'branch', label: 'Branch', children: current.branch?.name || '-' },
            { key: 'docdate', label: 'Date', children: current.docdate },
            { key: 'submitted_by', label: 'Submitted By', children: current.user?.name || current.user?.full_name || current.user?.email || '-' },
          ]}
        />

        <Table
          rowKey="id"
          size="small"
          pagination={false}
          dataSource={current.employees || []}
          columns={[
            { title: 'Emp. Code', render: (_, r) => r.employee?.employee_code },
            { title: 'Name', render: (_, r) => `${r.employee?.last_name}, ${r.employee?.first_name}` },
            { title: 'Position', render: (_, r) => r.employee?.position?.name || '-' },
            { title: 'Branch', render: (_, r) => r.employee?.branch?.name || '-' },
            { title: 'Department', render: (_, r) => r.employee?.department?.name || '-' },
            {
              title: 'Status (at time of report)',
              render: (_, r) => (
                <Tag color={r.is_active ? 'green' : 'default'}>{r.is_active ? 'Active' : 'Inactive'}</Tag>
              ),
            },
          ]}
        />
      </Card>
    </>
  );
}
