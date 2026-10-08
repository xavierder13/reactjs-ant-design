import { useState } from 'react';
import dayjs from 'dayjs';
import { Modal, Form, Select, DatePicker, Input, Row, Col, Alert, Divider, App } from 'antd';

import recruitmentApi from '../../../services/recruitment/recruitmentApi';
import useHiringOfficerStore from '../../../store/hiringOfficerStore';
import { officerName, ineligibleReason } from '../setup/hiring_officer/hiringOfficer';
import { DISPLAY_DATE_FORMAT } from '../../../utils/formatDate';
import { PIPELINE, STATUS_LABELS, currentStep } from './stageProgress';
import {
  EXAM_REQUIRED_FILES, finalRequiredFiles, missingFiles, detailsComplete, gatewayMessage, errorMessage,
} from './requirements';
import { typeAfterSave, SCHEDULE_DATE_FIELD } from './notifications';

// Status update (Phase 3) and hiring-details edit (Phase 6) for one
// applicant — recruitment-portal's ApplicationProgressDialog.vue and
// ApplicationDetailsDialog.vue, which share their fields and rules.
//
// mode 'status'  → only `step`'s fields; POST update_status { applicant_id,
//                  step, ... }. The portal then opens / resets the later
//                  steps itself. `onSaved(row, notify)` — `notify` = { step,
//                  notifType, scheduleDate } when the save calls for an
//                  email / SMS (notifications.js typeAfterSave).
// mode 'details' → every step's fields; POST update_hiring_details, which
//                  saves them verbatim — so here the form opens / clears
//                  the later steps as statuses change (same as the portal
//                  dialog's watchers).

const STATUS_OPTIONS = Object.entries(STATUS_LABELS).map(([value, label]) => ({ value: Number(value), label }));
const OTHERS = 'Others (Specify)';
const NON_COMPLIANT_REASONS = ['Hired in other organization', 'Back out due to Training', OTHERS].map((v) => ({ value: v, label: v }));

const STATUS_FIELDS = PIPELINE.map((p) => p.field);
const DATE_FIELDS = ['screening_date', 'initial_interview_date', 'iq_date', 'bi_date', 'final_interview_date', 'orientation_date', 'signing_of_contract_date'];
const PREFERENCE_FIELDS = ['position_preference', 'branch_preference'];

// Per step: its status field first, then everything else it owns. Reason
// pickers are form-only; they become *_remarks in the payload.
const STEP_FIELDS = {
  0: ['status', 'screening_date'],
  1: ['initial_interview_status', 'initial_interview_date', 'position_preference', 'branch_preference'],
  2: ['iq_status', 'branch_id_complied', 'iq_date'],
  3: ['bi_status', 'bi_date'],
  4: ['final_interview_status', 'final_interview_date', 'employment_position', 'employment_branch',
    'hiring_officer_position', 'hiring_officer_name', 'final_reason', 'final_reason_other'],
  5: ['orientation_status', 'orientation_date', 'signing_of_contract_date', 'orientation_reason', 'orientation_reason_other'],
};
const EMPLOYMENT_FIELDS = ['employment_position', 'employment_branch', 'hiring_officer_position', 'hiring_officer_name'];

const num = (v) => (v === null || v === undefined || v === '' ? null : Number(v));
const ids = (v) => (v ? String(v).split(',').map((s) => s.trim()).filter(Boolean).map(Number) : []);
const toDayjs = (v) => (v ? dayjs(v) : null);
const splitReason = (remarks) => {
  if (!remarks) return [null, null];
  return NON_COMPLIANT_REASONS.some((r) => r.value === remarks) ? [remarks, null] : [OTHERS, remarks];
};
const joinReason = (reason, other) => (reason === OTHERS ? other : reason) || null;
const emptyOf = (field) => (PREFERENCE_FIELDS.includes(field) ? [] : null);

