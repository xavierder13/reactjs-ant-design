import { useState } from 'react';
import {
  Modal, Form, Input, InputNumber, Select, DatePicker, AutoComplete, Row, Col, Divider, App,
} from 'antd';
import companyAssetApi from '../../services/company_asset/companyAssetApi';
import handleApiError from '../../utils/handleApiError';
import { applyLeaveErrors } from '../leave/leaveHelpers';
import { DISPLAY_DATE_FORMAT, toDayjs } from '../../utils/formatDate';
import { pesoInputProps, toNumber } from '../payroll/payrollHelpers';
import { EDITABLE_STATUSES, assignmentPayload } from './companyAssetHelpers';
import AssignmentFields from './AssignmentFields';

// Add (asset = null) or edit an asset's details. The category is typed or
// picked (a new name is added). Add may assign it at once (needs
// company-asset-assign); editing never touches the assignment — that is
// Assign / Return. Cost + useful life (+ salvage) give the straight-line
// book value.
const AssetFormModal = ({ open, asset, options, canAssign, onClose, onSaved }) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const handleAfterOpenChange = (isOpen) => {
    form.resetFields();
    if (!isOpen) return;
    form.setFieldsValue(asset ? {
      name: asset.name,
      asset_category: asset.asset_category?.name,
      brand: asset.brand,
      model: asset.model,
      vendor: asset.vendor,
      serial_number: asset.serial_number,
      date_acquired: toDayjs(asset.date_acquired),
      cost: toNumber(asset.cost),
      warranty_expiry: toDayjs(asset.warranty_expiry),
      useful_life_months: asset.useful_life_months,
      salvage_value: toNumber(asset.salvage_value),
      status: asset.status,
      remarks: asset.remarks,
    } : { status: 'Active', assignment_type: '' });
  };

  const handleSave = async () => {
    let v;
    try {
      v = await form.validateFields();
    } catch {
      return;
    }
    const payload = {
      name: v.name,
      asset_category: v.asset_category,
      brand: v.brand || null,
      model: v.model || null,
      vendor: v.vendor || null,
      serial_number: v.serial_number || null,
      date_acquired: v.date_acquired ? v.date_acquired.format('YYYY-MM-DD') : null,
      cost: v.cost ?? null,
      warranty_expiry: v.warranty_expiry ? v.warranty_expiry.format('YYYY-MM-DD') : null,
      useful_life_months: v.useful_life_months ?? null,
      salvage_value: v.salvage_value ?? null,
      status: v.status,
      remarks: v.remarks || null,
      ...(asset ? {} : assignmentPayload(v)),
    };
    setSaving(true);
    try {
      const { data } = asset ? await companyAssetApi.update(asset.id, payload) : await companyAssetApi.create(payload);
      if (data.success === false) throw Object.assign(new Error(data.message), { response: { status: 422, data } });
      message.success(asset ? 'Asset has been updated.' : 'Asset has been added.');
      onSaved(data.company_asset);
    } catch (error) {
      applyLeaveErrors(error, form, message, handleApiError);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      keyboard={false}
      open={open}
      title={asset ? `Edit ${asset.asset_tag}` : 'Add Asset'}
      okText='Save'
      onOk={handleSave}
      confirmLoading={saving}
      onCancel={onClose}
      afterOpenChange={handleAfterOpenChange}
      destroyOnHidden
      width={{ xs: '100%', sm: '95%', md: 760 }}
    >
      <Form form={form} layout='vertical'>
        <Row gutter={16}>
          <Col xs={24} sm={14}>
            <Form.Item name='name' label='Asset Name' rules={[{ required: true, whitespace: true, message: 'Asset Name is required.' }]}>
              <Input maxLength={255} placeholder='e.g. Office chair, delivery van' />
            </Form.Item>
          </Col>
          <Col xs={24} sm={10}>
            <Form.Item name='asset_category' label='Category' extra='Pick one or type a new category.' rules={[{ required: true, whitespace: true, message: 'Category is required.' }]}>
              <AutoComplete
                options={options.asset_categories.map((c) => ({ value: c.name }))}
                showSearch={{ filterOption: (input, o) => o.value.toLowerCase().includes(input.toLowerCase()) }}
                maxLength={100}
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}><Form.Item name='brand' label='Brand'><Input maxLength={255} /></Form.Item></Col>
          <Col xs={24} sm={8}><Form.Item name='model' label='Model'><Input maxLength={255} /></Form.Item></Col>
          <Col xs={24} sm={8}><Form.Item name='serial_number' label='Serial No.'><Input maxLength={255} /></Form.Item></Col>
        </Row>
        <Divider titlePlacement='start' plain style={{ margin: '4px 0 12px' }}>Acquisition</Divider>
        <Row gutter={16}>
          <Col xs={24} sm={8}><Form.Item name='date_acquired' label='Date Acquired'><DatePicker format={DISPLAY_DATE_FORMAT} style={{ width: '100%' }} /></Form.Item></Col>
          <Col xs={24} sm={8}><Form.Item name='cost' label='Cost'><InputNumber {...pesoInputProps} /></Form.Item></Col>
          <Col xs={24} sm={8}><Form.Item name='vendor' label='Vendor'><Input maxLength={255} /></Form.Item></Col>
          <Col xs={24} sm={8}><Form.Item name='useful_life_months' label='Useful Life (months)'><InputNumber min={1} precision={0} style={{ width: '100%' }} /></Form.Item></Col>
          <Col xs={24} sm={8}><Form.Item name='salvage_value' label='Salvage Value'><InputNumber {...pesoInputProps} /></Form.Item></Col>
          <Col xs={24} sm={8}><Form.Item name='warranty_expiry' label='Warranty Until'><DatePicker format={DISPLAY_DATE_FORMAT} style={{ width: '100%' }} /></Form.Item></Col>
        </Row>
        <Row gutter={16}>
          <Col xs={24} sm={8}>
            <Form.Item name='status' label='Status' extra={asset ? null : 'Disposed is set only by Dispose.'}>
              <Select options={EDITABLE_STATUSES.map((s) => ({ value: s, label: s }))} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={16}><Form.Item name='remarks' label='Remarks'><Input.TextArea rows={1} autoSize={{ minRows: 1, maxRows: 4 }} /></Form.Item></Col>
        </Row>
        {!asset && canAssign && (
          <>
            <Divider titlePlacement='start' plain style={{ margin: '4px 0 12px' }}>Assignment</Divider>
            <AssignmentFields form={form} options={options} allowNone />
          </>
        )}
      </Form>
    </Modal>
  );
};

export default AssetFormModal;
