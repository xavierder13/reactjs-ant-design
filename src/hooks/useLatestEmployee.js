import { useEffect, useState } from 'react';
import employeeApi from '../services/employee/employeeApi';

// Loads the current copy of one employee for View/Edit. vueportal has no
// show/{id} endpoint, and the row passed in router state is a snapshot from
// when the list was opened — the browser keeps it across a refresh, so
// anything saved immediately since (files, NTE/disciplinary records,
// performance sub-records) wouldn't show. This asks the list endpoint
// (same getEmployees() query, so the same row shape) to search the id
// column, then keeps only the exact match.
//
// Falls back to the router-state row when the fetch fails or finds nothing
// (e.g. an edit-only user without `employee-master-data-list`, which the
// index endpoint requires).
export default function useLatestEmployee(id, stateEmployee) {
  const [result, setResult] = useState({ id: null, employee: null });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      let fresh = null;
      try {
        const { data } = await employeeApi.getAll({
          page: 1,
          items_per_page: 50,
          search: String(id),
          table_headers: [{ text: 'ID', value: 'employee_master_data.id' }],
        });
        fresh = (data?.employees?.data || []).find((e) => String(e.id) === String(id)) || null;
      } catch {
        // fall back to the router-state row below
      }
      if (!cancelled) setResult({ id, employee: fresh });
    };
    load();
    return () => { cancelled = true; };
  }, [id]);

  const isLoading = result.id !== id;
  return { employee: (!isLoading && result.employee) || stateEmployee || null, isLoading };
}
