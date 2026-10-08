import { useState } from 'react';
import dayjs from 'dayjs';
import { Modal, Timeline, Tag, Typography, Spin, App } from 'antd';
import shiftAssignmentApi from '../../services/shift/shiftAssignmentApi';
import handleApiError from '../../utils/handleApiError';
import { formatDate, DISPLAY_DATE_FORMAT } from '../../utils/formatDate';
import { patternSummary } from './shiftHelpers';

const ACTION_COLORS = { Created: 'green', Updated: 'blue', Cancelled: 'red' };

// Every revision of one shifting: what it was after each change (period,
// shift and its weekly pattern at that time, relieving), who changed it,
// when and why.
const ShiftHistoryModal = ({ assignment, onClose }) => {
  const { message } = App.useApp();
  const [revisions, setRevisions] = useState(null);

  const handleAfterOpenChange = async (isOpen) => {
    if (!isOpen) { setRevisions(null); return; }
    try {
      const { data } = await shiftAssignmentApi.history(assignment.id);
      setRevisions(data.revisions);
    } catch (error) {
      handleApiError(error, message);
      onClose();
    }
  };

  return (
    <Modal
      open={!!assignment}
      title={assignment ? `Shifting History — ${assignment.employee?.full_name}` : ''}
      onCancel={onClose}
      footer={null}
      afterOpenChange={handleAfterOpenChange}
      destroyOnHidden
      width={680}
    >
      {!revisions ? <Spin style={{ display: 'block', margin: '32px auto' }} /> : (
        <Timeline
          items={revisions.map((r) => ({
            color: ACTION_COLORS[r.action],
            content: (
              <div>
                <Tag color={ACTION_COLORS[r.action]}>{r.action}</Tag>
                <Typography.Text type='secondary'>{`${dayjs(r.created_at).format(`${DISPLAY_DATE_FORMAT} HH:mm`)} · ${r.changer?.name || '—'}`}</Typography.Text>
                <div>
                  <Typography.Text strong>{r.snapshot.shift?.code}</Typography.Text>
                  {` ${formatDate(r.snapshot.date_from)} – ${formatDate(r.snapshot.date_to)}`}
                </div>
                {r.snapshot.shift?.days && <div style={{ fontSize: 12 }}>{patternSummary(r.snapshot.shift.days)}</div>}
                {r.remarks && <div><Typography.Text italic>{r.remarks}</Typography.Text></div>}
              </div>
            ),
          }))}
        />
      )}
    </Modal>
  );
};

export default ShiftHistoryModal;
