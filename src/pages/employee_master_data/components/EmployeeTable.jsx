import { Table, Space, Button, Popconfirm, Tooltip } from "antd";
import { EyeOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import useAuth from "../../../hooks/useAuth";

export default function EmployeeTable({
  employees,
  columns,
  loading,
  pagination,
  pageSizeOptions,
  selectedRowKeys,
  setSelectedRowKeys,
  onDelete,
  onView,
  editData,
  onChangePagination,
  onSortChange,
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
      // Records-per-page picker always shown (AntD hides it under 50
      // rows by default) — defaults a caller's `pagination` can override,
      // as EmployeeSegmentList does. A new page size starts from page 1.
      pagination={{
        showSizeChanger: true,
        pageSizeOptions,
        showTotal: (total, [from, to]) => `${from}-${to} of ${total} records`,
        ...pagination,
        onChange: (page, pageSize) => onChangePagination(pageSize === pagination.pageSize ? page : 1, pageSize),
      }}
      // Sorting is server-side (columns use `sorter: true` + a controlled
      // sortOrder); a sort click fires only this, not pagination.onChange.
      onChange={(_pagination, _filters, sorter, { action }) => {
        if (action === 'sort') onSortChange?.(sorter);
      }}
      size="small"
    />
  );
}
