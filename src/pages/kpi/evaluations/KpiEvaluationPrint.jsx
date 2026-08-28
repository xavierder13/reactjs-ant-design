import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Spin, Button } from 'antd';
import { PrinterOutlined } from '@ant-design/icons';
import kpiEvaluationApi from '../../../services/kpi/kpiEvaluationApi';
import dayjs from 'dayjs';
import './KpiEvaluationPrint.css';

const ratingLabels = {
  1: 'Unsatisfactory',
  2: 'Inconsistent',
  3: 'Effective',
  4: 'Strong',
  5: 'Exemplary',
};

const ratingScale = [
  { label: 'EFFECTIVE',          range: '98-100%',  description: 'The employee consistently delivers effective results, honestly significant contributions and exceeding expectations in all areas.' },
  { label: 'COMPETENT',          range: '90-97%',   description: 'The employee frequently goes above and beyond the basic requirements, demonstrating strong performance.' },
  { label: 'SATISFACTORY',       range: '85-89%',   description: 'The employee performs at a satisfactory level, fulfilling the core requirements of their role.' },
  { label: 'AVERAGE',            range: '80-84%',   description: 'The employee performs at an average level, fulfilling the core requirements of their role.' },
  { label: 'NEEDS IMPROVEMENT',  range: '75-79%',   description: 'The employee shows some competency but requires significant development to meet expectations consistently.' },
  { label: 'FAILED',             range: 'BELOW 75', description: 'The employee consistently fails to meet the basic requirement of the job.' },
];

