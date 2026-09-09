import axios from '../../api/axiosInstance';

const employeeOptionApi = {

  // GET /api/employee_master_data/option_list
  getAll:      (params = {}) => axios.post('/employee_master_data/option_list', { ...params, status: -1 }),
  getActive:   (params = {}) => axios.post('/employee_master_data/option_list', { ...params, status: 1 }),
  getInactive: (params = {}) => axios.post('/employee_master_data/option_list', { ...params, status: 0 }),
};

export default employeeOptionApi;