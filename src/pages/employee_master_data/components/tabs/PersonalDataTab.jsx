"use client";

import { Tabs } from "antd";
import PersonalInformation from "./personal/PersonalInformation";
import FilesRequirements from "./personal/FilesRequirements";

export default function PersonalDataTab() {

  const items = [
    {
      key: "info",
      label: "Personal Information",
      children: <PersonalInformation/>
    },
    {
      key: "files",
      label: "Files & Requirements",
      children: <FilesRequirements/>
    }
  ];
  
  return <Tabs defaultActiveKey="info" items={items}/>
}