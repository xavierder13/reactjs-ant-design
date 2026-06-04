"use client";

import { Tabs } from "antd";

export default function PerformanceManagementTab() {

  const items = [
    {
      key: "eval",
      label: "Evaluation & Regularization",
      children: "Evaluation",
    },
    {
      key: "kpi",
      label: "KPI Content",
      children: "KPI"
    },
    {
      key: "classroom",
      label: "Classroom Performance Rating",
      children: "Classroom Rating"
    },
    {
      key: "ojt",
      label: "OJT Performance Rating",
      children: "OJT Rating"
    },
    {
      key: "branch_position",
      label: "Branch Assignment & Positions",
      children: "Branch Position"
    },
    {
      key: "merit",
      label: "Merit History",
      children: "Merit History"
    },
    {
      key: "training",
      label: "Training",
      children: "Training"
    }

  ];

  return <Tabs defaultActiveKey="eval" items={items}/>;
}