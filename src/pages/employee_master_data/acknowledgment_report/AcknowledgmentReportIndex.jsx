import { useState } from "react";
import { Card, Table, Breadcrumb, Space, Button, Popconfirm, Tooltip, Tag, App } from "antd";
import { EyeOutlined, DownloadOutlined, DeleteOutlined, ReloadOutlined, DownOutlined, UpOutlined } from "@ant-design/icons";
import { Link, useNavigate } from "react-router-dom";
import useAcknowledgmentReports from "../../../hooks/useAcknowledgmentReports";
import useAuth from "../../../hooks/useAuth";
import employeeAcknowledgmentReportApi from "../../../services/employee/employeeAcknowledgmentReportApi";
import handleApiError from "../../../utils/handleApiError";

// Backend's index() returns branches, each with a nested
// acknowledgment_reports array (branch-scoped visibility enforced
// server-side via employee-acknowledgment-reports-all). Grouped-by-branch,
// expandable layout matches vueportal's DataTableGroup.vue (group-by
// "name" + a group.header toggle, with the actual report rows rendered
// inside each expanded group) rather than this page's previous flattened
// single table.
export default function AcknowledgmentReportIndex() {
  const { message: messageApi } = App.useApp();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const { branches, isLoading, fetchBranches, deleteReport } = useAcknowledgmentReports();

  // Controlled expandedRowKeys (rather than letting the Table manage its
  // own) so the "Expand All" toggle beside the Branch header can drive it.
  const [expandedRowKeys, setExpandedRowKeys] = useState([]);
  const expandableBranchIds = branches
    .filter((branch) => (branch.acknowledgment_reports || []).length > 0)
    .map((branch) => branch.id);
  const allExpanded = expandableBranchIds.length > 0
    && expandableBranchIds.every((id) => expandedRowKeys.includes(id));
  const toggleExpandAll = () => setExpandedRowKeys(allExpanded ? [] : expandableBranchIds);

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

  const expandedRowRender = (branch) => (
    <Table
      rowKey="id"
      size="small"
      pagination={false}
      dataSource={branch.acknowledgment_reports || []}
      columns={[
        // The submitting user's display field isn't confirmed against the
        // User model from the frontend alone — falls back across a couple
        // of likely shapes rather than assuming one.
        { title: 'Submitted By', render: (_, r) => r.user?.name || r.user?.full_name || r.user?.email || '-' },
        { title: 'Acknowledgment Date', dataIndex: 'date_uploaded' },
        { title: 'Document Date', dataIndex: 'docdate' },
        {
          title: 'Actions',
          width: 120,
          render: (_, r) => (
            <Space>
              <Tooltip title="View">
                <Button color="blue" variant="outlined" size="small" icon={<EyeOutlined />} onClick={() => navigate(`/acknowledgment-reports/${r.id}`, { state: { report: r } })} />
              </Tooltip>
              {hasPermission('employee-acknowledgment-reports-export') && (
                <Tooltip title="Export">
                  <Button color="purple" variant="outlined" size="small" icon={<DownloadOutlined />} onClick={() => handleExport(r)} />
                </Tooltip>
              )}
              {hasPermission('employee-acknowledgment-reports-delete') && (
                <Popconfirm title="Delete this report?" onConfirm={() => handleDelete(r)}>
                  <Tooltip title="Delete">
                    <Button size="small" danger icon={<DeleteOutlined />} />
                  </Tooltip>
                </Popconfirm>
              )}
            </Space>
          ),
        },
      ]}
    />
  );

  return (
    <>
      <Breadcrumb
        style={{ margin: "16px 0", marginTop: 0 }}
        items={[
          { title: <Link to="/">Home</Link> },
          { title: <Link to="/employees">Employee</Link> },
          { title: "Branch Reports" },
        ]}
      />
      <Card
        title="Branch Reports"
        extra={<Button icon={<ReloadOutlined />} onClick={fetchBranches}>Refresh</Button>}
      >
        <Table
          rowKey="id"
          size="small"
          loading={isLoading}
          dataSource={branches}
          pagination={{ pageSize: 10, showSizeChanger: true }}
          expandable={{
            expandedRowRender,
            rowExpandable: (branch) => (branch.acknowledgment_reports || []).length > 0,
            expandedRowKeys,
            onExpandedRowsChange: (keys) => setExpandedRowKeys(keys),
            // Matches DataTableGroup.vue's group.header toggle
            // (mdi-chevron-up / mdi-chevron-down) instead of AntD's default
            // plus/minus expand icon.
            expandIcon: ({ expanded, onExpand, record }) =>
              (record.acknowledgment_reports || []).length > 0 ? (
                <Button
                  type="text"
                  size="small"
                  icon={expanded ? <UpOutlined /> : <DownOutlined />}
                  onClick={(e) => onExpand(record, e)}
                />
              ) : null,
          }}
          columns={[
            {
              title: (
                <Space>
                  Branch
                  <Button type="link" size="small" onClick={toggleExpandAll} disabled={expandableBranchIds.length === 0}>
                    {allExpanded ? 'Collapse All' : 'Expand All'}
                  </Button>
                </Space>
              ),
              dataIndex: 'name',
            },
            {
              title: 'Reports',
              width: 100,
              render: (_, branch) => <Tag>{(branch.acknowledgment_reports || []).length}</Tag>,
            },
          ]}
        />
      </Card>
    </>
  );
}
