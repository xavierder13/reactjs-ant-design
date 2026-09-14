import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Spin, Button, Result } from 'antd';
import { PrinterOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import manpowerRequestApi from '../../../services/manpower_request/manpowerRequestApi';
import addessaLogo from '../../../assets/addessa-logo.jpg';
import './ManpowerRequestPrint.css';

const formatDate = (value) => (value ? dayjs(value).format('MM/DD/YYYY') : '');

const ManpowerRequestPrint = () => {
  const { id } = useParams();
  const [record, setRecord] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [{ data: editData }, { data: historyData }] = await Promise.all([
          manpowerRequestApi.getById(id),
          manpowerRequestApi.approvalHistory(id),
        ]);
        setRecord(editData.manpower_request);
        setHistory(historyData.approval_history || []);
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

  if (!record) return (
    <Result status='404' title='Manpower request not found' />
  );

  const details = record.details || [];

  // Grouped by request type so "Reason for Request" prints once, with each
  // column itemizing every line of that type — not once per line item
  // (which would repeat the whole A/B/C table per line and show two
  // "N/A" columns each time for a multi-item request).
  const replacementLines = details.filter((d) => d.replacement_or_additional === 'Replacement');
  const additionalLines  = details.filter((d) => d.replacement_or_additional === 'Additional');
  const newPositionLines = details.filter((d) => d.replacement_or_additional === 'New Position');

  // Only the actions that actually happened, in order — one row per real
  // approval-chain level, so the printed form reflects the real workflow
  // instead of the paper form's fixed Requested/Reviewed/Approved-by lines.
  const decidedEntries = history.filter((h) => h.action !== 'Pending');

  return (
    <div className='print-wrapper'>

      {/* ── Print Button — hidden when printing ────────────────────────── */}
      <div className='no-print' style={{ textAlign: 'right', marginBottom: 16 }}>
        <Button type='primary' icon={<PrinterOutlined />} onClick={() => window.print()}>
          Print
        </Button>
      </div>

      <div className='mrf-print'>

        {/* Header */}
        <table className='mrf-header-table'>
          <tbody>
            <tr>
              <td className='header-logo'>
                <img src={addessaLogo} alt='Addessa Corporation' className='company-logo' />
              </td>
              <td className='header-brand'>
                <div className='company-name'>ADDESSA CORPORATION</div>
                <div className='form-title'>MANPOWER REQUEST FORM</div>
              </td>
              <td className='header-mrf-no'>
                <div className='mrf-no-label'>MRF No.</div>
                <div className='mrf-no-value'>{record.mrf_number}</div>
                <div className='mrf-status-value'>{record.status}</div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Date / Branch */}
        <table className='mrf-info-table'>
          <tbody>
            <tr>
              <td className='info-label'>Date Requested:</td>
              <td className='info-value'>{formatDate(record.request_date)}</td>
              <td className='info-label'>Branch:</td>
              <td className='info-value'>{record.branch?.name || '—'}</td>
            </tr>
            <tr>
              <td className='info-label'>Requested By:</td>
              <td className='info-value'>{record.user?.name || '—'}</td>
              <td className='info-label'>Target Hiring Date:</td>
              <td className='info-value'>{formatDate(record.target_hiring_date) || '—'}</td>
            </tr>
            <tr>
              <td className='info-label'>Reason / Justification:</td>
              <td className='info-value' colSpan={3}>{record.reason || '—'}</td>
            </tr>
          </tbody>
        </table>

        {/* Nature of Request — one block per position line, since this
            system supports multiple positions per MRF (the paper form's
            fixed branch position checklist doesn't map onto this app's
            Position dropdown, so each line is listed explicitly instead). */}
        <div className='section-title'>NATURE OF REQUEST</div>
        <table className='mrf-table'>
          <thead>
            <tr>
              <th>Position</th>
              <th>Type</th>
              <th>Employment Type</th>
              <th>No. of Vacancies</th>
              <th>Required Plantilla</th>
              <th>Existing Headcount</th>
            </tr>
          </thead>
          <tbody>
            {details.map((d) => (
              <tr key={d.id}>
                <td>{d.position?.name || '—'}</td>
                <td className='text-center'>{d.replacement_or_additional || '—'}</td>
                <td className='text-center'>{d.employment_type || '—'}</td>
                <td className='text-center'>{d.quantity ?? '—'}</td>
                <td className='text-center'>{d.required_plantilla ?? 'N/A'}</td>
                <td className='text-center'>{d.existing_headcount ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Reason for Request — printed ONCE for the whole request, with
            each column itemizing every line of that type (numbered when
            there's more than one), instead of repeating the full A/B/C
            table per line item. */}
        <div className='section-title'>REASON FOR REQUEST</div>
        <table className='mrf-reason-table'>
          <tbody>
            <tr>
              <td className='reason-col'>
                <div className='reason-col-heading'>A. REPLACEMENT</div>
                {replacementLines.length > 0 ? replacementLines.map((d, i) => (
                  <div key={d.id} className={i > 0 ? 'reason-item reason-item-spaced' : 'reason-item'}>
                    {replacementLines.length > 1 && (
                      <div className='reason-item-heading'>{i + 1}. {d.position?.name || '—'}</div>
                    )}
                    <div className='info-line'>
                      <strong>Reason:</strong>{' '}
                      {d.replacement_reason === 'Others'
                        ? (d.replacement_reason_other || 'Others')
                        : (d.replacement_reason || '—')}
                    </div>
                    <div className='info-line'>
                      <strong>Name of Employee:</strong> {d.replacement_employee?.full_name || '—'}
                    </div>
                    <div className='info-line'>
                      <strong>Last Working Day:</strong> {formatDate(d.last_working_day) || '—'}
                    </div>
                  </div>
                )) : <div className='na-text'>N/A</div>}
              </td>
              <td className='reason-col'>
                <div className='reason-col-heading'>B. ADDITIONAL HEADCOUNT</div>
                {additionalLines.length > 0 ? additionalLines.map((d, i) => (
                  <div key={d.id} className={i > 0 ? 'reason-item reason-item-spaced' : 'reason-item'}>
                    {additionalLines.length > 1 && (
                      <div className='reason-item-heading'>{i + 1}. {d.position?.name || '—'}</div>
                    )}
                    <div className='info-line'>
                      <strong>Quantity:</strong> {d.quantity ?? '—'}
                    </div>
                    <div className='info-line'>
                      <strong>Justification:</strong> {record.reason || '—'}
                    </div>
                  </div>
                )) : <div className='na-text'>N/A</div>}
              </td>
              <td className='reason-col'>
                <div className='reason-col-heading'>C. NEW POSITION</div>
                {newPositionLines.length > 0 ? newPositionLines.map((d, i) => (
                  <div key={d.id} className={i > 0 ? 'reason-item reason-item-spaced' : 'reason-item'}>
                    {newPositionLines.length > 1 && (
                      <div className='reason-item-heading'>{i + 1}. {d.position?.name || '—'}</div>
                    )}
                    <div className='info-line'>
                      <strong>Quantity:</strong> {d.quantity ?? '—'}
                    </div>
                    <div className='info-line'>
                      <strong>Justification:</strong> {record.reason || '—'}
                    </div>
                  </div>
                )) : <div className='na-text'>N/A</div>}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Job Specifications, per line item */}
        {details.map((d, idx) => (
          <div key={d.id} className='line-block'>
            <div className='line-block-heading'>
              {d.replacement_or_additional || 'Position'} Item {idx + 1}: {d.position?.name || '—'}
            </div>

            <div className='section-title'>JOB SPECIFICATIONS</div>
            <table className='mrf-info-table'>
              <tbody>
                <tr>
                  <td className='info-label'>Gender:</td>
                  <td className='info-value'>{d.gender || '—'}</td>
                  <td className='info-label'>Age Range:</td>
                  <td className='info-value'>
                    {d.age_min || d.age_max ? `${d.age_min ?? '—'} - ${d.age_max ?? '—'}` : '—'}
                  </td>
                </tr>
                <tr>
                  <td className='info-label'>Work Experience:</td>
                  <td className='info-value'>
                    {d.experience_required === true
                      ? `Required — ${d.experience_years ?? '—'} yr(s)`
                      : d.experience_required === false ? 'Not Required' : '—'}
                  </td>
                  <td className='info-label'>PRC License:</td>
                  <td className='info-value'>
                    {d.prc_license_status === 'Required'
                      ? `Required — ${d.prc_license_type || '—'}`
                      : d.prc_license_status || '—'}
                  </td>
                </tr>
                <tr>
                  <td className='info-label'>Driver&apos;s License:</td>
                  <td className='info-value'>
                    {['Professional', 'Non-Professional'].includes(d.drivers_license_status)
                      ? `${d.drivers_license_status} — Code ${d.drivers_license_code || '—'}`
                      : d.drivers_license_status || '—'}
                  </td>
                  <td className='info-label'>Salary Grade:</td>
                  <td className='info-value'>{d.salary_grade || '—'}</td>
                </tr>
                {(d.qualifications || d.experience || d.education) && (
                  <tr>
                    <td className='info-label'>Qualifications:</td>
                    <td className='info-value' colSpan={3}>
                      {[d.qualifications, d.experience, d.education].filter(Boolean).join(' — ') || '—'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ))}

        {/* Approval — real signatories/dates from the actual approval
            chain, in place of the paper form's fixed blank signature
            lines, since this is a record of what actually happened. */}
        <div className='section-title'>APPROVAL</div>
        <table className='mrf-table'>
          <thead>
            <tr>
              <th style={{ width: 60 }}>Level</th>
              <th>Action</th>
              <th>Name</th>
              <th>Remarks</th>
              <th style={{ width: 140 }}>Date</th>
            </tr>
          </thead>
          <tbody>
            {decidedEntries.length > 0 ? decidedEntries.map((entry, idx) => (
              <tr key={idx}>
                <td className='text-center'>{entry.level}</td>
                <td className='text-center'>{entry.action}</td>
                <td>{entry.approver?.name || '—'}</td>
                <td>{entry.remarks || '—'}</td>
                <td className='text-center'>{entry.created_at ? dayjs(entry.created_at).format('MM/DD/YYYY HH:mm') : '—'}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan={5} className='text-center'>No approval action recorded yet.</td>
              </tr>
            )}
          </tbody>
        </table>

        <table className='mrf-info-table' style={{ marginTop: 4 }}>
          <tbody>
            <tr>
              <td className='info-label'>Submitted:</td>
              <td className='info-value'>{formatDate(record.submitted_at) || '—'}</td>
              <td className='info-label'>Date Approved:</td>
              <td className='info-value'>{formatDate(record.date_approved) || '—'}</td>
            </tr>
          </tbody>
        </table>

        {/* FOR HR USE ONLY — "MRF Received by" stays blank (a physical
            receiving stamp/signature has no system equivalent). "Name of
            Hired Applicant"/"Date Hired" are populated from the real
            hire data recorded via Record Hires on the view page (Approved
            MRFs only) once set — blank until then. A single-position MRF
            keeps the paper form's plain single-row layout; a multi-position
            MRF (multiple Replacement/Additional/New Position items)
            itemizes one hiring row per position instead of one row trying
            to cover all of them. */}
        <div className='section-title'>FOR HR USE ONLY</div>
        <table className='mrf-info-table'>
          <tbody>
            <tr>
              <td className='info-label'>MRF Received by:</td>
              <td className='info-value'>&nbsp;</td>
              <td className='info-label'>Date:</td>
              <td className='info-value'>&nbsp;</td>
            </tr>
            {details.length <= 1 && (
              <tr>
                <td className='info-label'>Name of Hired Applicant:</td>
                <td className='info-value'>{details[0]?.hired_employee?.full_name || ' '}</td>
                <td className='info-label'>Date Hired:</td>
                <td className='info-value'>{formatDate(details[0]?.date_hired) || ' '}</td>
              </tr>
            )}
          </tbody>
        </table>
        {details.length > 1 && (
          <table className='mrf-table' style={{ marginTop: 4 }}>
            <thead>
              <tr>
                <th>Position</th>
                <th>Type</th>
                <th>Name of Hired Applicant</th>
                <th style={{ width: 120 }}>Date Hired</th>
              </tr>
            </thead>
            <tbody>
              {details.map((d) => (
                <tr key={d.id}>
                  <td>{d.position?.name || '—'}</td>
                  <td className='text-center'>{d.replacement_or_additional || '—'}</td>
                  <td>{d.hired_employee?.full_name || ' '}</td>
                  <td>{formatDate(d.date_hired) || ' '}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

      </div>
    </div>
  );
};

export default ManpowerRequestPrint;