// Form values from the view_applicant row (stage dates YYYY-MM-DD,
// preferences comma ids, employment ids).
const formValuesOf = (a) => {
  const [finalReason, finalOther] = splitReason(a.final_interview_remarks);
  const [orientationReason, orientationOther] = splitReason(a.orientation_remarks);
  return {
    ...Object.fromEntries(STATUS_FIELDS.map((f) => [f, num(a[f])])),
    ...Object.fromEntries(DATE_FIELDS.map((f) => [f, toDayjs(a[f])])),
    position_preference: ids(a.position_preference),
    branch_preference: ids(a.branch_preference),
    branch_id_complied: num(a.branch_id_complied),
    employment_position: num(a.employment_position),
    employment_branch: num(a.employment_branch),
    hiring_officer_position: a.hiring_officer_position || null,
    hiring_officer_name: a.hiring_officer_name || null,
    final_reason: finalReason,
    final_reason_other: finalOther,
    orientation_reason: orientationReason,
    orientation_reason_other: orientationOther,
  };
};

const payloadOf = (values) => {
  const out = {};
  Object.entries(values).forEach(([key, value]) => {
    if (key.endsWith('_reason') || key.endsWith('_reason_other')) return;
    if (DATE_FIELDS.includes(key)) out[key] = value ? value.format('YYYY-MM-DD') : null;
    else if (PREFERENCE_FIELDS.includes(key)) out[key] = value?.length ? value.join(',') : null;
    else out[key] = value ?? null;
  });
  if ('final_interview_status' in values) {
    out.final_interview_remarks = values.final_interview_status === 3 ? joinReason(values.final_reason, values.final_reason_other) : null;
  }
  if ('orientation_status' in values) {
    out.orientation_remarks = values.orientation_status === 3 ? joinReason(values.orientation_reason, values.orientation_reason_other) : null;
  }
  return out;
};

const required = (when, message) => (when ? [{ required: true, message }] : []);

