import { useState } from 'react';
import { Modal, Spin, App } from 'antd';
import dtrApi from '../../../services/payroll/dtrApi';
import handleApiError from '../../../utils/handleApiError';
import DtrDaysTable from '../run/DtrDaysTable';
import DtrSummary from './DtrSummary';


// One employee's DTR for a cut-off (dtr/show): a summary banner (the
// Salary History banner) and every date's schedule, times, status and
// minutes. `target` = { cutoff, employee: { id, … } }; the loaded record is
// kept while the modal closes.
const DtrModal = ({ target, onClose }) => {
  const { message } = App.useApp();
  const [data, setData] = useState(null);

  const handleAfterOpenChange = async (isOpen) => {
    if (!isOpen) { setData(null); return; }
    try {
      const { data: res } = await dtrApi.show({ payroll_cutoff_id: target.cutoff.id, employee_id: target.employee.id });
      setData(res);
    } catch (error) {
      handleApiError(error, message);
      onClose();
    }
  };

  const e = data?.employee;

  return (
    <Modal
      open={!!target}
      title={`Daily Time Record — ${(e || target?.employee)?.full_name || ''}`}
      onCancel={onClose}
      footer={null}
      afterOpenChange={handleAfterOpenChange}
      destroyOnHidden
      // wide: the day table has 12 columns
      width={{ xs: '100%', sm: '96%', xxl: 1600 }}
    >
      {!data ? <Spin style={{ display: 'block', margin: '32px auto' }} /> : (
        <>
          <DtrSummary data={data} />
          <DtrDaysTable days={data.days} />
        </>
      )}
    </Modal>
  );
};

export default DtrModal;