const KpiEvaluationPrint = () => {
  const { id }                      = useParams();
  const [evaluation, setEvaluation] = useState(null);
  const [template,   setTemplate]   = useState(null);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await kpiEvaluationApi.getById(id);
        setEvaluation(data.evaluation);
        setTemplate(data.template);
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

  if (!evaluation) return null;

  const employee      = evaluation.employee;
  const items         = evaluation.evaluation_items || [];
  const ratings       = evaluation.behavior_ratings || [];
  const demeritRatings = evaluation.demerit_ratings || [];
  const hasDemerit    = template?.has_demerit && demeritRatings.length > 0;

  // ── Calculations ───────────────────────────────────────────────────────────
  const jobScore = items.reduce((sum, item) => {
    const grade  = parseFloat(item.actual_grade) || 0;
    const weight = parseFloat(item.template_item?.weight) || 0;
    return sum + (grade * weight) / 100;
  }, 0);

  const totalWeight = items.reduce((sum, item) => {
    return sum + (parseFloat(item.template_item?.weight) || 0);
  }, 0);

  const filledRatings = ratings.filter((r) => r.rating > 0);
  const behaviorScore = filledRatings.length > 0
    ? filledRatings.reduce((sum, r) => sum + r.rating, 0) / filledRatings.length
    : 0;

  const demeritTotal = demeritRatings.reduce((sum, r) => {
    return sum + (parseFloat(r.actual_deduction) || 0);
  }, 0);

  const finalGrade = jobScore + behaviorScore - demeritTotal;

  return (
    <div className='print-wrapper'>

      {/* ── Print Button — hidden when printing ──────────────────────────── */}
      <div className='no-print' style={{ textAlign: 'right', marginBottom: 16 }}>
        <Button
          type='primary'
          icon={<PrinterOutlined />}
          onClick={() => window.print()}
        >
          Print
        </Button>
      </div>

      {/* ── KPI Form ─────────────────────────────────────────────────────── */}
      <div className='kpi-print'>

        {/* Header */}
        <div className='kpi-header'>
          <div className='company-name'>ADDESSA CORPORATION</div>
          <div className='form-title'>EMPLOYEE KEY PERFORMANCE INDEX</div>
        </div>

        {/* Employee Info */}
        <table className='info-table'>
          <tbody>
            <tr>
              <td className='info-label'>NAME:</td>
              <td className='info-value'>
                {employee?.last_name}, {employee?.first_name} {employee?.middle_name}
              </td>
              <td className='info-label'>BRANCH:</td>
              <td className='info-value'>{evaluation.employee?.branch?.name || '-'}</td>
            </tr>
            <tr>
              <td className='info-label'>DEPARTMENT:</td>
              <td className='info-value'>{evaluation.employee?.department?.name || '-'}</td>
              <td className='info-label'>PERIOD COVERED:</td>
              <td className='info-value'>
                {dayjs(evaluation.period_start).format('MMMM D')} - {dayjs(evaluation.period_end).format('D, YYYY')}
              </td>
            </tr>
            <tr>
              <td className='info-label'>POSITION:</td>
              <td className='info-value' colSpan={3}>{evaluation.position?.name || '-'}</td>
            </tr>
          </tbody>
        </table>

        {/* Section 1 — Job Performance */}
        <table className='kpi-table'>
          <thead>
            <tr>
              <th className='col-component'>COMPONENT</th>
              <th className='col-weight'>WEIGHT</th>
              <th className='col-grade'>ACTUAL GRADE</th>
              <th className='col-final'>FINAL</th>
            </tr>
            <tr>
              <th colSpan={4} className='section-header'>JOB PERFORMANCE</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const grade      = parseFloat(item.actual_grade) || 0;
              const weight     = parseFloat(item.template_item?.weight) || 0;
              const finalScore = (grade * weight) / 100;
              return (
                <tr key={item.id}>
                  <td>
                    {String.fromCharCode(65 + idx)}. {item.template_item?.component_name}
                  </td>
                  <td className='text-center'>{weight}%</td>
                  <td className='text-center'>{grade.toFixed(2)}%</td>
                  <td className='text-center'>{finalScore.toFixed(2)}%</td>
                </tr>
              );
            })}
            <tr className='total-row'>
              <td><strong>TOTAL SCORE</strong></td>
              <td className='text-center'><strong>{totalWeight}%</strong></td>
              <td></td>
              <td className='text-center'><strong>{jobScore.toFixed(2)}%</strong></td>
            </tr>
          </tbody>
        </table>

        {/* Demerit Section — only if has_demerit */}
        {hasDemerit && (
          <table className='kpi-table' style={{ marginTop: 0 }}>
            <thead>
              <tr>
                <th colSpan={4} className='section-header demerit-header'>DEMERIT</th>
              </tr>
            </thead>
            <tbody>
              {demeritRatings.map((rating, idx) => (
                <tr key={rating.id}>
                  <td>
                    {String.fromCharCode(65 + idx)}. {rating.demerit_item?.component_name}
                  </td>
                  <td className='text-center'>{rating.demerit_item?.max_deduction}% max</td>
                  <td></td>
                  <td className='text-center'>{parseFloat(rating.actual_deduction || 0).toFixed(2)}%</td>
                </tr>
              ))}
              <tr className='total-row'>
                <td><strong>TOTAL DEMERIT</strong></td>
                <td></td>
                <td></td>
                <td className='text-center'><strong>{demeritTotal.toFixed(2)}%</strong></td>
              </tr>
            </tbody>
          </table>
        )}

        {/* Section 2 — Work Personality/Behavior */}
        <table className='kpi-table' style={{ marginTop: 8 }}>
          <thead>
            <tr>
              <th colSpan={3} className='section-header'>WORK PERSONALITY/BEHAVIOR</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={3} className='rating-legend'>
                <em>
                  Rate the person's work behavior on a scale of 1 to 5 using the rating description below:<br />
                  5 - Exemplary (Consistently models values and exceeds expectations.)<br />
                  4 - Strong (Frequently demonstrates desired behaviors and values)<br />
                  3 - Effective (Meets expectations and aligns with values)<br />
                  2 - Inconsistent (Sometimes demonstrates expected behaviors; needs improvement)<br />
                  1 - Unsatisfactory (Rarely meets expectations or aligns with values)
                </em>
              </td>
            </tr>
            <tr>
              <th style={{ width: 30 }}>#</th>
              <th>CRITERIA</th>
              <th className='col-weight'>RATING</th>
            </tr>
            {ratings.map((rating) => (
              <tr key={rating.id}>
                <td className='text-center'>{rating.criteria?.sort_order}</td>
                <td>
                  <strong>{rating.criteria?.criteria_name}</strong><br />
                  <span style={{ fontSize: 10 }}>{rating.criteria?.description}</span>
                </td>
                <td className='text-center'>{rating.rating || '-'}</td>
              </tr>
            ))}
            <tr className='total-row'>
              <td colSpan={2}><strong>TOTAL POINTS</strong></td>
              <td className='text-center'><strong>{behaviorScore.toFixed(2)}%</strong></td>
            </tr>
          </tbody>
        </table>

        {/* Section 3 — Performance Summary */}
        <table className='kpi-table' style={{ marginTop: 8 }}>
          <thead>
            <tr>
              <th colSpan={4} className='section-header'>PERFORMANCE SUMMARY</th>
            </tr>
            <tr>
              <th style={{ width: 30 }}></th>
              <th></th>
              <th className='col-weight'></th>
              <th className='col-final'>TOTAL SCORE</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className='text-center'>1</td>
              <td>JOB PERFORMANCE</td>
              <td className='text-center'>{evaluation.job_performance_weight}%</td>
              <td className='text-center'>{jobScore.toFixed(2)}%</td>
            </tr>
            <tr>
              <td className='text-center'>2</td>
              <td>WORK PERSONALITY BEHAVIOR</td>
              <td className='text-center'>{evaluation.behavior_weight}%</td>
              <td className='text-center'>{behaviorScore.toFixed(2)}</td>
            </tr>
            {hasDemerit && (
              <tr>
                <td className='text-center'>3</td>
                <td>DEMERIT</td>
                <td className='text-center'>{template?.max_demerit}%</td>
                <td className='text-center' style={{ color: 'red' }}>
                  {demeritTotal.toFixed(2)}%
                </td>
              </tr>
            )}
            <tr className='final-grade-row'>
              <td colSpan={3}><strong>FINAL GRADE</strong></td>
              <td className='text-center'><strong>{finalGrade.toFixed(2)}%</strong></td>
            </tr>
          </tbody>
        </table>

        {/* Section 4 — Rating Scale */}
        <table className='kpi-table rating-scale-table' style={{ marginTop: 8 }}>
          <tbody>
            {ratingScale.map((scale) => (
              <tr key={scale.label}>
                <td className='scale-label'><strong>{scale.label}</strong></td>
                <td className='scale-range'>{scale.range}</td>
                <td className='scale-desc'>{scale.description}</td>
              </tr>
            ))}
          </tbody>
        </table>

      </div>
    </div>
  );
};

export default KpiEvaluationPrint;