import { useEffect } from "react";
import useDepartmentStore from "../store/departmentStore";

const useDepartments = () => {
  const departments = useDepartmentStore((state) => state.departments);
  const isLoading = useDepartmentStore((state) => state.isLoading);
  const isLoaded = useDepartmentStore((state) => state.isLoaded);
  const error = useDepartmentStore((state) => state.error);
  const fetchDepartments = useDepartmentStore((state) => state.fetchDepartments);
  const clearDepartments = useDepartmentStore((state) => state.fetchDepartments);

  // auto-fetch on first use
  useEffect(() => {
    fetchDepartments();
  }, []);

  // formatted for Ant Design Select options
  const departmentOptions = departments.map((dept) => ({
    label: dept.name,
    value: dept.id
  }));

  return {
    departments,
    departmentOptions,
    isLoading,
    isLoaded,
    error,
    fetchDepartments,
    clearDepartments,
  };
};

export default useDepartments;