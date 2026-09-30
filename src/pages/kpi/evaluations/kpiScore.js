// KPI score maths, mirroring vueportal KpiCalculationService so the pages
// show the same numbers the backend stores.

// Weight frozen on the evaluation item at creation (older evaluations fall
// back to the template's).
export const itemWeight = (item) =>
  parseFloat(item.weight ?? item.template_item?.weight) || 0;

// Max deduction frozen on the demerit rating (fallback: the template item's).
export const maxDeduction = (rating) =>
  parseFloat(rating.max_deduction ?? rating.demerit_item?.max_deduction) || 0;

// One criterion's final behavior rating: the evaluator's, or on a
// Supervisor-type evaluation the approver has rated, the average of both.
export const finalBehaviorRating = (rating, evaluationType) => {
  if (!rating.rating) return null;
  if (evaluationType === 'supervisor' && rating.approver_rating) {
    return (rating.rating + rating.approver_rating) / 2;
  }
  return rating.rating;
};

const average = (values) =>
  values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;

const clamp = (value) => Math.max(0, Math.min(100, value));

// mode 'self' → the employee's self grades (an estimate); otherwise the
// supervisor's (+ approver's) grades.
// useStoredFinal: the viewer can't see the approver's ratings (hidden by the
// backend), so on an approved evaluation the stored final_score — which
// includes them — is shown, and behavior is derived from it.
export const computeScores = (evaluation, mode = 'supervisor', { useStoredFinal = false } = {}) => {
  const items    = evaluation.evaluation_items || [];
  const ratings  = evaluation.behavior_ratings || [];
  const demerits = evaluation.demerit_ratings || [];
  const isSelf   = mode === 'self';

  const job = items.reduce((sum, item) => {
    const grade = parseFloat(isSelf ? item.self_grade : item.actual_grade) || 0;
    return sum + (grade * itemWeight(item)) / 100;
  }, 0);

  const behavior = average(
    ratings
      .map((r) => (isSelf ? r.self_rating : finalBehaviorRating(r, evaluation.evaluation_type)))
      .filter((v) => v > 0)
  );

  const demeritTotal = demerits.reduce(
    (sum, r) => sum + (parseFloat(isSelf ? r.self_deduction : r.actual_deduction) || 0),
    0
  );
  const cap     = parseFloat(evaluation.max_demerit);
  const demerit = Number.isFinite(cap) ? Math.min(demeritTotal, cap) : demeritTotal;

  if (useStoredFinal && evaluation.final_score != null) {
    const final = parseFloat(evaluation.final_score);
    return { job, behavior: final - job + demerit, demerit, final };
  }

  return { job, behavior, demerit, final: clamp(job + behavior - demerit) };
};
