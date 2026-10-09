import dayjs from 'dayjs';
import { Modal, Descriptions, Timeline, Tag, Space, Spin, Typography } from 'antd';
import { ArrowRightOutlined } from '@ant-design/icons';
import { DISPLAY_DATE_FORMAT, formatDate } from '../../utils/formatDate';

const filingTag = (open) => <Tag color={open ? 'green' : 'red'}>{open ? 'Open' : 'Closed'}</Tag>;

// Every switch of one cut-off's filing (vueportal payroll_cutoff_filing_logs,
// newest first from the API — shown oldest first): a summary of the cut-off,
// then each switch as Filing Previous → New, who, when and why. `cutoff`
// and `logs` come together from the page and stay set while the modal
// closes (only `open` turns off), so the content never reads a cleared row.
const CutoffFilingHistoryModal = ({ open, cutoff, logs, onClose }) => {
  const entries = [...(logs || [])].reverse();

  return (
    <Modal
      open={open}
      title={`Filing History — ${cutoff?.code || ''}`}
      footer={null}
      onCancel={onClose}
      destroyOnHidden
      width={{ xs: '100%', sm: '95%', md: 720 }}
    >
      {!logs || !cutoff ? <Spin style={{ display: 'block', margin: '32px auto' }} /> : (
        <>
          <Descriptions
            size='small'
            column={{ xs: 1, sm: 2 }}
            style={{ marginBottom: 16 }}
            items={[
              { key: 'code', label: 'Cut-off', children: cutoff.code },
              { key: 'filing', label: 'Filing Now', children: filingTag(cutoff.filing_open) },
              { key: 'period', label: 'Period', children: `${formatDate(cutoff.date_from)} – ${formatDate(cutoff.date_to)}` },
              { key: 'pay', label: 'Pay Date', children: cutoff.pay_date ? formatDate(cutoff.pay_date) : '—' },
              { key: 'switches', label: 'Switches', children: logs.length },
            ]}
          />
          {!entries.length ? (
            <Typography.Text type='secondary'>Filing has never been switched for this cut-off — it has been open since it was created.</Typography.Text>
          ) : (
            <Timeline
              items={entries.map((l) => ({
                key: l.id,
                color: l.filing_open ? 'green' : 'red',
                content: (
                  <div style={{ marginBottom: 8 }}>
                    <Tag color={l.filing_open ? 'green' : 'red'}>{l.filing_open ? 'Turned ON' : 'Turned OFF'}</Tag>
                    <Typography.Text type='secondary'>
                      {`${dayjs(l.created_at).format(`${DISPLAY_DATE_FORMAT} hh:mm A`)} · ${l.changer?.name || 'System'}`}
                    </Typography.Text>
                    <div style={{ marginTop: 6 }}>
                      <Space size={6}>
                        <Typography.Text type='secondary'>Filing:</Typography.Text>
                        {filingTag(!l.filing_open)}
                        <ArrowRightOutlined style={{ color: '#8c8c8c' }} />
                        {filingTag(l.filing_open)}
                      </Space>
                    </div>
                    <div style={{ marginTop: 4 }}>
                      <Typography.Text type='secondary'>Reason: </Typography.Text>
                      {l.reason ? <Typography.Text italic>{l.reason}</Typography.Text> : <Typography.Text type='secondary'>—</Typography.Text>}
                    </div>
                  </div>
                ),
              }))}
            />
          )}
        </>
      )}
    </Modal>
  );
};

export default CutoffFilingHistoryModal;
