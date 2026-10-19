import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import {
  Modal, Descriptions, Tag, Tabs, Table, Button, Space, Spin, Form, DatePicker, AutoComplete, InputNumber, Input, Row, Col, Popconfirm, Typography, App,
} from 'antd';
import companyAssetApi from '../../services/company_asset/companyAssetApi';
import handleApiError from '../../utils/handleApiError';
import { applyLeaveErrors } from '../leave/leaveHelpers';
import { DISPLAY_DATE_FORMAT, formatDate } from '../../utils/formatDate';
import { peso, pesoInputProps } from '../payroll/payrollHelpers';
import { ASSET_STATUS_COLORS, MAINTENANCE_TYPES, assignedTo, fullName } from './companyAssetHelpers';

const when = (v) => (v ? dayjs(v).format(`${DISPLAY_DATE_FORMAT} hh:mm A`) : '—');

// One asset (fetched fresh): its details and book value, the assignment
// history (who / where, from – to) and the maintenance log (add an entry
// with company-asset-maintenance). Footer actions by permission and state:
// Assign / Reassign, Return, Dispose. `onChanged` after any change.
// `reloadKey`: bumped by the page after an Assign / Dispose done over it.
const AssetDetailsModal = ({ assetId, can, reloadKey, onClose, onAssign, onDispose, onChanged }) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [asset, setAsset] = useState(null);
  const [history, setHistory] = useState([]);
  const [logs, setLogs] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [{ data: a }, { data: h }] = await Promise.all([companyAssetApi.getById(assetId), companyAssetApi.history(assetId)]);
    setAsset(a.company_asset);
    setHistory(h.assignment_history);
    if (can.maintenance) setLogs((await companyAssetApi.maintenanceLogs(assetId)).data.maintenance_logs);
  };

  useEffect(() => {
    if (!reloadKey || !assetId) return;
    const run = async () => {
      try { await load(); } catch (error) { handleApiError(error, message); }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadKey]);

  const handleAfterOpenChange = async (isOpen) => {
    form.resetFields();
    if (!isOpen) { setAsset(null); setHistory([]); setLogs(null); return; }
    try {
      await load();
    } catch (error) {
      handleApiError(error, message);
      onClose();
    }
  };

  const returnAsset = async () => {
    try {
      await companyAssetApi.returnAsset(asset.id, { remarks: null });
      message.success('Asset has been returned.');
      await load();
      onChanged();
    } catch (error) {
      handleApiError(error, message);
    }
  };

  const addLog = async () => {
    let v;
    try {
      v = await form.validateFields();
    } catch {
      return;
    }
    setSaving(true);
    try {
      await companyAssetApi.addMaintenanceLog(asset.id, {
        maintenance_date: v.maintenance_date.format('YYYY-MM-DD'), type: v.type || null, cost: v.cost ?? null, vendor: v.vendor || null, notes: v.notes || null,
      });
      message.success('Maintenance log has been added.');
      form.resetFields();
      await load();
    } catch (error) {
      applyLeaveErrors(error, form, message, handleApiError);
    } finally {
      setSaving(false);
    }
  };

  const disposed = !!asset?.disposed_at;

  const historyColumns = [
    { title: 'Assigned To', key: 'to', render: (_, h) => <><Tag>{h.assignment_type}</Tag>{h.assignment_type === 'Employee' ? `${h.employee?.employee_code || ''} · ${fullName(h.employee)}` : [h.location, h.branch?.name, h.department?.name].filter(Boolean).join(' · ')}</> },
    { title: 'From', dataIndex: 'assigned_at', width: 170, render: when },
    { title: 'To', dataIndex: 'unassigned_at', width: 170, render: (v) => (v ? when(v) : <Tag color='green'>Current</Tag>) },
    { title: 'Remarks', dataIndex: 'remarks', render: (v) => v || '—' },
    { title: 'By', key: 'by', width: 140, render: (_, h) => h.user?.name || '—' },
  ];
  const logColumns = [
    { title: 'Date', dataIndex: 'maintenance_date', width: 110, render: (d) => formatDate(d) },
    { title: 'Type', dataIndex: 'type', width: 120, render: (v) => v || '—' },
    { title: 'Cost', dataIndex: 'cost', width: 110, align: 'right', render: (v) => (v === null ? '—' : peso(v)) },
    { title: 'Vendor', dataIndex: 'vendor', render: (v) => v || '—' },
    { title: 'Notes', dataIndex: 'notes', render: (v) => v || '—' },
    { title: 'By', key: 'by', width: 130, render: (_, l) => l.user?.name || '—' },
  ];

  return (
    <Modal
      keyboard={false}
      open={!!assetId}
      title={asset ? `${asset.asset_tag} — ${asset.name}` : 'Asset'}
      onCancel={onClose}
      afterOpenChange={handleAfterOpenChange}
      destroyOnHidden
      width={{ xs: '100%', sm: '95%', lg: 960 }}
      footer={asset ? (
        <Space wrap>
          <Button onClick={onClose}>Close</Button>
          {can.dispose && !disposed && <Button danger onClick={() => onDispose(asset)}>Dispose</Button>}
          {can.assign && !disposed && asset.assignment_type && (
            <Popconfirm title='Return this asset?' description='Closes its current assignment.' onConfirm={returnAsset}>
              <Button color='orange' variant='outlined'>Return</Button>
            </Popconfirm>
          )}
          {can.assign && !disposed && <Button type='primary' onClick={() => onAssign(asset)}>{asset.assignment_type ? 'Reassign' : 'Assign'}</Button>}
        </Space>
      ) : null}
    >
      {!asset ? <Spin style={{ display: 'block', margin: '32px auto' }} /> : (
        <>
          <Descriptions
            size='small'
            bordered
            column={{ xs: 1, sm: 2 }}
            items={[
              { key: 'status', label: 'Status', children: <Tag color={ASSET_STATUS_COLORS[asset.status]}>{asset.status}</Tag> },
              { key: 'category', label: 'Category', children: asset.asset_category?.name || '—' },
              { key: 'assigned', label: 'Assigned To', children: assignedTo(asset) ? <>{assignedTo(asset)}{asset.date_assigned && <Typography.Text type='secondary'>{` · since ${formatDate(asset.date_assigned)}`}</Typography.Text>}</> : 'Not assigned' },
              { key: 'bms', label: 'Brand / Model / Serial', children: [asset.brand, asset.model, asset.serial_number].filter(Boolean).join(' · ') || '—' },
              { key: 'acquired', label: 'Acquired', children: [formatDate(asset.date_acquired, ''), asset.vendor].filter(Boolean).join(' · ') || '—' },
              { key: 'cost', label: 'Cost', children: asset.cost === null ? '—' : peso(asset.cost) },
              { key: 'life', label: 'Useful Life / Salvage', children: asset.useful_life_months ? `${asset.useful_life_months} months · ${peso(asset.salvage_value || 0)}` : '—' },
              { key: 'book', label: 'Book Value (today)', children: asset.book_value === null ? '—' : <strong>{peso(asset.book_value)}</strong> },
              { key: 'warranty', label: 'Warranty Until', children: formatDate(asset.warranty_expiry) },
              { key: 'remarks', label: 'Remarks', children: asset.remarks || '—' },
              ...(disposed ? [{ key: 'disposed', label: 'Disposed', span: 'filled', children: `${formatDate(asset.disposed_at)} — ${asset.disposal_reason}${asset.approved_by_name ? ` (approved by ${asset.approved_by_name})` : ''}` }] : []),
            ]}
          />
          <Tabs
            style={{ marginTop: 12 }}
            items={[
              {
                key: 'history',
                label: `Assignment History (${history.length})`,
                children: <Table rowKey='id' size='small' columns={historyColumns} dataSource={history} pagination={false} scroll={{ x: 760 }} />,
              },
              ...(can.maintenance ? [{
                key: 'maintenance',
                label: `Maintenance Log (${logs?.length || 0})`,
                children: (
                  <>
                    <Table rowKey='id' size='small' columns={logColumns} dataSource={logs || []} pagination={false} scroll={{ x: 760 }} />
                    {!disposed && (
                      <Form form={form} layout='vertical' style={{ marginTop: 12 }}>
                        <Row gutter={12}>
                          <Col xs={12} sm={5}>
                            <Form.Item name='maintenance_date' label='Date' rules={[{ required: true, message: 'Maintenance Date is required.' }]}>
                              <DatePicker format={DISPLAY_DATE_FORMAT} style={{ width: '100%' }} />
                            </Form.Item>
                          </Col>
                          <Col xs={12} sm={5}>
                            <Form.Item name='type' label='Type'>
                              <AutoComplete options={MAINTENANCE_TYPES.map((t) => ({ value: t }))} maxLength={100} />
                            </Form.Item>
                          </Col>
                          <Col xs={12} sm={5}><Form.Item name='cost' label='Cost'><InputNumber {...pesoInputProps} /></Form.Item></Col>
                          <Col xs={12} sm={9}><Form.Item name='vendor' label='Vendor'><Input maxLength={255} /></Form.Item></Col>
                          <Col xs={24} sm={19}><Form.Item name='notes' label='Notes'><Input /></Form.Item></Col>
                          <Col xs={24} sm={5} style={{ display: 'flex', alignItems: 'flex-end' }}>
                            <Form.Item style={{ width: '100%' }}><Button block loading={saving} onClick={addLog}>Add Entry</Button></Form.Item>
                          </Col>
                        </Row>
                      </Form>
                    )}
                  </>
                ),
              }] : []),
            ]}
          />
        </>
      )}
    </Modal>
  );
};

export default AssetDetailsModal;
