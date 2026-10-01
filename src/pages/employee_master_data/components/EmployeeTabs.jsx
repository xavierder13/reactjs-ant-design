"use client";

import { useEffect, useState } from "react";
import { Tabs } from "antd";

import useAuth from "../../../hooks/useAuth";
import { getEmployeeTabItems, TAB_PERMISSIONS } from "./employeeTabItems";
import "./employeeTabs.css";

// mode: 'create' | 'edit' | 'view'. All tabs render inside EmployeeForm.jsx's
// single shared <Form> — see PersonalInformation.jsx's header comment.
// initialData is the employee record (from router state on edit/view,
// undefined on create) — only used here for the read-only/derived display
// bits (EmployeeDetailsTab) and for seeding Files & Requirements; the
// editable field values themselves are set via form.setFieldsValue in
// EmployeeForm.jsx, not passed as props. Tab definitions and their
// permissions live in employeeTabItems.jsx.

// activeTab/activeSubTab are lifted to EmployeeForm.jsx — it needs to know
// which tab (and, for Personal Data / Performance Management, which
// sub-tab) is active to decide whether the main Save button should show
// at all, per EmployeeInformationTabs.vue's `changeSaveBtnVisibility()`
// (see EmployeeForm.jsx for the full port of that logic).
// onPersonalSubTabChange/onPerformanceSubTabChange are two separate
// callbacks, not one shared one — AntD's Tabs keeps every pane mounted by
// default (not just the active one), so Personal Data and Performance
// Management mount at the same time and would both report into one
// shared "active sub-tab" value if it were shared, and whichever fired
// last would silently overwrite the other's — a real bug caught before
// it shipped, not a hypothetical.
// pendingCreateData/onPendingCreateDataChange (create mode only): the
// single object + updater holding every sub-tab's staged-but-not-yet-saved
// rows/files, lifted all the way from EmployeeForm.jsx (see that file for
// the full rationale and the final bundling into one multipart create
// request — matches EmployeeMasterDataController@store() accepting all of
// these except Offboarding in the same request that creates the employee).
export default function EmployeeTabs({ mode = "create", initialData, onEmployeeChange, onActiveTabChange, onPersonalSubTabChange, onPerformanceSubTabChange, pendingCreateData, onPendingCreateDataChange }) {
  const { hasPermission } = useAuth();

  const allItems = getEmployeeTabItems({ mode, initialData, onEmployeeChange, onPersonalSubTabChange, onPerformanceSubTabChange, pendingCreateData, onPendingCreateDataChange });

  const items = allItems.filter((item) => hasPermission(TAB_PERMISSIONS[item.key]));

  const [activeKey, setActiveKey] = useState(items[0]?.key);
  // Reports the initial default tab up once on mount (onChange only fires
  // on a user-driven switch, not for AntD's own default-active selection)
  // — a child's effect calling a parent-owned setter, not this component
  // setting its own state in its own effect, so it doesn't trip
  // react-hooks/set-state-in-effect.
  useEffect(() => { onActiveTabChange?.(activeKey); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = (key) => {
    setActiveKey(key);
    onActiveTabChange?.(key);
  };

  return <Tabs className="emd-tabs emd-tabs-block" styles={{ header: { marginBottom: 20 } }} activeKey={activeKey} onChange={handleChange} items={items} />;
}
