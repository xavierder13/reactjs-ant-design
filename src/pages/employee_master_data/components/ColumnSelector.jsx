"use client";

import { Select, message, Space, Typography } from "antd";

interface ColumnSelectorProps {
  headers: any[];
  selectedHeaders: any[];
  onChange: (selected: any[]) => void;
}

export default function ColumnSelector({ headers, selectedHeaders, onChange }: ColumnSelectorProps) {
  return (
    <div>
      {/* COLUMN SELECT */}
      <Space style={{ marginBottom: 0 }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <Typography.Text strong>Column Selector</Typography.Text>

          <Select
            mode="multiple"
            style={{ minWidth: 250 }}
            value={selectedHeaders.map((h) => h.value)}
            options={headers.map((h) => ({
              label: h.title,
              value: h.value
            }))}
            onChange={(values: string[]) => {

              if (values.length > 8) {
                message.warning("You can select up to 8 columns only.");
                return;
              }

              const newSelected = headers.filter((h) =>
                values.includes(h.value)
              );

              onChange(newSelected);
            }}
          />
        </div>
      </Space>
    </div>
  );
}