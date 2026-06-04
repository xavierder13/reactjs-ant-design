"use client";

import { Tabs } from "antd";

export default function DisciplinaryTab() {
  
  const items = [
    {
      key: "nte",
      label: "Issued NTE",
      children: "Issude NTE"
    },
    {
      key: "disciplinary",
      label: "Discriplinary Actions",
      children: "Disciplinary Actions"
    }
  ];

  return <Tabs defaultActiveKey="nte" items={items}/>
}