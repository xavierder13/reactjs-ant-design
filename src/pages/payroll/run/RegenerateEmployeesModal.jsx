import { useState } from 'react';
import { Modal, Select, Space, Button, Alert, Tag, Typography, App } from 'antd';
import payrollRunApi from '../../../services/payroll/payrollRunApi';
import handleApiError from '../../../utils/handleApiError';

// Generate a Draft payroll again for the chosen employees only — the others
// keep their lines. The list is everyone in the payroll plus every eligible
// employee not in it yet (e.g. a salary saved after it was generated); one
// chosen but no longer eligible (inactive / no salary) leaves the payroll.
// Approved (posted) payslips are shown but can't be chosen — roll them back
// first.
// `target`: { run, preselected: [employee_id] } | null.
const RegenerateEmployeesModal = ({ target, onClose, onDone }) => {
  const { message } = App.useApp();
  const [shown, setShown] = useState(null); // survives the close animation
  const [candidates, setCandidates] = useState(null);
  const [selected, setSelected] = useState([]);
  const [saving, setSaving] = useState(false);

  if (target && target !== shown) {
    setShown(target);
    setSelected(target.preselected || []);
    setCandidates(null);
  }

  const handleAfterOpenChange = async (isOpen) => {
    if (!isOpen || !target) return;
    try {
      const { data } = await payrollRunApi.candidates(target.run.id);
      setCandidates(data.employees);
      setSelected((s) => s.filter((eid) => !data.employees.some((c) => c.id === eid && c.approved)));
    } catch (error) {
      handleApiError(error, message);
    }
  };

  const run = shown?.run;
  const notIn = (candidates || []).filter((c) => !c.in_run && c.eligible && !c.approved);
  const leaving = (candidates || []).filter((c) => selected.includes(c.id) && !c.eligible);

  const handleOk = async () => {
    if (!selected.length) {
      message.error('Select the employees to generate again');
      return;
    }
    setSaving(true);
    try {
      const { data } = await payrollRunApi.generate({ payroll_cutoff_id: run.payroll_cutoff_id, employee_ids: selected });
      message.success(data.message);
      onDone();
    } catch (error) {
      handleApiError(error, message);
    } finally {
      setSaving(false);
    }
  };

  const options = (candidates || []).map((c) => ({
    value: c.id,
    label: `${c.employee_code} - ${c.full_name}`,
    search: `${c.employee_code} ${c.full_name} ${c.branch || ''}`,
    disabled: c.approved,
    c,
  }));

  return (
    <Modal
      open={!!target}
      title={`Generate Selected Employees — ${run?.cutoff?.code || ''}`}
      okText={`Generate ${selected.length || ''} Employee${selected.length === 1 ? '' : 's'}`}
      okButtonProps={{ disabled: !selected.length || !candidates }}
      confirmLoading={saving}
      onOk={handleOk}
      onCancel={onClose}
      afterOpenChange={handleAfterOpenChange}
      width={680}
      destroyOnHidden
    >
      <Typography.Paragraph type='secondary'>
        Only the chosen employees are computed again from today&apos;s attendance, leave, overtime, salary and deductions; everyone else keeps their figures.
      </Typography.Paragraph>
      <Space wrap style={{ marginBottom: 8 }}>
        <Button size='small' disabled={!candidates} onClick={() => setSelected((candidates || []).filter((c) => c.in_run && !c.approved).map((c) => c.id))}>All in payroll</Button>
        <Button size='small' disabled={!notIn.length} onClick={() => setSelected((s) => [...new Set([...s, ...notIn.map((c) => c.id)])])}>
          Add not in payroll ({notIn.length})
        </Button>
        <Button size='small' disabled={!selected.length} onClick={() => setSelected([])}>Clear</Button>
      </Space>
      <Select
        mode='multiple'
        style={{ width: '100%' }}
        loading={!candidates}
        value={selected}
        onChange={setSelected}
        options={options}
        showSearch={{ filterOption: (input, o) => o.search.toLowerCase().includes(input.toLowerCase()) }}
        placeholder='Search employees'
        maxTagCount={12}
        optionRender={(o) => (
          <Space>
            <span>{o.data.label}</span>
            <Typography.Text type='secondary' style={{ fontSize: 12 }}>{o.data.c.branch || ''}</Typography.Text>
            {!o.data.c.in_run && o.data.c.eligible && <Tag color='blue'>Not in payroll</Tag>}
            {!o.data.c.eligible && <Tag color='orange'>No longer eligible</Tag>}
            {o.data.c.approved && <Tag color='green'>Approved — locked</Tag>}
          </Space>
        )}
      />
      {leaving.length > 0 && (
        <Alert
          type='warning'
          showIcon
          style={{ marginTop: 12 }}
          title={`${leaving.length} chosen employee(s) will leave this payroll — inactive or no salary for this cut-off.`}
        />
      )}
    </Modal>
  );
};

export default RegenerateEmployeesModal;
