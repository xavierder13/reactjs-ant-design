import { useEffect, useState } from 'react';
import { Table, Button, Tooltip, Alert, App } from 'antd';
import { EyeOutlined, ReloadOutlined } from '@ant-design/icons';
import myPayslipApi from '../../../services/payroll/myPayslipApi';
import handleApiError from '../../../utils/handleApiError';
import { formatDate } from '../../../utils/formatDate';
import { tablePagination } from '../../../utils/tablePagination';
import { cutoffLabel, peso } from '../payrollHelpers';
import PayslipModal from '../run/PayslipModal';

// My Payslips (/my-payslips, user menu — any signed-in user): the payslips of
// the employee linked to the account, from approved payrolls only, newest
// first; View opens the payslip (Print for a copy).
const MyPayslipsIndex = () => {
  const { message } = App.useApp();
  const [data, setData] = useState({ linked: true, payslips: [] });
  const [loading, setLoading] = useState(false);
  const [payslip, setPayslip] = useState(null);

  const fetchPayslips = async () => {
    setLoading(true);
    try {
      const { data: res } = await myPayslipApi.getAll();
      setData(res);
    } catch (error) {
      handleApiError(error, message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const load = async () => { await fetchPayslips(); };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const columns = [
    { title: 'Cut-off', key: 'cutoff', render: (_, r) => cutoffLabel(r.cutoff) },
    { title: 'Pay Date', key: 'pay', width: 120, render: (_, r) => (r.cutoff?.pay_date ? formatDate(r.cutoff.pay_date) : '—') },
    { title: 'Gross', dataIndex: 'gross_pay', width: 130, align: 'right', render: peso },
    { title: 'Deductions', dataIndex: 'total_deductions', width: 130, align: 'right', render: peso },
    { title: 'Net Pay', dataIndex: 'net_pay', width: 140, align: 'right', render: (v) => <strong>{peso(v)}</strong> },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      fixed: 'right',
      render: (_, r) => (
        <Tooltip title='View payslip'>
          <Button color='blue' variant='outlined' size='small' icon={<EyeOutlined />} onClick={() => setPayslip({ id: r.id, full_name: r.cutoff?.code })} />
        </Tooltip>
      ),
    },
  ];

  return (
    <div>
      {!data.linked && (
        <Alert type='info' showIcon style={{ marginBottom: 12 }} title='Your account is not linked to an employee record — ask HR to link it to see your payslips.' />
      )}
      <div style={{ marginBottom: 12, textAlign: 'right' }}>
        <Button icon={<ReloadOutlined />} onClick={fetchPayslips} loading={loading}>Refresh</Button>
      </div>
      <Table
        rowKey='id'
        size='small'
        columns={columns}
        dataSource={data.payslips}
        loading={loading}
        scroll={{ x: 760 }}
        pagination={tablePagination(10)}
        locale={{ emptyText: 'No payslips yet — they appear once a payroll is approved' }}
      />
      <PayslipModal target={payslip} onClose={() => setPayslip(null)} loadPayslip={myPayslipApi.show} selfService />
    </div>
  );
};

export default MyPayslipsIndex;
