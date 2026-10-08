import { useState } from 'react';
import dayjs from 'dayjs';
import { Modal, Form, Input, Select, DatePicker, Switch, Transfer, Button, Space, Row, Col, App } from 'antd';
import holidayCalendarApi from '../../../services/record_management/holidayCalendarApi';
import saveRecord from '../saveRecord';
import { DISPLAY_DATE_FORMAT } from '../../../utils/formatDate';
import { HOLIDAY_TYPES, holidayType } from './holidayTypes';

// Create/edit a holiday. `holiday` = null for create (`defaultDate` = the
// calendar day clicked, if any), else the list row. Branches via Transfer
// (record-management rule for picking many); a national type pre-selects
// every branch on create and switching to one offers "All branches" — the
// backend stores one row per branch, so a branch added later must be added
// to existing holidays by hand.
const HolidayCalendarFormModal = ({ open, holiday, defaultDate, branches, onClose, onSaved }) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const type = Form.useWatch('holiday_type', form);

  const allIds = branches.map((b) => b.id);
  const branchItems = branches.map((b) => ({ key: b.id, title: b.name, code: b.code }));

  const handleAfterOpenChange = (isOpen) => {
    if (!isOpen) return;
    form.resetFields();
    if (holiday) {
      form.setFieldsValue({
        title: holiday.title,
        holiday_type: holiday.holiday_type,
        date: dayjs(holiday.date),
        status: Number(holiday.status) === 1,
        // unique: holidays edited before the backend fix have duplicate rows
        branches: [...new Set(holiday.holiday_calendar_branches.map((b) => b.branch_id))],
      });
    } else {
      form.setFieldsValue({ date: defaultDate || null, status: true, branches: [] });
    }
  };

  // Create only: picking a national type fills every branch if none are
  // picked yet; never overwrites a selection.
  const handleValuesChange = (changed, all) => {
    if (!holiday && 'holiday_type' in changed && !all.branches?.length && holidayType(changed.holiday_type).allBranches) {
      form.setFieldsValue({ branches: allIds });
    }
  };

  const handleSave = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return; // AntD shows inline field errors
    }

    const payload = {
      title: values.title.trim(),
      holiday_type: values.holiday_type,
      date: values.date.format('YYYY-MM-DD'),
      status: values.status ? 1 : 0,
      branches: values.branches,
    };

    setSaving(true);
    await saveRecord({
      request: () => (holiday ? holidayCalendarApi.update(holiday.id, payload) : holidayCalendarApi.create(payload)),
      form,
      message,
      onSaved,
      fieldFor: (key) => (key.startsWith('branches') ? 'branches' : key),
    });
    setSaving(false);
  };

  return (
    <Modal
      open={open}
      title={holiday ? 'Edit Holiday' : 'Create Holiday'}
      okText='Save'
      onOk={handleSave}
      confirmLoading={saving}
      onCancel={onClose}
      afterOpenChange={handleAfterOpenChange}
      destroyOnHidden
      width={820}
    >
      <Form form={form} layout='vertical' onValuesChange={handleValuesChange}>
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item name='title' label='Title' rules={[{ required: true, whitespace: true, message: 'Title is required' }]}>
              <Input maxLength={255} placeholder='e.g. Independence Day' />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name='date' label='Date' rules={[{ required: true, message: 'Date is required' }]}>
              <DatePicker format={DISPLAY_DATE_FORMAT} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name='holiday_type'
              label='Holiday Type'
              extra={type && holidayType(type).hint}
              rules={[{ required: true, message: 'Holiday Type is required' }]}
            >
              <Select options={HOLIDAY_TYPES.map((t) => ({ value: t.value, label: t.label }))} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name='status' label='Active' valuePropName='checked' extra='Inactive keeps the record but it no longer counts as a holiday.'>
              <Switch />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item
          label={(
            <Space>
              Branches
              <Button size='small' onClick={() => form.setFieldsValue({ branches: allIds })}>All branches</Button>
              <Button size='small' onClick={() => form.setFieldsValue({ branches: [] })}>Clear</Button>
            </Space>
          )}
          required
        >
          <Form.Item
            name='branches'
            valuePropName='targetKeys'
            noStyle
            rules={[{ required: true, type: 'array', min: 1, message: 'Select at least one branch' }]}
          >
            <Transfer
              dataSource={branchItems}
              titles={['Available Branches', 'Observed by']}
              showSearch
              filterOption={(input, item) => `${item.title} ${item.code || ''}`.toLowerCase().includes(input.toLowerCase())}
              render={(item) => item.title}
              styles={{ section: { width: 'calc(50% - 20px)', height: 320 } }}
            />
          </Form.Item>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default HolidayCalendarFormModal;
