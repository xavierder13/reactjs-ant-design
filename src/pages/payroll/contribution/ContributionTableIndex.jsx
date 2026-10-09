import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Table, Tabs, Tag, Button, Space, Tooltip, Typography, Alert, App } from 'antd';
import { PlusOutlined, ReloadOutlined, UploadOutlined } from '@ant-design/icons';
import useAuth from '../../../hooks/useAuth';
import contributionTableApi from '../../../services/payroll/contributionTableApi';
import handleApiError from '../../../utils/handleApiError';
import { DISPLAY_DATE_FORMAT, formatDate } from '../../../utils/formatDate';
import ExpandIcon from '../../../components/ExpandIcon';
import RecordRowActions from '../../record_management/RecordRowActions';
import { AGENCY_NOTES, FIELD_LABELS, formatCell } from './contributionColumns';
import ContributionTableFormModal from './ContributionTableFormModal';
import ContributionTableImportModal from './ContributionTableImportModal';

// Government contribution / tax tables (SSS, PhilHealth, Pag-IBIG, BIR), one
// tab per agency: each version is in force from its effective date until
// the next one (tagged In Force / Upcoming / Past). Expand a version to see
// its brackets. A new version starts as a copy of the latest one, or comes
// from Excel (Import Version: template → upload with the effective date).
const ContributionTableIndex = () => {
  const { message } = App.useApp();
  const { hasPermission, hasRole } = useAuth();
  const isAdmin   = hasRole('Administrator');
  const canCreate = isAdmin || hasPermission('contribution-table-create');
  const canEdit   = isAdmin || hasPermission('contribution-table-edit');
  const canDelete = isAdmin || hasPermission('contribution-table-delete');

  const [options, setOptions] = useState({ agencies: [], row_fields: {} });
  const [tables, setTables]   = useState([]);
  const [inForce, setInForce] = useState({});
  const [loading, setLoading] = useState(false);
  const [agency, setAgency]   = useState('SSS');
  const [editing, setEditing] = useState(null); // {} = new version
  const [importing, setImporting] = useState(false);

  const fetchTables = async () => {
    setLoading(true);
    try {
      const { data } = await contributionTableApi.getAll();
      setTables(data.tables);
      setInForce(data.in_force);
    } catch (error) {
      handleApiError(error, message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await contributionTableApi.getOptions();
        setOptions(data);
      } catch (error) {
        handleApiError(error, message);
      }
      await fetchTables();
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const versions = useMemo(() => tables.filter((t) => t.agency === agency), [tables, agency]);
  const fields = options.row_fields[agency] || [];
  const today = dayjs().format('YYYY-MM-DD');

  const remove = async (record) => {
    try {
      const { data } = await contributionTableApi.delete(record.id);
      message.success(data.message);
      fetchTables();
    } catch (error) {
      handleApiError(error, message);
    }
  };

  const statusTag = (record) => {
    if (record.id === inForce[agency]) return <Tag color='green'>In Force</Tag>;
    if (record.effective_date > today) return <Tag color='blue'>Upcoming</Tag>;
    return <Tag>Past</Tag>;
  };

  const columns = [
    { title: 'Effective Date', dataIndex: 'effective_date', width: 140, render: (v) => formatDate(v) },
    { title: 'Status', key: 'status', width: 110, render: (_, r) => statusTag(r) },
    { title: 'Reference', dataIndex: 'reference', render: (v) => v || '-' },
    { title: 'Brackets', key: 'brackets', width: 100, render: (_, r) => r.rows.length },
    {
      title: 'Last Saved',
      key: 'saved',
      width: 190,
      render: (_, r) => (
        <div>
          <div>{r.updater?.name || 'Seeded'}</div>
          <Typography.Text type='secondary' style={{ fontSize: 12 }}>{dayjs(r.updated_at).format(`${DISPLAY_DATE_FORMAT} hh:mm A`)}</Typography.Text>
        </div>
      ),
    },
  ];
  if (canEdit || canDelete) {
    columns.push({
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_, r) => (
        <RecordRowActions
          canEdit={canEdit}
          canDelete={canDelete}
          onEdit={() => setEditing(r)}
          onDelete={() => remove(r)}
          deleteTitle={`Delete this ${agency} table?`}
          deleteDescription='Payroll falls back to the version before it for these dates.'
        />
      ),
    });
  }

  const bracketColumns = fields.map((f) => ({
    title: FIELD_LABELS[agency]?.[f] || f,
    dataIndex: f,
    align: 'right',
    render: (v) => (f === 'range_to' && (v === null || v === undefined) ? 'and above' : formatCell(f, v)),
  }));

  return (
    <div>
      <Tabs
        activeKey={agency}
        onChange={setAgency}
        items={(options.agencies.length ? options.agencies : ['SSS', 'PhilHealth', 'Pag-IBIG', 'BIR']).map((a) => ({ key: a, label: a }))}
        tabBarExtraContent={(
          <Space wrap>
            <Button icon={<ReloadOutlined />} onClick={fetchTables} loading={loading}>Refresh</Button>
            {canCreate && (
              <Button icon={<UploadOutlined />} onClick={() => setImporting(true)} disabled={!fields.length}>
                Import Version
              </Button>
            )}
            {canCreate && (
              <Tooltip title={versions.length ? 'Starts as a copy of the latest version' : undefined}>
                <Button type='primary' icon={<PlusOutlined />} onClick={() => setEditing({})} disabled={!fields.length}>
                  New Version
                </Button>
              </Tooltip>
            )}
          </Space>
        )}
      />
      <Alert type='info' showIcon style={{ marginBottom: 12 }} title={AGENCY_NOTES[agency]} />
      <Table
        rowKey='id'
        size='small'
        columns={columns}
        dataSource={versions}
        loading={loading}
        pagination={false}
        scroll={{ x: 760 }}
        locale={{ emptyText: `No ${agency} table saved yet` }}
        expandable={{
          expandIcon: (props) => <ExpandIcon {...props} />,
          expandedRowRender: (r) => (
            <Table
              rowKey='id'
              size='small'
              columns={bracketColumns}
              dataSource={r.rows}
              pagination={false}
              scroll={{ x: fields.length * 120, y: 360 }}
            />
          ),
        }}
      />
      <ContributionTableFormModal
        open={!!editing}
        agency={agency}
        table={editing?.id ? editing : null}
        copyFrom={versions[0]}
        fields={fields}
        onClose={() => setEditing(null)}
        onSaved={() => { setEditing(null); fetchTables(); }}
      />
      <ContributionTableImportModal
        open={importing}
        agency={agency}
        agencies={options.agencies}
        rowFields={options.row_fields}
        onClose={() => setImporting(false)}
        onImported={(a) => { setImporting(false); setAgency(a); fetchTables(); }}
      />
    </div>
  );
};

export default ContributionTableIndex;
