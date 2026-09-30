import axios from '../../api/axiosInstance';

const kpiReportApi = {

  // GET /api/kpi/reports/consolidated — approved evaluations with every
  // section broken down. params: { period_from, period_to, position_ids[], branch_id }
  getConsolidated: (params = {}) => axios.get('/kpi/reports/consolidated', { params }),

};

export default kpiReportApi;
