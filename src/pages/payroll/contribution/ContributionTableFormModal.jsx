import { useState } from 'react';
import dayjs from 'dayjs';
import { Modal, Form, Input, InputNumber, DatePicker, Button, Row, Col, Alert, Typography, Tooltip, App } from 'antd';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import contributionTableApi from '../../../services/payroll/contributionTableApi';
import handleApiError from '../../../utils/handleApiError';
import { DISPLAY_DATE_FORMAT } from '../../../utils/formatDate';
import { applyFormErrors, toNumber } from '../payrollHelpers';
import { AGENCY_NOTES, FIELD_LABELS, RATE_FIELDS } from './contributionColumns';

// Create or edit one agency's table version: effective date, reference and
// its brackets (only the agency's columns). A new version starts as a copy
// of `copyFrom` (the latest version) so only the changed numbers are typed.
const ContributionTableFormModal = ({ open, agency, table, copyFrom, fields, onClose, onSaved }) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const columns = fields || [];
  const labels = FIELD_LABELS[agency] || {};
  const source = table || copyFrom;

  const handleAfterOpenChange = (isOpen) => {
    if (!isOpen) return;
    form.resetFields();
    const rows = (source?.rows || []).map((r) => Object.fromEntries(columns.map((f) => [f, toNumber(r[f])])));
    form.setFieldsValue({
      effective_date: table ? dayjs(table.effective_date) : null,
      reference: table?.reference || null,
      remarks: table?.remarks || null,
      rows: rows.length ? rows : [{}],
    });
  };

  const handleSave = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    const payload = {
      effective_date: values.effective_date.format('YYYY-MM-DD'),
      reference: values.reference?.trim() || null,
      remarks: values.remarks?.trim() || null,
      rows: values.rows.map((r) => Object.fromEntries(columns.map((f) => [f, r[f] ?? null]))),
    };
    setSaving(true);
    try {
      const { data } = table
        ? await contributionTableApi.update(table.id, payload)
        : await contributionTableApi.create({ ...payload, agency });
      message.success(data.message);
      onSaved();
    } catch (error) {
      applyFormErrors(error, form, message, handleApiError);
    } finally {
      setSaving(false);
    }
  };

  const span = Math.max(3, Math.floor(22 / Math.max(columns.length, 1)));

  return (
    <Modal
      keyboard={false}
      open={open}
      title={`${table ? 'Edit' : 'New'} ${agency} Table`}
      okText='Save'
      onOk={handleSave}
      onCancel={onClose}
      confirmLoading={saving}
      afterOpenChange={handleAfterOpenChange}
      width={{ xs: '100%', sm: '95%', lg: 960, xl: 1100 }}
      destroyOnHidden
    >
      <Form form={form} layout='vertical'>
        <Alert type='info' showIcon style={{ marginBottom: 16 }} title={AGENCY_NOTES[agency]} />
        <Row gutter={16}>
          <Col xs={24} sm={8}>
            <Form.Item
              name='effective_date'
              label='Effective Date'
              extra='In force from this date until the next version.'
              rules={[{ required: true, message: 'Effective date is required' }]}
            >
              <DatePicker format={DISPLAY_DATE_FORMAT} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={16}>
            <Form.Item name='reference' label='Reference'>
              <Input maxLength={255} placeholder='e.g. circular no.' />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name='remarks' label='Remarks'>
          <Input.TextArea rows={2} maxLength={1000} />
        </Form.Item>

        <Typography.Text strong>Brackets</Typography.Text>
        <div style={{ maxHeight: 400, overflow: 'auto', paddingRight: 4, marginTop: 8 }}>
          {/* column headings (sticky) — the inputs below carry no labels */}
          <Row
            gutter={8}
            wrap={false}
            style={{ position: 'sticky', top: 0, zIndex: 1, background: '#fff', padding: '4px 0', minWidth: columns.length * 110 }}
          >
            {columns.map((f) => (
              <Col key={f} span={span}>
                <Typography.Text type='secondary' style={{ fontSize: 12 }}>{labels[f] || f}</Typography.Text>
              </Col>
            ))}
          </Row>
          <Form.List name='rows'>
            {(rowFields, { add, remove }) => (
              <>
                {rowFields.map(({ key, name }) => (
                  <Row key={key} gutter={8} wrap={false} align='top' style={{ minWidth: columns.length * 110 }}>
                    {columns.map((f) => (
                      <Col key={f} span={span}>
                        <Form.Item name={[name, f]} style={{ marginBottom: 8 }}>
                          <InputNumber
                            min={0}
                            max={RATE_FIELDS.includes(f) ? 100 : undefined}
                            precision={RATE_FIELDS.includes(f) ? 3 : 2}
                            placeholder={f === 'range_to' ? 'and above' : undefined}
                            style={{ width: '100%' }}
                          />
                        </Form.Item>
                      </Col>
                    ))}
                    <Col flex='24px' style={{ paddingTop: 6 }}>
                      {rowFields.length > 1 && (
                        <Tooltip title='Remove line'>
                          <MinusCircleOutlined style={{ color: '#8c8c8c' }} onClick={() => remove(name)} />
                        </Tooltip>
                      )}
                    </Col>
                  </Row>
                ))}
                {agency !== 'PhilHealth' && (
                  <Button type='dashed' block icon={<PlusOutlined />} onClick={() => add({})}>
                    Add Bracket
                  </Button>
                )}
              </>
            )}
          </Form.List>
        </div>
      </Form>
    </Modal>
  );
};

export default ContributionTableFormModal;
