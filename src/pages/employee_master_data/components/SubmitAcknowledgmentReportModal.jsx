"use client";

import { useState } from "react";
import { Modal, Button, Select, Table, Switch, Alert, App } from "antd";
import useBranches from "../../../hooks/useBranches";
import useAcknowledgmentReportStore from "../../../store/acknowledgmentReportStore";
import handleApiError from "../../../utils/handleApiError";

// Matches vueportal's EmployeeMasterData2.vue "Upload Employee Report"
// button (mdi-upload icon, but not a file upload — it snapshots the
// current row selection into a new branch-level Acknowledgment Report).
// employees: the selected row objects from EmployeeTable/EmployeeCardMobile
// (full employee records, not just ids), so their current `active` status
// and `branch` can seed sensible defaults.
export default function SubmitAcknowledgmentReportModal({ open, employees, onClose, onSubmitted }) {
  const { message: messageApi } = App.useApp();
  const { branchOptions } = useBranches();
  const submitReport = useAcknowledgmentReportStore((s) => s.submitReport);

  const [branchId, setBranchId] = useState(undefined);
  const [statusById, setStatusById] = useState({});
  const [saving, setSaving] = useState(false);

  // Reset on open via the Modal's own lifecycle callback rather than a
  // useEffect — this is an event handler reacting to the open transition,
  // not a render-synchronization effect, so it doesn't trigger
  // react-hooks/set-state-in-effect.
  const handleAfterOpenChange = (isOpen) => {
    if (!isOpen) return;
    const branchIds = [...new Set(employees.map((e) => e.branch?.id).filter(Boolean))];
    setBranchId(branchIds.length === 1 ? branchIds[0] : undefined);
    setStatusById(Object.fromEntries(employees.map((e) => [e.id, Boolean(e.active)])));
  };

  const spansMultipleBranches = new Set(employees.map((e) => e.branch?.id).filter(Boolean)).size > 1;

  const handleSubmit = async () => {
    if (!branchId) {
      messageApi.warning('Select a branch for this report.');
      return;
    }
    setSaving(true);
    try {
      await submitReport({
        branch_id: branchId,
        employees: employees.map((e) => ({ employee_id: e.id, is_active: statusById[e.id] ? 1 : 0 })),
      });
      messageApi.success('Acknowledgment report submitted.');
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
      open={open}
      title="Submit Acknowledgment Report"
      onCancel={onClose}
      afterOpenChange={handleAfterOpenChange}
      destroyOnHidden
      width={640}
      footer={[
        <Button key="cancel" onClick={onClose} disabled={saving}>Cancel</Button>,
        <Button key="submit" type="primary" loading={saving} onClick={handleSubmit}>Submit</Button>,
      ]}
    >
      {spansMultipleBranches && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          title="Selected employees span more than one branch. Reports are submitted per branch — pick the branch this report is for."
        />
      )}

      <Select
        placeholder="Select branch"
        style={{ width: '100%', marginBottom: 16 }}
        options={branchOptions}
        value={branchId}
        onChange={setBranchId}
        showSearch
        optionFilterProp="label"
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
