"use client";

import { Tabs } from "antd";
import PersonalInformation from "./personal/PersonalInformation";
import FilesRequirements from "./personal/FilesRequirements";

export default function PersonalDataTab({ employeeId, initialFiles, mode }) {

  const items = [
    {
      key: "info",
      label: "Personal Information",
      children: <PersonalInformation />
    },
    {
      key: "files",
      label: "Files & Requirements",
      children: <FilesRequirements employeeId={employeeId} initialFiles={initialFiles} mode={mode} />
    }
  ];

  return <Tabs defaultActiveKey="info" items={items} />;
}
