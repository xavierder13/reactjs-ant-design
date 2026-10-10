import { useState } from 'react';
import dayjs from 'dayjs';
import {
  Modal, Form, Select, DatePicker, Input, Upload, Button, Alert, Table, Tag, Space, Checkbox, Typography, Popconfirm, App,
} from 'antd';
import { DownloadOutlined, UploadOutlined, EyeOutlined } from '@ant-design/icons';
import contributionTableApi from '../../../services/payroll/contributionTableApi';
import handleApiError from '../../../utils/handleApiError';
import downloadBlobResponse from '../../../utils/downloadBlobResponse';
import { DISPLAY_DATE_FORMAT, formatDate } from '../../../utils/formatDate';
import { applyFormErrors } from '../payrollHelpers';
import { FIELD_LABELS, formatCell } from './contributionColumns';

const STATUS = {
  new:     { label: 'New', color: 'blue' },
  changed: { label: 'Changed', color: 'gold' },
  same:    { label: 'Same', color: 'default' },
};

const cell = (field, value) => (field === 'range_to' && (value === null || value === undefined) ? 'and above' : formatCell(field, value));

// Import a renewed / updated government table from Excel: download the
// agency's template (pre-filled with its latest version), change the
// numbers, upload it with the effective date, Preview — a new version, or
// the brackets of the version saved for that date replaced; each bracket
// against the version it follows / replaces — then Import. Any change to
// the form or the file clears the preview.
const ContributionTableImportModal = ({ open, agency: defaultAgency, agencies, rowFields, onClose, onImported }) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [plan, setPlan] = useState(null);
  const [busy, setBusy] = useState(null); // 'download' | 'preview' | 'import'
  const [changesOnly, setChangesOnly] = useState(true);
  const agency = Form.useWatch('agency', form) || defaultAgency;
  const fields = rowFields[agency] || [];

  const handleAfterOpenChange = (isOpen) => {
    if (!isOpen) return;
    form.resetFields();
    form.setFieldsValue({ agency: defaultAgency });
    setPlan(null);
    setChangesOnly(true);
  };

  const download = async () => {
    setBusy('download');
    try {
      const response = await contributionTableApi.templateDownload({ agency });
      if (await downloadBlobResponse(response, `ContributionTable_${agency}_Template.xls`, message)) {
        message.success(`${agency} template downloaded — it holds the latest ${agency} table.`);
      }
    } catch (error) {
      handleApiError(error, message);
    } finally {
      setBusy(null);
    }
  };

  const send = async (preview) => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    setBusy(preview ? 'preview' : 'import');
    try {
      const { data } = await contributionTableApi.import({
        file: values.file[0].originFileObj,
        agency: values.agency,
        effective_date: values.effective_date.format('YYYY-MM-DD'),
        reference: values.reference?.trim() || null,
        remarks: values.remarks?.trim() || null,
        preview,
      });
      if (preview) {
        setPlan(data.plan);
        setChangesOnly(data.plan.summary.same < data.plan.rows.length);
      } else {
        message.success(data.message);
        onImported(values.agency);
      }
    } catch (error) {
      setPlan(null);
      applyFormErrors(error, form, message, handleApiError);
    } finally {
      setBusy(null);
    }
  };

  const columns = [
    { title: 'Status', dataIndex: 'status', width: 95, fixed: 'left', render: (v) => <Tag color={STATUS[v].color}>{STATUS[v].label}</Tag> },
    ...fields.map((f) => ({
      title: FIELD_LABELS[agency]?.[f] || f,
      dataIndex: f,
      align: 'right',
      render: (v, r) => {
        const changed = Object.prototype.hasOwnProperty.call(r.previous || {}, f);
        return changed ? (
          <div>
            <strong>{cell(f, v)}</strong>
            <div style={{ fontSize: 12, color: '#8c8c8c' }}>{`was ${cell(f, r.previous[f])}`}</div>
          </div>
        ) : cell(f, v);
      },
      onCell: (r) => (Object.prototype.hasOwnProperty.call(r.previous || {}, f) ? { style: { background: 'rgba(82, 196, 26, 0.08)' } } : {}),
    })),
  ];

  const shown = plan ? plan.rows.filter((r) => !changesOnly || r.status !== 'same') : [];
  const s = plan?.summary;
  const dayBefore = plan ? dayjs(plan.effective_date).subtract(1, 'day').format('YYYY-MM-DD') : null;

  return (
    <Modal
      keyboard={false}
      open={open}
      title='Import Contribution Table'
      onCancel={onClose}
      afterOpenChange={handleAfterOpenChange}
      destroyOnHidden
      width={{ xs: '100%', sm: '95%', lg: 1000 }}
      footer={(
        <Space wrap>
          <Button onClick={onClose}>Cancel</Button>
          <Button icon={<EyeOutlined />} loading={busy === 'preview'} onClick={() => send(true)}>Preview</Button>
          {plan?.mode === 'replace' ? (
            <Popconfirm
              title={`Replace the ${plan.replaces.rows} brackets?`}
              description={`The ${plan.agency} table effective ${formatDate(plan.effective_date)} gets the brackets of this file.`}
              okText='Replace'
              onConfirm={() => send(false)}
            >
              <Button type='primary' icon={<UploadOutlined />} loading={busy === 'import'}>Import</Button>
            </Popconfirm>
          ) : (
            <Button type='primary' icon={<UploadOutlined />} disabled={!plan} loading={busy === 'import'} onClick={() => send(false)}>Import</Button>
          )}
        </Space>
      )}
    >
      <Form form={form} layout='vertical' onValuesChange={() => setPlan(null)}>
        <Alert
          type='info'
          showIcon
          style={{ marginBottom: 16 }}
          title='1. Download the template — it holds the latest table. 2. Change the numbers the new circular changes. 3. Upload it with the date it takes effect, Preview, then Import.'
        />
        <Space wrap align='start' style={{ width: '100%' }} size={[16, 0]}>
          <Form.Item name='agency' label='Agency' rules={[{ required: true, message: 'Choose the agency' }]}>
            <Select style={{ width: 160 }} options={agencies.map((a) => ({ value: a, label: a }))} />
          </Form.Item>
          <Form.Item label=' ' colon={false}>
            <Button icon={<DownloadOutlined />} loading={busy === 'download'} onClick={download}>
              {`Download ${agency} Template`}
            </Button>
          </Form.Item>
        </Space>
        <Space wrap align='start' style={{ width: '100%' }} size={[16, 0]}>
          <Form.Item
            name='effective_date'
            label='Effective Date'
            extra='In force from this date until the next version.'
            rules={[{ required: true, message: 'Effective date is required' }]}
          >
            <DatePicker format={DISPLAY_DATE_FORMAT} style={{ width: 200 }} />
          </Form.Item>
          <Form.Item name='reference' label='Reference' style={{ minWidth: 280 }}>
            <Input maxLength={255} placeholder='e.g. circular no.' />
          </Form.Item>
        </Space>
        <Form.Item name='remarks' label='Remarks'>
          <Input.TextArea rows={2} maxLength={1000} />
        </Form.Item>
        <Form.Item
          name='file'
          label='Filled-in Template'
          valuePropName='fileList'
          getValueFromEvent={(e) => (Array.isArray(e) ? e : e?.fileList)}
          rules={[{ required: true, message: 'Choose the filled-in template' }]}
        >
          <Upload beforeUpload={() => false} maxCount={1} accept='.xls,.xlsx'>
            <Button icon={<UploadOutlined />}>Select File</Button>
          </Upload>
        </Form.Item>
      </Form>

      {plan && (
        <>
          <Typography.Title level={5}>Preview</Typography.Title>
          {plan.mode === 'replace' ? (
            <Alert
              type='warning'
              showIcon
              style={{ marginBottom: 8 }}
              title={`Replaces the ${plan.replaces.rows} brackets of the ${plan.agency} table effective ${formatDate(plan.effective_date)}${plan.replaces.reference ? ` (${plan.replaces.reference})` : ''}.`}
            />
          ) : (
            <Alert
              type='success'
              showIcon
              style={{ marginBottom: 8 }}
              title={`Adds a new ${plan.agency} version effective ${formatDate(plan.effective_date)}${plan.until ? `, in force until ${formatDate(plan.until)}` : ''}.`}
              description={plan.compare_to
                ? `The ${formatDate(plan.compare_to.effective_date)} version stays in force until ${formatDate(dayBefore)}.`
                : `It is the first ${plan.agency} table.`}
            />
          )}
          {plan.retroactive && (
            <Alert
              type='warning'
              showIcon
              style={{ marginBottom: 8 }}
              title={`The effective date is before today — computations for dates from ${formatDate(plan.effective_date)} will use this table.`}
            />
          )}
          <Space wrap style={{ margin: '8px 0', width: '100%', justifyContent: 'space-between' }}>
            <Space wrap size={[6, 6]}>
              <Typography.Text type='secondary'>
                {plan.compare_to
                  ? `${plan.rows.length} brackets, compared with the ${formatDate(plan.compare_to.effective_date)} version:`
                  : `${plan.rows.length} brackets:`}
              </Typography.Text>
              {s.new > 0 && <Tag color='blue'>{`${s.new} new`}</Tag>}
              {s.changed > 0 && <Tag color='gold'>{`${s.changed} changed`}</Tag>}
              {s.same > 0 && <Tag>{`${s.same} same`}</Tag>}
              {s.removed > 0 && <Tag color='red'>{`${s.removed} removed`}</Tag>}
            </Space>
            {s.same > 0 && s.same < plan.rows.length && (
              <Checkbox checked={changesOnly} onChange={(e) => setChangesOnly(e.target.checked)}>Show changes only</Checkbox>
            )}
          </Space>
          <Table
            rowKey='range_from'
            size='small'
            bordered
            columns={columns}
            dataSource={shown}
            pagination={false}
            scroll={{ x: 'max-content', y: 320 }}
            locale={{ emptyText: 'Every bracket is the same as before' }}
          />
          {plan.removed.length > 0 && (
            <>
              <Typography.Text strong style={{ display: 'block', marginTop: 12 }}>
                {`Removed — in the ${formatDate(plan.compare_to.effective_date)} version, not in this file`}
              </Typography.Text>
              <Table
                rowKey='range_from'
                size='small'
                bordered
                style={{ marginTop: 6 }}
                columns={fields.map((f) => ({ title: FIELD_LABELS[agency]?.[f] || f, dataIndex: f, align: 'right', render: (v) => cell(f, v) }))}
                dataSource={plan.removed}
                pagination={false}
                scroll={{ x: 'max-content' }}
                onRow={() => ({ style: { background: 'rgba(255, 77, 79, 0.06)' } })}
              />
            </>
          )}
        </>
      )}
    </Modal>
  );
};

export default ContributionTableImportModal;
