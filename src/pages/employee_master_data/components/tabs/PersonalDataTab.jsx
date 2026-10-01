"use client";

import { useEffect, useState } from "react";
import { IdcardOutlined, PaperClipOutlined } from "@ant-design/icons";
import SubTabs from "../SubTabs";
import PersonalInformation from "./personal/PersonalInformation";
import FilesRequirements from "./personal/FilesRequirements";

// onActiveSubTabChange: reports the active sub-tab key up to
// EmployeeForm.jsx (via EmployeeTabs.jsx) — needed to decide Save-button
// visibility, matching EmployeeInformationTabs.vue's
// `tab_personal_data == 0` check (Save only shows on "Personal
// Information", not "Files & Requirements"). See EmployeeForm.jsx.
// pendingCreateData/onPendingCreateDataChange (create mode only): passed
// straight through to FilesRequirements, which reads/writes only the
// `files` slice — see PerformanceManagementTab.jsx for why this is one
// object + one updater rather than a prop per sub-tab, and
// EvaluationRegularizationTab.jsx for why that `files` slice is shared
// with Performance Management's Evaluation & Regularization sub-tab too.
export default function PersonalDataTab({ employeeId, initialFiles, mode, onActiveSubTabChange, pendingCreateData, onPendingCreateDataChange }) {
  const items = [
    {
      key: "info",
      label: "Personal Information",
      icon: <IdcardOutlined />,
      children: <PersonalInformation />
    },
    {
      key: "files",
      label: "Files & Requirements",
      icon: <PaperClipOutlined />,
      children: (
        <FilesRequirements
          employeeId={employeeId}
          initialFiles={initialFiles}
          mode={mode}
          pendingFiles={pendingCreateData?.files || []}
          onPendingFilesChange={(value) => onPendingCreateDataChange("files", value)}
        />
      )
    }
  ];

  const [activeKey, setActiveKey] = useState("info");
  useEffect(() => { onActiveSubTabChange?.(activeKey); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = (key) => {
    setActiveKey(key);
    onActiveSubTabChange?.(key);
  };

  return <SubTabs activeKey={activeKey} onChange={handleChange} items={items} />;
}
