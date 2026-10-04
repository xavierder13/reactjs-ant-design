import useAuth from "../../../hooks/useAuth";

// Roles that see every branch — the same list vueportal's list pages use for
// `branchParamIsVisible`, and that the backend exempts from branch/subordinate
// scoping.
const ALL_BRANCH_ROLES = [
  "Administrator",
  "Employee Master Data Administrator",
  "Recruitment & Hiring",
  "Payroll Admin",
  "Employees Relation",
  "Performance Management",
];

// Shared gates for the Employee Master Data list pages.
// `can` adds the Administrator bypass every action gate needs (CLAUDE.md
// product rule). `seesAllBranches` is exactly the backend's scoping test in
// EmployeeMasterDataController::getEmployees() (`! hasAnyRole(...)` → the
// list is limited to the user's branch / subordinate positions).
// `canFilterByBranch` mirrors vueportal's branchParamIsVisible: those roles,
// or a user whose position is a Department Manager.
export default function useListAccess() {
  const { user, hasRole, hasAnyRole, hasPermission } = useAuth();

  const can = (permission) => hasRole("Administrator") || hasPermission(permission);
  const seesAllBranches = hasAnyRole(...ALL_BRANCH_ROLES);
  const canFilterByBranch = seesAllBranches
    || Boolean(user?.position?.name?.includes("Department Manager"));

  return { can, seesAllBranches, canFilterByBranch };
}
