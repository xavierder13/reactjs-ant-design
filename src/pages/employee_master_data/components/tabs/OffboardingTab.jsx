"use client";

import { Table } from "antd";

export default function OffboardingTab() {

  const columns = [
    { title: "Date", dataIndex: "date" },
    { title: "Time In", dataIndex: "time_in" },
    { title: "Time Out", dataIndex: "time_out" }
  ];

  return <Table columns={columns} dataSource={[]} />;
}