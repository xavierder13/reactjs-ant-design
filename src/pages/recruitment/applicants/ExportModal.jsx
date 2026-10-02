import { useState } from 'react';
import dayjs from 'dayjs';
import { Modal, Form, Select, DatePicker, Checkbox, Alert, App } from 'antd';

import recruitmentApi from '../../../services/recruitment/recruitmentApi';
import { DISPLAY_DATE_FORMAT } from '../../../utils/formatDate';
import { errorMessage, gatewayMessage } from './requirements';
import {
  FRONT_PAGE, DETAILED, ALL_BRANCHES_ID, FRONT_PAGE_TYPES, DETAILED_TYPES, DATE_FIELD_PARAMS,
  reportFilename, downloadReport,
} from './exportReports';

const { RangePicker } = DatePicker;

// Export dialog (portal DialogExport.vue). On a stage list the report is
// that stage's Detailed Report; on All Applicants any report the user may
// run. Branch Managers get their own branch (the gateway forces it), so the
// branch picker is hidden for them. Front Page reports are checked against
// the user's portal permissions by the gateway; a refusal shows here.
export default function ExportModal({ open, stageKey, branches, can, isBranchManager, onClose }) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [busy, setBusy] = useState(false);
  const group = Form.useWatch('report_group', form);
  const type = Form.useWatch('report_type', form);

  const lockedType = DETAILED_TYPES.find((t) => t.stageKey === stageKey && stageKey !== 'applicant-list');
  const detailedTypes = DETAILED_TYPES.filter((t) => !t.permission || can(t.permission));
  const typeOptions = (group === FRONT_PAGE ? FRONT_PAGE_TYPES : detailedTypes).map((t) => ({ value: t.value, label: t.value }));
  const overall = type === 'Overall Count';
  const dateParams = DATE_FIELD_PARAMS.slice(0, DETAILED_TYPES.find((t) => t.value === type)?.dates || 0);
  const branchOptions = Object.entries(branches || {})
    .map(([id, name]) => ({ value: Number(id), label: Number(id) === ALL_BRANCHES_ID ? 'ALL BRANCHES' : name }))
    .sort((a, b) => (a.value === ALL_BRANCHES_ID ? -1 : b.value === ALL_BRANCHES_ID ? 1 : a.label.localeCompare(b.label)));

  const handleAfterOpenChange = (isOpen) => {
    if (!isOpen) return;
    form.resetFields();
    form.setFieldsValue({
      report_group: lockedType ? DETAILED : FRONT_PAGE,
      report_type: lockedType?.value,
      branch_id: branches?.[ALL_BRANCHES_ID] ? ALL_BRANCHES_ID : undefined,
      get_empty_date: false,
    });
  };

  const handleValuesChange = (changed) => {
    if ('report_group' in changed) form.setFieldsValue({ report_type: undefined, date_field_param: undefined });
    if ('report_type' in changed) form.setFieldsValue({ date_field_param: undefined, range: undefined, as_of: undefined });
  };

  const handleGenerate = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    const [from, to] = overall ? [null, values.as_of] : values.range;
    const dateTo = to.format('YYYY-MM-DD');
    const report = values.report_group === DETAILED
      ? 'applicants'
      : FRONT_PAGE_TYPES.find((t) => t.value === values.report_type).report;
    setBusy(true);
    try {
      const { data } = await recruitmentApi.exportReport(report, {
        date_from: from ? from.format('YYYY-MM-DD') : '',
        date_to: dateTo,
        asOfDate: dateTo,
        branch_id: isBranchManager ? null : values.branch_id,
        report_group: values.report_group,
        report_type: values.report_type,
        date_field_param: values.date_field_param || '',
        get_empty_date: values.get_empty_date,
      });
      if (!data?.success) {
        message.error(gatewayMessage(data, 'The report could not be generated.'));
        return;
      }
      const branchName = isBranchManager ? 'My Branch' : branchOptions.find((b) => b.value === values.branch_id)?.label;
      const written = downloadReport(values.report_group, values.report_type, data.applicants,
        reportFilename(values.report_group, values.report_type, branchName));
      if (!written) {
        message.warning('No records found.');
        return;
      }
      message.success('Report downloaded.');
      onClose();
    } catch (err) {
      message.error(errorMessage(err, 'The report could not be generated.'));
    } finally {
      setBusy(false);
    }
  };

  const required = (msg) => [{ required: true, message: msg }];

  return (
    <Modal
      open={open}
      title="Export Records"
      destroyOnHidden
      afterOpenChange={handleAfterOpenChange}
      onCancel={onClose}
      onOk={handleGenerate}
      okText="Generate & Download"
      confirmLoading={busy}
      mask={{ closable: false }}
    >
      <Form form={form} layout="vertical" onValuesChange={handleValuesChange}>
        <Form.Item name="report_group" label="Report Group" rules={required('Please select report group.')}>
          <Select
            disabled={Boolean(lockedType)}
            options={[FRONT_PAGE, DETAILED].map((g) => ({ value: g, label: g }))}
          />
        </Form.Item>
        <Form.Item name="report_type" label="Report Type" rules={required('Please select report type.')}>
          <Select disabled={Boolean(lockedType) || !group} options={typeOptions} placeholder="Select report type" />
        </Form.Item>
        {isBranchManager ? (
          <Alert type="info" showIcon style={{ marginBottom: 16 }} title="Exports cover your own branch." />
        ) : (
          <Form.Item name="branch_id" label="Branch" rules={required('Please select a branch.')}>
            <Select options={branchOptions} showSearch={{ optionFilterProp: 'label' }} placeholder="Select branch" />
          </Form.Item>
        )}
        {group === DETAILED && (
          <Form.Item name="date_field_param" label="Date Field" rules={required('Please select date field parameter.')}>
            <Select options={dateParams} disabled={!type} placeholder="Filter the date range on…" />
          </Form.Item>
        )}
        {overall ? (
          <Form.Item name="as_of" label="As Of" rules={required('Please enter date.')}>
            <DatePicker format={DISPLAY_DATE_FORMAT} style={{ width: '100%' }} />
          </Form.Item>
        ) : (
          <Form.Item name="range" label="Date Range" rules={required('Please select a date range.')}>
            <RangePicker format={DISPLAY_DATE_FORMAT} style={{ width: '100%' }} disabledDate={(d) => d && d.isBefore(dayjs('1900-01-01'))} />
          </Form.Item>
        )}
        <Form.Item name="get_empty_date" valuePropName="checked" style={{ marginBottom: 0 }}>
          <Checkbox>Include records with an empty date</Checkbox>
        </Form.Item>
      </Form>
    </Modal>
  );
}
