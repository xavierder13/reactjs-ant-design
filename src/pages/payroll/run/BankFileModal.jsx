import { useState } from 'react';
import { Modal, Table, Alert, Button, Spin, Typography, Card, Select, Space, Tag, App } from 'antd';
import { DownloadOutlined, SaveOutlined } from '@ant-design/icons';
import handleApiError from '../../../utils/handleApiError';
import downloadBlobResponse from '../../../utils/downloadBlobResponse';
import { tablePagination } from '../../../utils/tablePagination';
import { formatDate } from '../../../utils/formatDate';
import { peso } from '../payrollHelpers';

const accountLabel = (a) => (a ? `${a.bank_name || 'Bank'} ${a.account_no}${a.account_name ? ` (${a.account_name})` : ''}` : 'No company account');

// The bank credit preview of a payout (a payroll run's net pay, a 13th
// month): one bank file per company account it is paid from (the default
// for the pay date, or each bank's own account when "match employee bank"
// is on — Payroll Settings → Payroll Accounts), who has no bank account
// (cash / check — Payroll → Bank Accounts), who has a zero or negative net
// (nothing to credit), and each file's CSV (approved payouts only). Until
// approved, a user who may generate it can choose the account and the rule
// (Paid from); an approved payout shows what it kept. `target` = { title,
// approved, filenamePrefix, canChoose, load: () => api, download:
// (sourceId) => api, choose: ({ source_account_id, match_employee_bank }) =>
// api }; kept in the modal's own state so it renders while closing.
const BankFileModal = ({ target, onClose }) => {
  const { message } = App.useApp();
  const [shown, setShown] = useState(null);
  const [data, setData] = useState(null);
  const [downloading, setDownloading] = useState(null); // source_id
  const [choice, setChoice] = useState(null); // { source, match }
  const [saving, setSaving] = useState(false);

  const load = async (t) => {
    const { data: res } = await t.load();
    setData(res);
    setChoice({
      source: res.run?.source_account_id ?? 'auto',
      match: res.run?.match_employee_bank === null || res.run?.match_employee_bank === undefined ? 'settings' : (res.run.match_employee_bank ? 'on' : 'off'),
    });
  };

  const handleAfterOpenChange = async (isOpen) => {
    if (!isOpen) { setData(null); setShown(null); setChoice(null); return; }
    setShown(target);
    try {
      await load(target);
    } catch (error) {
      handleApiError(error, message);
      onClose();
    }
  };

  const download = async (group) => {
    setDownloading(group.source_id);
    try {
      const response = await shown.download(group.source_id);
      const name = `${shown.filenamePrefix}_${group.source?.bank_code || 'NoCompanyAccount'}.csv`;
      if (await downloadBlobResponse(response, name, message)) message.success('Bank file downloaded.');
    } catch (error) {
      handleApiError(error, message);
    } finally {
      setDownloading(null);
    }
  };

  const saveChoice = async () => {
    setSaving(true);
    try {
      const { data: res } = await shown.choose({
        source_account_id: choice.source === 'auto' ? null : choice.source,
        match_employee_bank: choice.match === 'settings' ? null : choice.match === 'on',
      });
      message.success(res.message);
      await load(shown);
    } catch (error) {
      handleApiError(error, message);
    } finally {
      setSaving(false);
    }
  };

  const approved = !!shown?.approved;
  const canChoose = !approved && !!shown?.canChoose && !!shown?.choose;
  const paidFrom = data?.paid_from;

  return (
    <Modal
      keyboard={false}
      open={!!target}
      title={(target || shown)?.title}
      onCancel={onClose}
      afterOpenChange={handleAfterOpenChange}
      destroyOnHidden
      width={{ xs: '100%', sm: '95%', lg: 960 }}
      footer={null}
    >
      {!data ? <Spin style={{ display: 'block', margin: '32px auto' }} /> : (
        <>
          {!approved && (
            <Alert type='info' showIcon style={{ marginBottom: 12 }} title='A preview — the bank files can be downloaded once approved.' />
          )}
          <Card size='small' title='Paid from' style={{ marginBottom: 12 }}>
            {canChoose ? (
              <Space wrap align='center'>
                <Select
                  style={{ width: 360 }}
                  value={choice?.source}
                  onChange={(v) => setChoice((c) => ({ ...c, source: v }))}
                  options={[
                    { value: 'auto', label: 'The default for the pay date' },
                    ...(data.accounts || []).map((a) => ({ value: a.id, label: accountLabel({ ...a, bank_name: a.bank?.name }) })),
                  ]}
                />
                <Select
                  style={{ width: 300 }}
                  value={choice?.match}
                  onChange={(v) => setChoice((c) => ({ ...c, match: v }))}
                  options={[
                    { value: 'settings', label: 'Match employee bank: as in Payroll Settings' },
                    { value: 'on', label: 'Each bank’s employees from our account there' },
                    { value: 'off', label: 'Everyone from the account above' },
                  ]}
                />
                <Button icon={<SaveOutlined />} loading={saving} onClick={saveChoice}>Save</Button>
              </Space>
            ) : null}
            <Typography.Paragraph type='secondary' style={{ margin: canChoose ? '8px 0 0' : 0 }}>
              {`Default: ${accountLabel(paidFrom?.default)}${paidFrom?.chosen ? ' (chosen for this payout)' : ''} · `}
              {paidFrom?.match_employee_bank ? 'each bank’s employees from our account at that bank' : 'everyone from the default'}
              {` · credit date ${formatDate(data.credit_date)}`}
              {approved && paidFrom && ' · kept on approval'}
            </Typography.Paragraph>
          </Card>
          {data.not_positive?.length > 0 && (
            <Alert
              type='error'
              showIcon
              style={{ marginBottom: 12 }}
              title={`${data.not_positive.length} employee(s) have a zero or negative net pay — nothing to credit, not in a bank file`}
              description={data.not_positive.map((m) => `${m.full_name} (${peso(m.amount)})`).join(' · ')}
            />
          )}
          {data.missing.length > 0 && (
            <Alert
              type='warning'
              showIcon
              style={{ marginBottom: 12 }}
              title={`${data.missing.length} employee(s) have no bank account on the credit date — not in a bank file (pay by cash / check, or add it on Payroll → Bank Accounts)`}
              description={data.missing.map((m) => `${m.full_name} (${peso(m.amount)})`).join(' · ')}
            />
          )}
          <Typography.Paragraph>
            {`${data.credit_count} credit(s) in ${data.groups.length} bank file(s), total `}
            <strong>{peso(data.total)}</strong>
          </Typography.Paragraph>
          {data.groups.map((g) => (
            <Card
              key={g.source_id}
              size='small'
              style={{ marginBottom: 12 }}
              title={(
                <Space wrap>
                  {g.source ? `From ${accountLabel(g.source)}` : 'No company account to pay from'}
                  {!g.source && <Tag color='orange'>Add one in Payroll Settings</Tag>}
                </Space>
              )}
              extra={approved && (
                <Button
                  size='small'
                  color='purple'
                  variant='outlined'
                  icon={<DownloadOutlined />}
                  loading={downloading === g.source_id}
                  onClick={() => download(g)}
                >
                  CSV
                </Button>
              )}
            >
              <Typography.Paragraph type='secondary' style={{ marginTop: 0 }}>
                {`${g.credit.length} credit(s), total ${peso(g.total)}`}
              </Typography.Paragraph>
              <Table
                rowKey='employee_id'
                size='small'
                dataSource={g.credit}
                pagination={tablePagination(10)}
                scroll={{ x: 700 }}
                columns={[
                  { title: 'Employee', key: 'employee', render: (_, r) => `${r.employee_code} · ${r.full_name}` },
                  { title: 'Bank', dataIndex: 'bank_name', width: 140 },
                  { title: 'Account No.', dataIndex: 'account_no', width: 150 },
                  { title: 'Account Name', dataIndex: 'account_name', width: 200 },
                  { title: 'Amount', dataIndex: 'amount', width: 120, align: 'right', render: peso },
                ]}
              />
            </Card>
          ))}
        </>
      )}
    </Modal>
  );
};

export default BankFileModal;
