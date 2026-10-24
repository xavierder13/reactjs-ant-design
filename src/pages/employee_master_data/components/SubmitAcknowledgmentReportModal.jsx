"use client";

import { useState } from "react";
import { Modal, Button, Select, Table, Switch, Alert, App } from "antd";
import useEmployeeFormOptions from "../../../hooks/useEmployeeFormOptions";
import useAuth from "../../../hooks/useAuth";
import useAcknowledgmentReportStore from "../../../store/acknowledgmentReportStore";
import handleApiError from "../../../utils/handleApiError";

// Matches vueportal's EmployeeMasterData2.vue "Upload Employee Report"
// button (mdi-upload icon, but not a file upload — it snapshots the
// current row selection into a new branch-level Acknowledgment Report).
// employees: the selected row objects from EmployeeTable/EmployeeCardMobile
// (full employee records, not just ids), so their current `active` status
// and `branch` can seed sensible defaults.
// Branch: only the Administrator or a holder of
// employee-acknowledgment-reports-all picks it; everyone else (e.g. a Branch
// Manager) submits for their own account's branch (users.branch_id — the
// branch the Branch Reports list scopes them to), shown read-only. vueportal's
// store() refuses another branch too.
export default function SubmitAcknowledgmentReportModal({ open, employees, onClose, onSubmitted }) {
  const { message: messageApi } = App.useApp();
  const { user, hasRole, hasPermission } = useAuth();
  const canPickBranch = hasRole('Administrator') || hasPermission('employee-acknowledgment-reports-all');
  const ownBranchId = user?.branch_id ?? user?.branch?.id ?? undefined;
  // Module-gated options (/employee_master_data/create) — /branch/index
  // needs branch-list, which HR roles don't have.
  const { branchOptions } = useEmployeeFormOptions();
  const submitReport = useAcknowledgmentReportStore((s) => s.submitReport);

  const [branchId, setBranchId] = useState(undefined);
  const [statusById, setStatusById] = useState({});
  const [saving, setSaving] = useState(false);

  // Reset on open via the Modal's own lifecycle callback rather than a
  // useEffect — this is an event handler reacting to the open transition,
  // not a render-synchronization effect, so it doesn't trigger
  // react-hooks/set-state-in-effect.
  const handleAfterOpenChange = (isOpen) => {
    if (!isOpen) { setBranchId(undefined); setStatusById({}); return; }
    const branchIds = [...new Set(employees.map((e) => e.branch?.id).filter(Boolean))];
    if (!canPickBranch) setBranchId(ownBranchId);
    else setBranchId(branchIds.length === 1 ? branchIds[0] : undefined);
    setStatusById(Object.fromEntries(employees.map((e) => [e.id, Boolean(e.active)])));
  };

  const spansMultipleBranches = new Set(employees.map((e) => e.branch?.id).filter(Boolean)).size > 1;
  // a locked branch: the employees selected from another branch
  const outsideOwnBranch = !canPickBranch && ownBranchId
    ? employees.filter((e) => e.branch?.id && e.branch.id !== ownBranchId).length : 0;
  // the own branch may be missing from the options — label it from the account
  const options = !canPickBranch && ownBranchId && !branchOptions.some((o) => o.value === ownBranchId)
    ? [...branchOptions, { label: user?.branch?.name || `Branch #${ownBranchId}`, value: ownBranchId }]
    : branchOptions;

  const handleSubmit = async () => {
    if (!branchId) {
      messageApi.warning(canPickBranch ? 'Select a branch for this report.' : 'Your account has no branch — ask an administrator to set it.');
      return;
    }
    setSaving(true);
    try {
      await submitReport({
        branch_id: branchId,
        employees: employees.map((e) => ({ employee_id: e.id, is_active: statusById[e.id] ? 1 : 0 })),
      });
      messageApi.success('Branch report submitted.');
      onSubmitted?.();
      onClose();
    } catch (error) {
      handleApiError(error, messageApi);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      keyboard={false}
      open={open}
      title="Submit Branch Report"
      onCancel={onClose}
      afterOpenChange={handleAfterOpenChange}
      destroyOnHidden
      width={640}
      footer={[
        <Button key="cancel" onClick={onClose} disabled={saving}>Cancel</Button>,
        <Button key="submit" type="primary" loading={saving} disabled={!branchId} onClick={handleSubmit}>Submit</Button>,
      ]}
    >
      {!canPickBranch && !ownBranchId && (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 12 }}
          title="Your account has no branch, so a branch report can't be submitted. Ask an administrator to set your account's branch."
        />
      )}

      {!canPickBranch && outsideOwnBranch > 0 && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          title={`${outsideOwnBranch} selected employee(s) are not in your branch. The report is submitted for your branch.`}
        />
      )}

      {canPickBranch && spansMultipleBranches && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          title="Selected employees span more than one branch. Reports are submitted per branch — pick the branch this report is for."
        />
      )}

      <Select
        placeholder={canPickBranch ? "Select branch" : "No branch on your account"}
        style={{ width: '100%', marginBottom: 16, ...(canPickBranch ? {} : { pointerEvents: 'none' }) }}
        options={options}
        value={branchId}
        onChange={setBranchId}
        showSearch={canPickBranch}
        optionFilterProp="label"
        // Locked look without AntD's `disabled` gray-out (as the Manpower
        // Request Branch field): forced closed, no arrow, no pointer /
        // keyboard interaction — normal (non-darkened) styling.
        {...(canPickBranch ? {} : { open: false, suffixIcon: null, tabIndex: -1 })}
      />

      <Table
        rowKey="id"
        size="small"
        pagination={false}
        dataSource={employees}
        scroll={{ y: 320 }}
        columns={[
          { title: 'Emp. Code', dataIndex: 'employee_code' },
          { title: 'Name', render: (_, r) => `${r.last_name}, ${r.first_name}` },
          {
            title: 'Status',
            render: (_, r) => (
              <Switch
                checked={statusById[r.id] ?? Boolean(r.active)}
                checkedChildren="Active"
                unCheckedChildren="Inactive"
                onChange={(checked) => setStatusById((prev) => ({ ...prev, [r.id]: checked }))}
              />
            ),
          },
        ]}
      />
    </Modal>
  );
}
