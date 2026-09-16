"use client";

import { Select, Space, Typography, App } from "antd";

export default function ColumnSelector({ headers, selectedHeaders, onChange }) {
  // App.useApp(), not the static `message` import — the static function
  // API can't consume the ConfigProvider/dynamic-theme context this app
  // wraps itself in (src/App.jsx's <AntApp>), which AntD surfaces as a
  // console warning ("Static function can not consume context..."). Match
  // this pattern anywhere else in this module a message/notification is
  // needed. Real bug found and fixed 2026-09-15.
  const { message: messageApi } = App.useApp();

  return (
    <div>
      {/* COLUMN SELECT */}
      <Space style={{ marginBottom: 0 }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <Typography.Text strong>Columns</Typography.Text>

          <Select
            mode="multiple"
            style={{ minWidth: 250 }}
            maxTagCount="responsive"
            placeholder="Select columns to display"
            value={selectedHeaders.map((h) => h.value)}
            options={headers.map((h) => ({
              label: h.title,
              value: h.value
            }))}
            onChange={(values) => {

              if (values.length > 8) {
                messageApi.warning("You can select up to 8 columns only.");
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
