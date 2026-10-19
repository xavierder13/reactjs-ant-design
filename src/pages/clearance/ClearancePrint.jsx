import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Spin, Button, Result } from 'antd';
import { PrinterOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import clearanceApi from '../../services/clearance/clearanceApi';
import addessaLogo from '../../assets/addessa-logo.jpg';
import { peso } from '../payroll/payrollHelpers';
import { statusLabel, separationLabel } from './clearanceHelpers';
import './ClearancePrint.css';

const PRINT_MARKS = { Done: '✓', 'N/A': 'N/A', Charged: 'Charged' };

const formatDate = (value) => (value && !String(value).startsWith('0000') ? dayjs(value).format('MM/DD/YYYY') : '');

// The printed clearance form (/clearances/:id/print), like the MRF print:
// the employee and separation, one row per component with its checklist,
// accountabilities and who signed it when (blank signature line beside it
// for the wet signature), the amounts charged to the final pay, and at the
// bottom of the page four signature blocks: the employee's conforme, HR
// (Verified by), Payroll (Cleared by) and the latest round's final
// approvers (Approved by) — names and dates once done, else blank lines.
// One signature block: the name over the line once the step is done (with
// its date), else a blank line and date for the wet signature.
const SignBlock = ({ label, name, caption, note, date }) => (
  <div className='clr-sign-block'>
    <div className='sign-label'>{label}</div>
    <div className='sign-line'>{name || ''}</div>
    <div className='sign-caption'>{name ? caption : `${caption} — signature over printed name`}</div>
    {note && <div className='sign-caption'>{note}</div>}
    <div className='sign-date'>{date ? `Date: ${formatDate(date)}` : 'Date: ____________________'}</div>
  </div>
);

const ClearancePrint = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: res } = await clearanceApi.show(id);
        setData(res);
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
      <Spin size='large' />
    </div>
  );

  if (!data) return <Result status='404' title='Clearance not found' />;

  const c = data.clearance;
  const deduct = data.items.flatMap((i) => i.accountabilities.filter((a) => a.status === 'Deduct from Final Pay').map((a) => ({ ...a, department: i.department_name })));
  // the final approvals of the latest round (a revert or return starts a new one)
  const history = data.approval?.history || [];
  let lastReset = -1;
  history.forEach((h, i) => { if (h.action !== 'Approved') lastReset = i; });
  const levels = (data.approval?.levels || []).map((l) => l.level);
  const approvals = ['Pending', 'Cleared'].includes(c.status) ? history.slice(lastReset + 1).filter((h) => h.action === 'Approved') : [];

  return (
    <div className='print-wrapper'>
      <div className='no-print' style={{ textAlign: 'right', marginBottom: 16 }}>
        <Button type='primary' icon={<PrinterOutlined />} onClick={() => window.print()}>Print</Button>
      </div>

      <div className='clearance-print'>
        <table className='clr-header-table'>
          <tbody>
            <tr>
              <td className='header-logo'>
                <img src={addessaLogo} alt='Addessa Corporation' className='company-logo' />
              </td>
              <td className='header-brand'>
                <div className='company-name'>ADDESSA CORPORATION</div>
                <div className='form-title'>EMPLOYEE CLEARANCE FORM</div>
              </td>
              <td className='header-no'>
                <div className='no-label'>Clearance No.</div>
                <div className='no-value'>{c.clearance_no}</div>
                <div className='status-value'>{statusLabel(c.status, c.current_level)}</div>
              </td>
            </tr>
          </tbody>
        </table>

        <table className='clr-info-table'>
          <tbody>
            <tr>
              <td className='info-label'>Employee:</td>
              <td className='info-value'>{c.employee ? `${c.employee.full_name} (${c.employee.employee_code})` : ''}</td>
              <td className='info-label'>Position:</td>
              <td className='info-value'>{c.employee?.position?.name || ''}</td>
            </tr>
            <tr>
              <td className='info-label'>Branch / Department:</td>
              <td className='info-value'>{[c.employee?.branch?.name, c.employee?.department?.name].filter(Boolean).join(' / ')}</td>
              <td className='info-label'>Date Employed:</td>
              <td className='info-value'>{formatDate(c.employee?.date_employed)}</td>
            </tr>
            <tr>
              <td className='info-label'>Separation:</td>
              <td className='info-value'>{separationLabel(c)}</td>
              <td className='info-label'>Last Day of Work:</td>
              <td className='info-value'>{formatDate(c.last_day_of_work)}</td>
            </tr>
          </tbody>
        </table>

        <table className='clr-table'>
          <thead>
            <tr>
              <th style={{ width: '18%' }}>Component</th>
              <th>Checklist / Accountabilities</th>
              <th style={{ width: '17%' }}>Cleared By / Date</th>
              <th style={{ width: '17%' }}>Signature</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item) => (
              <tr key={item.id}>
                <td className='dept'>{item.department_name}</td>
                <td>
                  {item.checklist?.map((l, i) => (
                    <div key={`${l.item_id || ''}-${l.item}`}>
                      {l.category && l.category !== item.checklist[i - 1]?.category && <div className='cat'>{l.category}</div>}
                      {`[${PRINT_MARKS[l.status] || ' '}] ${l.item}${l.required ? ' *' : ''}`}
                    </div>
                  ))}
                  {item.accountabilities.map((a) => (
                    <div key={a.id} className='acc'>{`• ${a.description} — ${peso(a.amount)} (${a.status})`}</div>
                  ))}
                  {item.remarks && <div className='remarks'>{item.remarks}</div>}
                </td>
                <td>
                  {item.status === 'Cleared' ? (
                    <>
                      <div>{item.cleared_by}</div>
                      <div>{formatDate(item.cleared_at)}</div>
                    </>
                  ) : <div className='pending'>{item.status === 'Not Applicable' ? 'N/A — not applicable' : 'Pending'}</div>}
                </td>
                <td />
              </tr>
            ))}
          </tbody>
        </table>

        {deduct.length > 0 && (
          <table className='clr-table'>
            <thead>
              <tr><th colSpan={3}>Charged to the Final Pay</th></tr>
            </thead>
            <tbody>
              {deduct.map((a) => (
                <tr key={a.id}>
                  <td style={{ width: '18%' }}>{a.department}</td>
                  <td>{a.description}</td>
                  <td style={{ width: '17%', textAlign: 'right' }}>{peso(a.amount)}</td>
                </tr>
              ))}
              <tr>
                <td colSpan={2} style={{ textAlign: 'right', fontWeight: 'bold' }}>Total</td>
                <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{peso(data.totals.deduct)}</td>
              </tr>
            </tbody>
          </table>
        )}

        {/* pinned to the bottom of the page (ClearancePrint.css): the
            employee's conforme and each final-approval level of the
            "Clearance" chart (blank lines until it is approved) */}
        <div className='clr-footer' style={{ gridTemplateColumns: `repeat(${Math.min(3, 1 + Math.max(1, levels.length))}, 1fr)` }}>
          <SignBlock label='Conforme:' name={c.employee?.full_name} caption='Employee — signature over printed name' note='I acknowledge the accountabilities above.' />
          {(levels.length ? levels : [1]).map((level) => {
            const d = approvals.find((a) => Number(a.level) === Number(level));
            return (
              <SignBlock
                key={level}
                label='Approved by:'
                name={d?.name}
                caption={`Final Approval${levels.length > 1 ? ` (Level ${level})` : ''}`}
                date={d?.acted_at}
              />
            );
          })}
        </div>

        <div className='printed-on'>{`* required item · Printed ${dayjs().format('MM/DD/YYYY hh:mm A')}`}</div>
      </div>
    </div>
  );
};

export default ClearancePrint;
