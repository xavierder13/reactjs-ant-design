import { useState } from 'react';
import dayjs from 'dayjs';
import {
  Card, Tag, Space, Button, Input, Table, Tooltip, Popconfirm, Typography, Segmented, Alert, Select, App,
} from 'antd';
import {
  EditOutlined, DeleteOutlined, PlusOutlined, CheckCircleOutlined, UserOutlined,
} from '@ant-design/icons';
import clearanceApi from '../../services/clearance/clearanceApi';
import handleApiError from '../../utils/handleApiError';
import { DISPLAY_DATE_FORMAT } from '../../utils/formatDate';
import { peso } from '../payroll/payrollHelpers';
import { ITEM_STATUS_COLORS, ACCOUNTABILITY_STATUS_COLORS } from './clearanceHelpers';

const SETTLED = ['Deduct from Final Pay', 'Paid', 'Waived'];

// One template component's sign-off, in clearing order: who clears it (the
// in-charge: a fixed person, the Immediate Head or the Branch Manager; HR
// may override), its checklist by category (each line Done / N/A — a
// required line Done or Charged — or Charge: an accountability for the
// unreturned item at its standard charge), remarks, the assets still
// assigned to the employee (asset_source) and what the employee owes. Only
// the current component is cleared (can_sign); a later one waits. The
// in-charge saves, signs off or returns it to an earlier component; Sign
// Off needs every line answered, nothing Unsettled and every listed asset
// returned or charged — the backend enforces the same.
// `onChanged(data)` gets the refreshed clearance payload.
const ClearanceItemCard = ({ item, current, assignees = [], canReturn = false, onChanged, onAccountability, onReturn, onReopen, onRevert }) => {
  const { message } = App.useApp();
  const [checklist, setChecklist] = useState(item.checklist || []);
  const [remarks, setRemarks] = useState(item.remarks || '');
  const [saving, setSaving] = useState(null);
  const editable = item.can_sign;

  const unanswered = checklist.filter((l) => !l.status).length;
  const unsettled = item.accountabilities.filter((a) => a.status === 'Unsettled').length;
  const openAssets = item.assets.filter((a) => !SETTLED.includes(a.accountability_status)).length;

  const assign = async (userId) => {
    setSaving('assign');
    try {
      const { data } = await clearanceApi.assign(item.id, userId ?? null);
      message.success(data.message);
      onChanged(data);
    } catch (error) {
      handleApiError(error, message);
    } finally {
      setSaving(null);
    }
  };

  const setApplicable = async (applies) => {
    setSaving('applicable');
    try {
      const { data } = await clearanceApi.applicable(item.id, applies, null);
      message.success(data.message);
      onChanged(data);
    } catch (error) {
      handleApiError(error, message);
    } finally {
      setSaving(null);
    }
  };

  const save = async (action) => {
    setSaving(action);
    try {
      const { data } = await clearanceApi.sign(action, item.id, { checklist, remarks: remarks || null });
      message.success(data.message);
      onChanged(data);
    } catch (error) {
      handleApiError(error, message);
    } finally {
      setSaving(null);
    }
  };

  const removeAccountability = async (row) => {
    try {
      const { data } = await clearanceApi.deleteAccountability(row.id);
      message.success(data.message);
      onChanged(data);
    } catch (error) {
      handleApiError(error, message);
    }
  };

  const setLine = (index, status) => setChecklist((lines) => lines.map((l, i) => (i === index ? { ...l, status } : l)));

  // lines by category, in checklist order (older clearances: no category)
  const groups = checklist.reduce((acc, line, index) => {
    const last = acc[acc.length - 1];
    if (last && last[0] === (line.category || '')) last[1].push({ line, index });
    else acc.push([line.category || '', [{ line, index }]]);
    return acc;
  }, []);

  // Charge an unreturned line: save this card's answers first (charging
  // reloads the card), then add the accountability with the item's charge.
  const charge = async (line, index) => {
    setSaving(`charge-${index}`);
    try {
      await clearanceApi.sign('save', item.id, { checklist, remarks: remarks || null });
      onAccountability(item, null, null, line);
    } catch (error) {
      handleApiError(error, message);
    } finally {
      setSaving(null);
    }
  };

  const title = (
    <Space wrap>
      <span>{`${item.sequence}. ${item.department_name}`}</span>
      <Tag color={ITEM_STATUS_COLORS[item.status]}>{item.status === 'Not Applicable' ? 'N/A' : item.status}</Tag>
      {item.is_current && <Tag color='processing'>Current</Tag>}
      {item.signer_type && item.signer_type !== 'User' && <Tag>{item.signer_type}</Tag>}
    </Space>
  );

  const extra = item.status === 'Cleared' ? (
    <Space wrap>
      <Typography.Text type='secondary'>
        <CheckCircleOutlined style={{ color: '#389e0d' }} />{' '}
        {`${item.cleared_by || '—'} · ${item.cleared_at ? dayjs(item.cleared_at).format(`${DISPLAY_DATE_FORMAT} hh:mm A`) : ''}`}
      </Typography.Text>
      {item.can_reopen && <Button size='small' color='orange' variant='outlined' onClick={() => onReopen(item)}>Reopen</Button>}
      {item.can_revert && (
        <Tooltip title='Administrator: put this component back to Pending (opens a cleared clearance again)'>
          <Button size='small' color='orange' variant='outlined' onClick={() => onRevert(item)}>Revert</Button>
        </Tooltip>
      )}
    </Space>
  ) : (
    <Space wrap>
      {item.status !== 'Not Applicable' && (
        <Tooltip title={item.signatories.length ? item.signatories.join(', ') : 'No in-charge found — HR clears this component'}>
          <Typography.Text type='secondary' ellipsis style={{ maxWidth: 260 }}>
            <UserOutlined /> {item.assigned_to ? `In-charge: ${item.signatories.join(', ')}` : (item.signatories.length ? item.signatories.join(', ') : 'HR signs')}
          </Typography.Text>
        </Tooltip>
      )}
      {item.can_toggle_applicable && (item.status === 'Not Applicable' ? (
        <Button size='small' loading={saving === 'applicable'} onClick={() => setApplicable(true)}>Applies</Button>
      ) : (
        <Popconfirm title={`${item.department_name} doesn't apply to this employee?`} description='It is skipped: no sign-off needed.' onConfirm={() => setApplicable(false)}>
          <Button size='small' color='orange' variant='outlined' loading={saving === 'applicable'}>Mark N/A</Button>
        </Popconfirm>
      ))}
    </Space>
  );

  // HR: who clears this component on this clearance (none = the template's
  // in-charge / the Immediate Head / the Branch Manager)
  const assignSelect = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
      <Typography.Text strong>In-charge:</Typography.Text>
      <Select
        allowClear
        showSearch={{ optionFilterProp: 'label' }}
        loading={saving === 'assign'}
        value={item.assigned_to}
        onChange={assign}
        placeholder={item.signatories.length ? `Default: ${item.signatories.join(', ')}` : 'Nobody can clear it — assign one'}
        status={!item.assigned_to && !item.signatories.length ? 'error' : undefined}
        options={assignees.map((u) => ({ value: u.id, label: u.name }))}
        style={{ minWidth: 280, flex: '1 1 280px', maxWidth: 420 }}
      />
    </div>
  );

  // a component N/A for this employee: just its title (HR can set it back)
  if (item.status === 'Not Applicable') {
    return (
      <Card size='small' title={title} extra={extra} style={{ marginBottom: 12, opacity: 0.75 }}>
        <Typography.Text type='secondary'>Not applicable to this employee — no sign-off needed.</Typography.Text>
        {item.remarks && <Typography.Paragraph type='secondary' style={{ whiteSpace: 'pre-line', margin: '4px 0 0' }}>{item.remarks}</Typography.Paragraph>}
      </Card>
    );
  }

  // a later component: waits for the current one
  if (item.status === 'Pending' && !item.is_current) {
    return (
      <Card size='small' title={title} extra={extra} style={{ marginBottom: 12, opacity: 0.85 }}>
        {item.can_assign && assignSelect}
        <Typography.Text type='secondary'>{`Waiting — cleared after ${current ? current.department_name : 'the components before it'}.`}</Typography.Text>
        {item.remarks && <Typography.Paragraph type='secondary' style={{ whiteSpace: 'pre-line', margin: '4px 0 0' }}>{item.remarks}</Typography.Paragraph>}
      </Card>
    );
  }

  const accountabilityColumns = [
    { title: 'Accountability', dataIndex: 'description' },
    { title: 'Amount', dataIndex: 'amount', width: 120, align: 'right', render: (v) => peso(v) },
    { title: 'Status', dataIndex: 'status', width: 170, render: (s) => <Tag color={ACCOUNTABILITY_STATUS_COLORS[s]}>{s}</Tag> },
    { title: 'Remarks', dataIndex: 'remarks', ellipsis: true, render: (v) => v || '—' },
    ...(editable ? [{
      title: 'Actions',
      width: 90,
      render: (_, row) => (
        <Space>
          <Tooltip title='Edit'>
            <Button color='green' variant='outlined' icon={<EditOutlined />} size='small' onClick={() => onAccountability(item, row, null)} />
          </Tooltip>
          <Popconfirm title='Remove this accountability?' onConfirm={() => removeAccountability(row)}>
            <Tooltip title='Remove'>
              <Button danger icon={<DeleteOutlined />} size='small' />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    }] : []),
  ];

  const assetColumns = [
    { title: 'Asset Tag', dataIndex: 'asset_tag', width: 150 },
    { title: 'Asset', dataIndex: 'description' },
    { title: 'Book Value', dataIndex: 'book_value', width: 120, align: 'right', render: (v) => (v === null || v === undefined ? '—' : peso(v)) },
    {
      title: 'Clearance',
      key: 'acc',
      width: 190,
      render: (_, a) => (a.accountability_status
        ? <Tag color={ACCOUNTABILITY_STATUS_COLORS[a.accountability_status]}>{a.accountability_status}</Tag>
        : <Tag color='red'>Not returned</Tag>),
    },
    ...(editable ? [{
      title: 'Actions',
      width: 80,
      render: (_, a) => (!a.accountability_status ? (
        <Tooltip title='Add as accountability'>
          <Button color='green' variant='outlined' icon={<PlusOutlined />} size='small' onClick={() => onAccountability(item, null, a)} />
        </Tooltip>
      ) : null),
    }] : []),
  ];

  return (
    <Card size='small' title={title} extra={extra} style={{ marginBottom: 12 }}>
      {item.can_assign && assignSelect}
      {checklist.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          {groups.map(([category, lines]) => (
            <div key={category || '-'} style={{ marginBottom: 6 }}>
              {category && <Typography.Text type='secondary' strong style={{ fontSize: 12, textTransform: 'uppercase' }}>{category}</Typography.Text>}
              {lines.map(({ line, index }) => (
                <div key={`${line.item_id || ''}-${line.item}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '4px 0', borderBottom: '1px dashed #f0f0f0', flexWrap: 'wrap' }}>
                  <span>
                    {line.item}
                    {line.required && <Typography.Text type='danger'> *</Typography.Text>}
                    {line.standard_charge ? <Typography.Text type='secondary' style={{ fontSize: 12 }}>{` · charge ${peso(line.standard_charge)}`}</Typography.Text> : null}
                  </span>
                  {line.status === 'Charged' ? (
                    <Tooltip title='An accountability charges for it — remove that to answer the line again'>
                      <Tag color='purple'>Charged</Tag>
                    </Tooltip>
                  ) : editable ? (
                    <Space size={6}>
                      <Segmented
                        size='small'
                        value={line.status || ''}
                        onChange={(v) => setLine(index, v || null)}
                        options={[
                          { value: '', label: '—' },
                          { value: 'Done', label: 'Done' },
                          ...(line.required ? [] : [{ value: 'N/A', label: 'N/A' }]),
                        ]}
                      />
                      {line.item_id && (
                        <Tooltip title='Not returned — charge it'>
                          <Button size='small' color='purple' variant='outlined' loading={saving === `charge-${index}`} onClick={() => charge(line, index)}>Charge</Button>
                        </Tooltip>
                      )}
                    </Space>
                  ) : (
                    <Tag color={line.status === 'Done' ? 'green' : (line.status ? 'default' : 'gold')}>{line.status || 'Not yet'}</Tag>
                  )}
                </div>
              ))}
            </div>
          ))}
          {checklist.some((l) => l.required) && (
            <Typography.Text type='secondary' style={{ fontSize: 12 }}>
              <Typography.Text type='danger'>*</Typography.Text> required — Done, or charged when not returned
            </Typography.Text>
          )}
        </div>
      )}

      {item.asset_source && (
        <>
          <Typography.Text strong>{`${item.asset_source} still assigned`}</Typography.Text>
          {item.assets.length ? (
            <Table rowKey={(a) => `${a.asset_type}-${a.asset_id}`} size='small' pagination={false} columns={assetColumns} dataSource={item.assets} style={{ margin: '6px 0 12px' }} scroll={{ x: 640 }} />
          ) : (
            <div style={{ margin: '4px 0 12px' }}><Typography.Text type='secondary'>None — nothing to return.</Typography.Text></div>
          )}
        </>
      )}

      <Space style={{ width: '100%', justifyContent: 'space-between' }} wrap>
        <Typography.Text strong>Accountabilities</Typography.Text>
        {editable && <Button size='small' icon={<PlusOutlined />} onClick={() => onAccountability(item, null, null)}>Add</Button>}
      </Space>
      {item.accountabilities.length ? (
        <Table rowKey='id' size='small' pagination={false} columns={accountabilityColumns} dataSource={item.accountabilities} style={{ margin: '6px 0 12px' }} scroll={{ x: 640 }} />
      ) : (
        <div style={{ margin: '4px 0 12px' }}><Typography.Text type='secondary'>None.</Typography.Text></div>
      )}

      {editable ? (
        <>
          <Input.TextArea rows={2} maxLength={2000} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder='Remarks' />
          {(unanswered > 0 || unsettled > 0 || openAssets > 0) && (
            <Alert
              type='warning'
              showIcon
              style={{ marginTop: 8 }}
              title={[
                unanswered ? `${unanswered} checklist line(s) not answered` : null,
                unsettled ? `${unsettled} accountability(ies) unsettled` : null,
                openAssets ? `${openAssets} asset(s) not returned or charged` : null,
              ].filter(Boolean).join(' · ')}
            />
          )}
          <Space style={{ marginTop: 8 }} wrap>
            <Button loading={saving === 'save'} onClick={() => save('save')}>Save</Button>
            <Popconfirm title={`Sign off ${item.department_name}?`} description='It is cleared and the clearance moves to the next component.' onConfirm={() => save('clear')}>
              <Button type='primary' loading={saving === 'clear'}>Sign Off</Button>
            </Popconfirm>
            {canReturn && <Button danger onClick={() => onReturn(item)}>Return to Earlier Component</Button>}
          </Space>
        </>
      ) : (
        item.remarks && <Typography.Paragraph type='secondary' style={{ whiteSpace: 'pre-line', marginBottom: 0 }}>{item.remarks}</Typography.Paragraph>
      )}
    </Card>
  );
};

export default ClearanceItemCard;
