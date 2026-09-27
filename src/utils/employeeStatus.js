// Matches EmployeeInformationTabs.vue's / EmployeeMasterData2.vue's
// `activeStatus` computed — the backend `active` column has no Eloquent
// cast (see vueportal's EmployeeMasterData.php), so it isn't guaranteed to
// arrive as a clean boolean; treat any falsy-looking value (0, "0",
// "false", "Inactive") as Inactive rather than passing it straight through
// Boolean(), which treats any non-empty string as truthy.
export const isActiveValue = (value) => {
  if (typeof value === "string") {
    return !["", "0", "false", "inactive"].includes(value.trim().toLowerCase());
  }
  return Boolean(value);
};
