import { useState } from 'react';
import { Modal, Table, Alert, Button, Spin, Typography, App } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import handleApiError from '../../../utils/handleApiError';
import downloadBlobResponse from '../../../utils/downloadBlobResponse';
import { tablePagination } from '../../../utils/tablePagination';
import { peso } from '../payrollHelpers';

// The bank credit preview of a payout (a payroll run's net pay, an approved
// 13th month): who is credited to which account, who has no payroll account
// (paid by cash / check — set it in Contributions → Contribution Profile),
// and the CSV download (approved payouts only). `target` = { title, approved,
// filename, load: () => api (→ { credit, missing, total }), download: () => api };
// kept in the modal's own state so it renders while closing.
const BankFileModal = ({ target, onClose }) => {
  const { message } = App.useApp();
  const [shown, setShown] = useState(null);
  const [data, setData] = useState(null);
  const [downloading, setDownloading] = useState(false);

  const handleAfterOpenChange = async (isOpen) => {
    if (!isOpen) { setData(null); setShown(null); return; }
    setShown(target);
    try {
      const { data: res } = await target.load();
      setData(res);
    } catch (error) {
      handleApiError(error, message);
      onClose();
    }
  };

  const download = async () => {
    setDownloading(true);
    try {
      const response = await shown.download();
      if (await downloadBlobResponse(response, shown.filename, message)) message.success('Bank file downloaded.');
    } catch (error) {
      handleApiError(error, message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Modal
      open={!!target}
      title={(target || shown)?.title}
      onCancel={onClose}
      afterOpenChange={handleAfterOpenChange}
      destroyOnHidden
      width={{ xs: '100%', sm: '95%', lg: 900 }}
      footer={data && shown?.approved ? (
        <Button color='purple' variant='outlined' icon={<DownloadOutlined />} loading={downloading} disabled={!data.credit.length} onClick={download}>
          Download Bank File (CSV)
        </Button>
      ) : null}
    >
      {!data ? <Spin style={{ display: 'block', margin: '32px auto' }} /> : (
        <>
          {!shown?.approved && (
            <Alert type='info' showIcon style={{ marginBottom: 12 }} title='A preview — the bank file can be downloaded once approved.' />
          )}
          {data.missing.length > 0 && (
            <Alert
              type='warning'
              showIcon
              style={{ marginBottom: 12 }}
              title={`${data.missing.length} employee(s) have no payroll bank account — not in the bank file (pay by cash / check)`}
              description={data.missing.map((m) => `${m.full_name} (${peso(m.amount)})`).join(' · ')}
            />
          )}
          <Typography.Paragraph>
            {`${data.credit.length} credit(s), total `}
            <strong>{peso(data.total)}</strong>
          </Typography.Paragraph>
          <Table
            rowKey='employee_id'
            size='small'
            dataSource={data.credit}
            pagination={tablePagination(10)}
            scroll={{ x: 700 }}
            columns={[
              { title: 'Employee', key: 'employee', render: (_, r) => `${r.employee_code} · ${r.full_name}` },
              { title: 'Bank', dataIndex: 'bank_name', width: 110 },
              { title: 'Account No.', dataIndex: 'account_no', width: 150 },
              { title: 'Account Name', dataIndex: 'account_name', width: 200 },
              { title: 'Amount', dataIndex: 'amount', width: 120, align: 'right', render: peso },
            ]}
          />
        </>
      )}
    </Modal>
  );
};

export default BankFileModal;
