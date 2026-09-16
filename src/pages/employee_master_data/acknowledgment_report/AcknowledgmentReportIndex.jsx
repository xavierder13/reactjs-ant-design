import { Card, Table, Breadcrumb, Space, Button, Popconfirm, Tooltip, App } from "antd";
import { EyeOutlined, DownloadOutlined, DeleteOutlined, ReloadOutlined } from "@ant-design/icons";
import { Link, useNavigate } from "react-router-dom";
import useAcknowledgmentReports from "../../../hooks/useAcknowledgmentReports";
import useAuth from "../../../hooks/useAuth";
import employeeAcknowledgmentReportApi from "../../../services/employee/employeeAcknowledgmentReportApi";
import handleApiError from "../../../utils/handleApiError";

// Backend's index() returns branches with a nested acknowledgment_reports
// array (branch-scoped visibility is enforced server-side via
// employee-acknowledgment-reports-all) — flattened here into one table
// with a Branch column, since this repo's table convention is a flat list
// rather than Vue's grouped-by-branch DataTableGroup layout.
export default function AcknowledgmentReportIndex() {
  const { message: messageApi } = App.useApp();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const { branches, isLoading, fetchBranches, deleteReport } = useAcknowledgmentReports();

  const rows = branches.flatMap((branch) =>
    (branch.acknowledgment_reports || []).map((report) => ({ ...report, branch }))
  );

  const handleExport = async (report) => {
    try {
      const response = await employeeAcknowledgmentReportApi.export(report.id);
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

  const handleDelete = async (report) => {
    try {
      await deleteReport(report.id);
      messageApi.success('Report deleted.');
    } catch (error) {
      handleApiError(error, messageApi);
    }
  };

  return (
    <>
      <Breadcrumb
        style={{ margin: "16px 0", marginTop: 0 }}
        items={[
          { title: <Link to="/">Home</Link> },
          { title: <Link to="/employees">Employee</Link> },
          { title: "Acknowledgment Reports" },
        ]}
      />
      <Card
        title="Employee Acknowledgment Reports"
        extra={<Button icon={<ReloadOutlined />} onClick={fetchBranches}>Refresh</Button>}
      >
        <Table
          rowKey="id"
          loading={isLoading}
          dataSource={rows}
          pagination={{ pageSize: 10, showSizeChanger: true }}
          columns={[
            { title: 'Branch', render: (_, r) => r.branch?.name || '-' },
            { title: 'Date', dataIndex: 'docdate' },
            // The submitting user's display field isn't confirmed against
            // the User model from the frontend alone — falls back across a
            // couple of likely shapes rather than assuming one.
            { title: 'Submitted By', render: (_, r) => r.user?.name || r.user?.full_name || r.user?.email || '-' },
            { title: 'Submitted On', dataIndex: 'date_uploaded' },
            {
              title: 'Actions',
              render: (_, r) => (
                <Space>
                  <Tooltip title="View">
                    <Button icon={<EyeOutlined />} onClick={() => navigate(`/acknowledgment-reports/${r.id}`, { state: { report: r } })} />
                  </Tooltip>
                  {hasPermission('employee-acknowledgment-reports-export') && (
                    <Tooltip title="Export">
                      <Button icon={<DownloadOutlined />} onClick={() => handleExport(r)} />
                    </Tooltip>
                  )}
                  {hasPermission('employee-acknowledgment-reports-delete') && (
                    <Popconfirm title="Delete this report?" onConfirm={() => handleDelete(r)}>
                      <Tooltip title="Delete">
                        <Button danger icon={<DeleteOutlined />} />
                      </Tooltip>
                    </Popconfirm>
                  )}
                </Space>
              ),
            },
          ]}
        />
      </Card>
    </>
  );
}
