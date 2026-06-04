"use client";

import { Card, Space, Button, Divider, Checkbox, Tooltip, Popconfirm, Typography } from "antd";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { useAuth } from "@/context/AuthContext";

interface EmployeeCardMobileProps {
  employees: any[];
  selectedHeaders: any[];
  selectedRowKeys: number[];
  setSelectedRowKeys: (keys: number[]) => void;
  onDelete: (id: number) => void;
}

export default function EmployeeCardMobile({
  employees,
  selectedHeaders,
  selectedRowKeys,
  setSelectedRowKeys,
  onDelete
}: EmployeeCardMobileProps) {

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
            {//if has permission
              hasPermission('employee-master-data-edit') &&
              <Tooltip title="Edit">
                <Button color="green" variant="outlined" icon={<EditOutlined />} />
              </Tooltip>
            }
            
            {//if has permission
              hasPermission('employee-master-data-delete') &&
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