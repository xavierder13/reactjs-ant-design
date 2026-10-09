import { useState } from 'react';
import dayjs from 'dayjs';
import { Modal, DatePicker, Space, Button, Table, Alert, App } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import payrollReportApi from '../../../services/payroll/payrollReportApi';
import handleApiError from '../../../utils/handleApiError';
import downloadBlobResponse from '../../../utils/downloadBlobResponse';
import { DISPLAY_DATE_FORMAT } from '../../../utils/formatDate';
import { AMOUNT_KEYS, lineColumns, totalsRow } from '../reports/contributionHistoryColumns';

const thisYear = () => [dayjs().startOf('year'), dayjs()];

// One employee's contributions and tax actually deducted, per cut-off, from
// the APPROVED payslips whose cut-off ends in the dates (default this year)
// — unlike ContributionComputeModal, which only previews a month's
// computation. payroll_report/contribution_history with employee_ids: [id]
// (payroll-report-view). `employee`: { id, label } | null.
const ContributionHistoryModal = ({ employee, onClose }) => {
  const { message } = App.useApp();
  const [dates, setDates] = useState(thisYear);
  const [lines, setLines] = useState(null);
  const [downloading, setDownloading] = useState(false);

  const params = (d = dates) => ({ date_from: d[0].format('YYYY-MM-DD'), date_to: d[1].format('YYYY-MM-DD'), employee_ids: [employee.id] });

  const load = async (d) => {
    setLines(null);
    try {
      const { data } = await payrollReportApi.contributionHistory(params(d));
      setLines(data.employees[0]?.lines || []);
    } catch (error) {
      handleApiError(error, message);
      setLines([]);
    }
  };

  const handleAfterOpenChange = async (isOpen) => {
    if (!isOpen || !employee) return;
    const d = thisYear();
    setDates(d);
    await load(d);
  };

  const download = async () => {
    setDownloading(true);
    try {
      const p = params();
      const response = await payrollReportApi.contributionHistoryDownload(p);
      if (await downloadBlobResponse(response, `Contributions_${employee.label}_${p.date_from}_${p.date_to}.xls`, message)) message.success('Contribution history downloaded.');
    } catch (error) {
      handleApiError(error, message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Modal
      open={!!employee}
      title={`Contribution History — ${employee?.label || ''}`}
      footer={null}
      onCancel={onClose}
      afterOpenChange={handleAfterOpenChange}
      width={1100}
      destroyOnHidden
    >
      <Space wrap style={{ marginBottom: 12, width: '100%', justifyContent: 'space-between' }}>
        <DatePicker.RangePicker
          value={dates}
          format={DISPLAY_DATE_FORMAT}
          allowClear={false}
          onChange={(v) => { if (v?.[0] && v?.[1]) { setDates(v); load(v); } }}
        />
        <Button color='purple' variant='outlined' icon={<DownloadOutlined />} loading={downloading} disabled={!lines?.length} onClick={download}>Download (Excel)</Button>
      </Space>
      {lines && !lines.length && (
        <Alert type='info' showIcon style={{ marginBottom: 12 }} title='No approved payslip in these dates.' />
      )}
      <Table
        rowKey='cutoff'
        size='small'
        bordered
        loading={!lines}
        columns={lineColumns}
        dataSource={lines || []}
        pagination={false}
        scroll={{ x: 1250, y: 420 }}
        summary={() => lines?.length > 1 && totalsRow(lines, 3, AMOUNT_KEYS)}
      />
    </Modal>
  );
};

export default ContributionHistoryModal;
