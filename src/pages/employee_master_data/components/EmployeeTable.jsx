import { Table, Space, Button, Popconfirm, Tooltip } from "antd";
import { EyeOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import useAuth from "../../../hooks/useAuth";

export default function EmployeeTable({
  employees,
  columns,
  loading,
  pagination,
  selectedRowKeys,
  setSelectedRowKeys,
  onDelete,
  onView,
  editData,
  onChangePagination
}) {

  const { hasPermission } = useAuth();

  const enhancedColumns = [
    ...columns,
    {
      title: "Actions",
      render: (_, record) => (
        <Space>
          <Tooltip title="View">
            <Button color="blue" variant="outlined" icon={<EyeOutlined />} size="small" onClick={() => onView(record)} />
          </Tooltip>

          {hasPermission('employee-master-data-edit') &&
            <Tooltip title="Edit">
              <Button color="green" variant="outlined" icon={<EditOutlined />} size="small" onClick={() => editData(record)} />
            </Tooltip>
          }

          {hasPermission('employee-master-data-delete') &&
            <Popconfirm title="Delete employee?" onConfirm={() => onDelete(record.id)}>
              <Tooltip title="Delete">
                <Button danger icon={<DeleteOutlined />} size="small" />
              </Tooltip>
            </Popconfirm>
          }
        </Space>
      )
    }
  ];

  return (
    <Table
      rowKey="id"
      columns={enhancedColumns}
      dataSource={employees}
      loading={loading}
      scroll={{ x: "max-content" }}
      rowSelection={{
        selectedRowKeys,
        onChange: (keys) => setSelectedRowKeys(keys)
      }}
      pagination={{
        ...pagination,
        onChange: (page, pageSize) => onChangePagination(page, pageSize),
      }}
      size="small"
    />
  );
}
