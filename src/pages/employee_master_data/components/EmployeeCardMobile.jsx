"use client";

import { Card, Space, Button, Divider, Checkbox, Tooltip, Popconfirm, Typography } from "antd";
import { EyeOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import useAuth from "../../../hooks/useAuth";

export default function EmployeeCardMobile({
  employees,
  selectedHeaders,
  selectedRowKeys,
  setSelectedRowKeys,
  onDelete,
  onView,
  editData
}) {

  const { hasPermission } = useAuth();

  return (
    <>
      {employees.map((emp) => (
        <Card key={emp.id} size="small" style={{ marginBottom: 12 }}>
          <Checkbox
            checked={selectedRowKeys.includes(emp.id)}
            onChange={(e) => {
              if (e.target.checked) {
                setSelectedRowKeys([...selectedRowKeys, emp.id]);
              } else {
                setSelectedRowKeys(selectedRowKeys.filter((k) => k !== emp.id));
              }
            }}
            style={{ marginBottom: 10 }}
          >
            Select
          </Checkbox>

          {selectedHeaders.map((col) => (
            <div key={col.value} style={{ marginBottom: 8 }}>
              <Typography.Text strong>{col.title}</Typography.Text>
              <div>{col.render ? col.render(emp[col.dataIndex]) : emp[col.dataIndex]}</div>
            </div>
          ))}

          <Divider />
          <Space>
            <Tooltip title="View">
              <Button icon={<EyeOutlined />} onClick={() => onView(emp)} />
            </Tooltip>

            {hasPermission('employee-master-data-edit') &&
              <Tooltip title="Edit">
                <Button color="green" variant="outlined" icon={<EditOutlined />} onClick={() => editData(emp)} />
              </Tooltip>
            }

            {hasPermission('employee-master-data-delete') &&
              <Popconfirm title="Delete this employee?" onConfirm={() => onDelete(emp.id)}>
                <Tooltip title="Delete">
                  <Button danger icon={<DeleteOutlined />} />
                </Tooltip>
              </Popconfirm>
            }
          </Space>
        </Card>
      ))}
    </>
  );
}
