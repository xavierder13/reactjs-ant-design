import { useState } from "react";
import { Card, Tabs, Form } from "antd";
import { useSearchParams } from "react-router-dom";
import { ProfileOutlined, IdcardOutlined, FolderOpenOutlined } from "@ant-design/icons";

import useAuth from "../../../hooks/useAuth";
import { toDayjs } from "../../../utils/formatDate";
import { getEmployeeTabItems, TAB_PERMISSIONS } from "../components/employeeTabItems";
import ProfileHeader from "./ProfileHeader";
import ProfileOverview from "./ProfileOverview";
import ProfileEmployment from "./ProfileEmployment";
import ProfileDocuments from "./ProfileDocuments";
import "../components/employeeTabs.css";

// The existing Employee Master Data tabs reused read-only below the
// profile's own sections (HR view only).
const RECORD_TAB_KEYS = ["workSchedule", "attendance", "performance", "disciplinary", "training", "offboarding"];

// Shared employee profile — the HR view at /employees/:id (`view="hr"`) and
// the signed-in user's own profile at /user/profile (`view="self"`, when
// their account is linked via users.employee_id). Ports
// EmployeeProfile2.vue (photo upload, identity, reporting manager,
// personal data, employee details) and adds Documents plus, for HR, the
// record tabs.
//
// HR: each section follows the same permission as the matching Employee
// Master Data tab (TAB_PERMISSIONS). Self: the employee always sees their
// own Overview / Employment / Documents; actions (photo, file
// upload/download/delete) still need their permission, since the backend
// enforces those. Administrator passes every gate.
//
// `extra`: header actions (e.g. Edit). `extraTabs`: tab items appended
// after the profile's own (e.g. Account & Security on /user/profile).
// The active tab is kept in `?tab=` so a refresh or shared link reopens it.
export default function EmployeeProfile({ employee: initialEmployee, view = "hr", extra, extraTabs = [] }) {
  const { hasRole, hasPermission } = useAuth();
  const [employee, setEmployee] = useState(initialEmployee);
  const [searchParams, setSearchParams] = useSearchParams();

  const can = (permission) => hasRole("Administrator") || hasPermission(permission);
  const isSelf = view === "self";
  const sectionVisible = (key) => isSelf || can(TAB_PERMISSIONS[key]);
  const patchEmployee = (patch) => setEmployee((prev) => ({ ...prev, ...patch }));

  const items = [];
  if (sectionVisible("personal")) {
    items.push({ key: "overview", label: "Overview", icon: <ProfileOutlined />, children: <ProfileOverview employee={employee} /> });
  }
  if (sectionVisible("details")) {
    items.push({ key: "employment", label: "Employment", icon: <IdcardOutlined />, children: <ProfileEmployment employee={employee} /> });
  }
  if (sectionVisible("personal")) {
    items.push({
      key: "documents",
      label: "Documents",
      icon: <FolderOpenOutlined />,
      children: (
        <ProfileDocuments
          employee={employee}
          canUpload={can("employee-master-data-file-upload")}
          canDownload={can("employee-master-data-file-download")}
          canDelete={can("employee-master-data-file-delete")}
        />
      ),
    });
  }

  if (!isSelf) {
    getEmployeeTabItems({ mode: "view", initialData: employee, onEmployeeChange: patchEmployee })
      .filter((tab) => RECORD_TAB_KEYS.includes(tab.key) && can(TAB_PERMISSIONS[tab.key]))
      .forEach((tab) => items.push({
        ...tab,
        // The record tabs render bare Form.Items (e.g. Evaluation &
        // Regularization's date) expecting EmployeeForm's ancestor <Form>.
        // Not `disabled`: that would also disable their downloads and the
        // Attendance filters; view mode already hides every mutating action.
        children: (
          <Card size="small">
            <Form
              layout="vertical"
              initialValues={{ regularization_date: toDayjs(employee.regularization_date) }}
            >
              {tab.children}
            </Form>
          </Card>
        ),
      }));
  }

  items.push(...extraTabs);

  const requested = searchParams.get("tab");
  const activeKey = items.some((item) => item.key === requested) ? requested : items[0]?.key;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <ProfileHeader
        employee={employee}
        canUploadPhoto={can("employee-master-data-profile-picture-upload")}
        onEmployeeChange={patchEmployee}
        extra={extra}
      />
      {items.length > 0 && (
        <Tabs
          className="emd-tabs emd-tabs-block" styles={{ header: { marginBottom: 20 } }}
          activeKey={activeKey}
          onChange={(key) => setSearchParams({ tab: key }, { replace: true })}
          items={items}
        />
      )}
    </div>
  );
}
