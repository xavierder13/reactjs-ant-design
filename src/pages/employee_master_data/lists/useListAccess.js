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

// Shared gates for the Employee Master Data segment/queue list pages.
// `can` adds the Administrator bypass every action gate needs (CLAUDE.md
// product rule). `canFilterByBranch` mirrors vueportal's branchParamIsVisible:
// the all-branch roles, or a user whose position is a Department Manager.
export default function useListAccess() {
  const { user, hasRole, hasAnyRole, hasPermission } = useAuth();

  const can = (permission) => hasRole("Administrator") || hasPermission(permission);
  const canFilterByBranch = hasAnyRole(...ALL_BRANCH_ROLES)
    || Boolean(user?.position?.name?.includes("Department Manager"));

  return { can, canFilterByBranch };
}