export default function StatusUpdateModal({
  open, mode, step, data, maps, isBranchManager, canEditHiringDetails, onClose, onSaved,
}) {
  const { message, modal } = App.useApp();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const v = Form.useWatch([], form) || {};
  // Hiring Officer Name options (Recruitment → Setup → Hiring Officers —
  // employees, still eligible); picking one fills the employee's position
  // (read-only). Loaded when the modal opens.
  const officerRows = useHiringOfficerStore((state) => state.items);
  const officerRule = useHiringOfficerStore((state) => state.rule);
  const fetchHiringOfficers = useHiringOfficerStore((state) => state.fetchItems);

  const applicant = data?.applicant;
  const details = mode === 'details';
  const steps = details ? PIPELINE.map((p) => p.step) : [step];
  const shows = (s) => steps.includes(s);

  const options = (map) => Object.entries(map || {})
    .map(([id, name]) => ({ value: Number(id), label: name }))
    .sort((a, b) => a.label.localeCompare(b.label));
  const positionOptions = options(maps?.positions);
  const branchOptions = options(maps?.branches);
  // A name saved before the list existed (or since deleted) stays selectable
  // with its saved position, so editing other fields doesn't drop it.
  const savedOfficer = applicant?.hiring_officer_name;
  const hiringOfficers = officerRows
    .filter((o) => !ineligibleReason(o, officerRule))
    .map((o) => ({ name: officerName(o.employee), position: o.employee.position?.name || null }))
    .filter((o, i, all) => all.findIndex((x) => x.name === o.name) === i); // same name twice → one option
  const hiringOfficerOptions = [
    ...hiringOfficers.map((o) => ({ value: o.name, label: o.name })),
    ...(savedOfficer && !hiringOfficers.some((o) => o.name === savedOfficer) ? [{ value: savedOfficer, label: savedOfficer }] : []),
  ];
  const officerPosition = (name) => {
    const officer = hiringOfficers.find((o) => o.name === name);
    if (officer) return officer.position;
    return name && name === savedOfficer ? applicant.hiring_officer_position || null : null;
  };

  // Required-file gates: only while the applicant is still on that step.
  const files = data?.applicant_files || [];
  const examMissing = v.iq_status === 1 && applicant?.progress_status === 'Exam on Process'
    ? missingFiles(EXAM_REQUIRED_FILES, files) : [];
  const finalMissing = v.final_interview_status === 1 && applicant?.progress_status === 'Final Interview on Process'
    ? missingFiles(finalRequiredFiles(maps?.positions?.[String(v.employment_position)]), files) : [];

  const handleAfterOpenChange = (isOpen) => {
    if (!isOpen || !applicant) return;
    fetchHiringOfficers();
    form.resetFields();
    form.setFieldsValue(formValuesOf(applicant));
  };

  // Keeps dependent fields consistent as a status changes (portal watchers).
  const handleValuesChange = (changed, all) => {
    const set = {};
    const changedStatus = STATUS_FIELDS.findIndex((f) => f in changed);

    if ('initial_interview_status' in changed) {
      if (changed.initial_interview_status === 1) {
        // Passed: start from the applicant's own preferences, else what they applied for.
        if (!all.position_preference?.length) {
          const prefs = ids(applicant.position_preference);
          set.position_preference = prefs.length ? prefs : [num(applicant.position_id)];
        }
        if (!all.branch_preference?.length) {
          const prefs = ids(applicant.branch_preference);
          set.branch_preference = prefs.length ? prefs : [num(applicant.branch_id)];
        }
      } else {
        set.position_preference = [];
        set.branch_preference = [];
      }
    }
    // Statuses whose date only applies once the step is decided.
    if ('status' in changed && !changed.status) set.screening_date = null;
    if ('iq_status' in changed) {
      if (!changed.iq_status) {
        set.iq_date = null;
        set.branch_id_complied = null;
      } else if (!all.branch_id_complied) {
        // The portal fills in the acting user's branch; a Branch Manager
        // only sees their own branch's applicants, so the branch applied
        // for is the same branch and is portal-id based.
        set.branch_id_complied = num(applicant.branch_id_complied) ?? num(applicant.branch_id);
      }
    }
    if ('bi_status' in changed && !changed.bi_status) set.bi_date = null;
    if ('hiring_officer_name' in changed) set.hiring_officer_position = officerPosition(changed.hiring_officer_name);
    if ('final_interview_status' in changed) {
      if (![1, 4].includes(changed.final_interview_status)) EMPLOYMENT_FIELDS.forEach((f) => { set[f] = null; });
      if (changed.final_interview_status !== 3) Object.assign(set, { final_reason: null, final_reason_other: null });
    }
    if ('orientation_status' in changed && changed.orientation_status !== 3) {
      Object.assign(set, { orientation_reason: null, orientation_reason_other: null });
    }
    if ('final_reason' in changed && changed.final_reason !== OTHERS) set.final_reason_other = null;
    if ('orientation_reason' in changed && changed.orientation_reason !== OTHERS) set.orientation_reason_other = null;

    // Details mode saves every field as sent: Passed opens the next step
    // (On Process); anything else clears every later step.
    if (details && changedStatus > -1) {
      const value = changed[STATUS_FIELDS[changedStatus]];
      if (value === 1) {
        const next = STATUS_FIELDS[changedStatus + 1];
        if (next && all[next] === null) set[next] = 0;
      } else {
        for (let s = changedStatus + 1; s < PIPELINE.length; s += 1) {
          STEP_FIELDS[s].forEach((f) => { set[f] = emptyOf(f); });
        }
      }
    }

    if (Object.keys(set).length) form.setFieldsValue(set);
  };

  const submit = async (values) => {
    setSaving(true);
    try {
      const payload = { applicant_id: applicant.id, step: details ? currentStep(applicant) : step, ...payloadOf(values) };
      const { data: res } = details
        ? await recruitmentApi.updateHiringDetails(payload)
        : await recruitmentApi.updateStatus(payload);
      if (res?.success) {
        message.success(res.resp || 'Saved.');
        // A status save may call for an email / SMS (portal rules); hiring
        // details edits never do.
        const notifType = details ? '' : typeAfterSave(step, payload);
        onSaved(res.applicant, notifType && { step, notifType, scheduleDate: payload[SCHEDULE_DATE_FIELD[notifType]] });
        return;
      }
      if (res?.error && typeof res.error === 'object') {
        form.setFields(Object.entries(res.error)
          .filter(([name]) => name in values)
          .map(([name, errors]) => ({ name, errors: [].concat(errors) })));
      }
      if (res?.warning) message.warning(res.warning);
      else message.error(gatewayMessage(res, 'The status could not be saved.'));
    } catch (err) {
      message.error(errorMessage(err, 'The status could not be saved.'));
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return; // inline field errors
    }
    if (examMissing.length || finalMissing.length) {
      message.error('Upload the required files first (Files tab).');
      return;
    }
    modal.confirm({
      title: 'Are you sure?',
      content: details ? 'Save the hiring details?' : `Update the ${PIPELINE[step].label} status?`,
      okText: 'Save',
      onOk: () => submit(values),
    });
  };

  const statusItem = (name, label, extra = {}) => (
    <Form.Item name={name} label={label} rules={required(name === 'status' || !details, 'Status is required.')}>
      <Select options={STATUS_OPTIONS} placeholder="Select status" disabled={extra.disabled} />
    </Form.Item>
  );
  const dateItem = (name, label, { when, disabled } = {}) => (
    <Form.Item name={name} label={label} rules={required(when && !disabled, 'Please enter date.')}>
      <DatePicker format={DISPLAY_DATE_FORMAT} style={{ width: '100%' }} disabled={disabled} />
    </Form.Item>
  );
  const reasonItems = (prefix, label, status) => status === 3 && (
    <>
      <Form.Item name={`${prefix}_reason`} label={label} rules={required(true, 'Please select reason.')}>
        <Select options={NON_COMPLIANT_REASONS} placeholder="Select reason" />
      </Form.Item>
      {v[`${prefix}_reason`] === OTHERS && (
        <Form.Item name={`${prefix}_reason_other`} label="Specify Non-Compliant Reason" rules={required(true, 'Please specify reason.')}>
          <Input maxLength={255} />
        </Form.Item>
      )}
    </>
  );
  const filesAlert = (missing) => missing.length > 0 && (
    <Alert type="error" showIcon style={{ marginBottom: 12 }} title={`Please upload: ${missing.join(', ')}`} />
  );
  const section = (s, children) => shows(s) && (
    <div key={s}>
      {details && <Divider titlePlacement="start" style={{ marginTop: 4 }}>{PIPELINE[s].label}</Divider>}
      {children}
    </div>
  );
  const col = (node) => <Col xs={24} md={details ? 12 : 24}>{node}</Col>;

  const sections = [
    section(0, (
      <Row gutter={16}>
        {col(statusItem('status', 'Screening Status'))}
        {col(dateItem('screening_date', 'Screening Date', { when: v.status > 0 && canEditHiringDetails, disabled: !v.status }))}
      </Row>
    )),
    section(1, (
      <>
        {!details && !detailsComplete(applicant, data?.educ_attains, data?.references) && (
          <Alert
            type="warning" showIcon style={{ marginBottom: 12 }}
            title="Incomplete applicant details"
            description="Please complete the required personal details, education and references before setting the Initial Interview date."
          />
        )}
        <Row gutter={16}>
          {col(dateItem('initial_interview_date', 'Initial Interview Date', {
            when: details ? v.initial_interview_status > 0 : v.initial_interview_status === 1,
          }))}
          {col(statusItem('initial_interview_status', 'Initial Interview Status'))}
          <Col span={24}>
            <Form.Item name="position_preference" label="Position Preference" rules={required(v.initial_interview_status === 1, 'Position Preference is required.')}>
              <Select mode="multiple" allowClear maxTagCount="responsive" options={positionOptions} showSearch={{ optionFilterProp: 'label' }} disabled={v.initial_interview_status !== 1} />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item name="branch_preference" label="Branch Preference" rules={required(v.initial_interview_status === 1, 'Branch Preference is required.')}>
              <Select mode="multiple" allowClear maxTagCount="responsive" options={branchOptions} showSearch={{ optionFilterProp: 'label' }} disabled={v.initial_interview_status !== 1} />
            </Form.Item>
          </Col>
        </Row>
      </>
    )),
    section(2, (
      <>
        {filesAlert(examMissing)}
        <Row gutter={16}>
          {col(statusItem('iq_status', 'Exam Status', { disabled: v.initial_interview_status !== 1 }))}
          {col(dateItem('iq_date', 'Exam Date', { when: v.iq_status > 0, disabled: !v.iq_status }))}
          {col(
            <Form.Item name="branch_id_complied" label="Branch Complied">
              <Select allowClear options={branchOptions} showSearch={{ optionFilterProp: 'label' }} disabled={!v.iq_status || isBranchManager} />
            </Form.Item>,
          )}
        </Row>
      </>
    )),
    section(3, (
      <Row gutter={16}>
        {col(statusItem('bi_status', 'B.I & Basic Req Status', { disabled: !v.iq_status }))}
        {col(dateItem('bi_date', 'B.I & Basic Req Date', { when: v.bi_status > 0, disabled: !v.bi_status }))}
      </Row>
    )),
    section(4, (
      <>
        {filesAlert(finalMissing)}
        <Row gutter={16}>
          {col(dateItem('final_interview_date', 'Final Interview Date', { when: v.final_interview_status > 0, disabled: !v.bi_status }))}
          {col(statusItem('final_interview_status', 'Final Interview Status', { disabled: !v.final_interview_date }))}
          <Col span={24}>{reasonItems('final', 'Non-Compliant Reason', v.final_interview_status)}</Col>
          {col(
            <Form.Item name="employment_position" label="Employment Position" rules={required(v.final_interview_status === 1, 'Employment Position is required.')}>
              <Select allowClear options={positionOptions} showSearch={{ optionFilterProp: 'label' }} disabled={!v.final_interview_status} />
            </Form.Item>,
          )}
          {col(
            <Form.Item name="employment_branch" label="Employment Branch" rules={required(v.final_interview_status === 1, 'Employment Branch is required.')}>
              <Select allowClear options={branchOptions} showSearch={{ optionFilterProp: 'label' }} disabled={!v.final_interview_status} />
            </Form.Item>,
          )}
          {col(
            <Form.Item name="hiring_officer_name" label="Hiring Officer Name" rules={required(v.final_interview_status === 1, 'Hiring Officer Name is required.')}>
              <Select allowClear options={hiringOfficerOptions} showSearch={{ optionFilterProp: 'label' }} disabled={!v.final_interview_status} />
            </Form.Item>,
          )}
          {col(
            <Form.Item name="hiring_officer_position" label="Hiring Officer Position" rules={required(v.final_interview_status === 1, 'Hiring Officer Position is required.')}>
              <Input readOnly placeholder="Based on the hiring officer" disabled={!v.final_interview_status} />
            </Form.Item>,
          )}
        </Row>
      </>
    )),
    section(5, (
      <Row gutter={16}>
        {col(dateItem('orientation_date', 'Orientation / Training Date', { when: v.orientation_status > 0, disabled: v.final_interview_status !== 1 }))}
        {col(dateItem('signing_of_contract_date', 'Signing of Contract Date', { when: v.orientation_status > 0, disabled: v.final_interview_status !== 1 }))}
        {col(statusItem('orientation_status', 'Orientation Status', { disabled: !v.orientation_date }))}
        <Col span={24}>{reasonItems('orientation', 'Orientation Non-Compliant Reason', v.orientation_status)}</Col>
      </Row>
    )),
  ];

  return (
    <Modal
      open={open}
      title={details ? 'Hiring Details' : `${PIPELINE[step]?.label} Status`}
      width={details ? 900 : 520}
      destroyOnHidden
      afterOpenChange={handleAfterOpenChange}
      onCancel={onClose}
      onOk={handleSave}
      okText="Save"
      confirmLoading={saving}
      mask={{ closable: false }}
    >
      <Form form={form} layout="vertical" onValuesChange={handleValuesChange}>
        {sections}
      </Form>
    </Modal>
  );
}
