import employeeApi from "../../../services/employee/employeeApi";
import workScheduleApi from "../../../services/employee/workScheduleApi";
import branchAssignmentPositionApi from "../../../services/employee/branchAssignmentPositionApi";
import keyPerformanceApi from "../../../services/employee/keyPerformanceApi";
import nteApi from "../../../services/employee/nteApi";
import disciplinaryApi from "../../../services/employee/disciplinaryApi";
import offboardingApi from "../../../services/employee/offboardingApi";
import compensationApi from "../../../services/compensation/compensationApi";
import attendanceLogApi from "../../../services/payroll/attendanceLogApi";
import allowanceApi from "../../../services/payroll/allowanceApi";
import deductionApi from "../../../services/payroll/deductionApi";
import contributionProfileApi from "../../../services/payroll/contributionProfileApi";
import bankAccountApi from "../../../services/payroll/bankAccountApi";

// Bulk create/update document types — one list for GenerateTemplateModal
// and ImportDataModal, matching vueportal's TemplateDownloadDialog.vue /
// ImportDialog.vue (same order, same permissions). A type is offered in a
// dialog when the user has that dialog's permission.
//
// templateOptions: extra Generate Template fields the backend reads —
//   status:         Document Status (All / Active / Inactive)
//   branchPosition: Branch + Position (0 = ALL), for BRANCH_POSITION_ROLES
//                   only — other users' templates are scoped server-side
//   kpi:            Year + Month
//   employees:      Branch + Position + Employees (any user who may download
//                   the template — the salary template is already HR-only)
//   dateRange:      Date From – To (required; date_from / date_to)
//
// Not offered: Classroom / OJT Performance Rating — vueportal lists them,
// but their controllers have no import()/template_download(), so both fail
// there too (see classroomPerformanceRatingApi.js).
export const DOCUMENT_TYPES = [
  {
    value: "employee_master_data",
    label: "Employee Master Data",
    templatePermission: "employee-master-data-template-download",
    importPermission: "employee-master-data-import",
    filename: "EmployeeMasterDataTemplate.xls",
    download: () => employeeApi.templateDownload(),
    upload: (file) => employeeApi.import(file),
  },
  {
    value: "branch_assignment_position",
    label: "Branch Assignment Position",
    templatePermission: "employee-master-data-branch-assignment-position-template-download",
    importPermission: "employee-master-data-branch-assignment-position-import",
    filename: "EmployeeBranchAssignmentPositionTemplate.xls",
    download: (params) => branchAssignmentPositionApi.templateDownload(params),
    upload: (file) => branchAssignmentPositionApi.import(file),
    templateOptions: { status: true, branchPosition: true },
    hint: "The template lists each employee's existing assignments — edit a line, or add a line for a new assignment. A line with the same employee code, date assigned, position and branch updates that assignment; otherwise it's added. Unchanged lines and lines with only the employee code/name are skipped. employment_source: direct or agency (blank = direct); agency_name is optional, for agency only.",
  },
  {
    value: "key_performance",
    label: "Monthly Key Performance",
    templatePermission: "employee-master-data-key-performance-template-download",
    importPermission: "employee-master-data-key-performance-import",
    filename: "EmployeeKeyPerformanceTemplate.xls",
    download: (params) => keyPerformanceApi.templateDownload(params),
    upload: (file) => keyPerformanceApi.import(file),
    templateOptions: { status: true, branchPosition: true, kpi: true },
  },
  {
    value: "nte",
    label: "Issued NTE",
    templatePermission: "employee-master-data-nte-template-download",
    importPermission: "employee-master-data-nte-import",
    filename: "EmployeeNTETemplate.xls",
    download: (params) => nteApi.templateDownload(params),
    upload: (file) => nteApi.import(file),
    hint: "A line with the same employee code, date issued and NTE code updates that NTE; otherwise it's added. date_received_by_hr (YYYY-MM-DD, format the cell as Text) is optional — it starts Case Resolution Time; a blank cell keeps the date already saved. Older templates without that column still import.",
  },
  {
    value: "disciplinary",
    label: "Disciplinary Action",
    templatePermission: "employee-master-data-disciplinary-template-download",
    importPermission: "employee-master-data-disciplinary-import",
    filename: "EmployeeDisciplinaryTemplate.xls",
    download: (params) => disciplinaryApi.templateDownload(params),
    upload: (file) => disciplinaryApi.import(file),
  },
  {
    value: "offboarding",
    label: "Offboarding",
    templatePermission: "employee-master-data-offboarding-template-download",
    importPermission: "employee-master-data-offboarding-import",
    filename: "EmployeeOffboardingTemplate.xls",
    download: (params) => offboardingApi.templateDownload(params),
    upload: (file) => offboardingApi.import(file),
    hint: "A line with the same employee code and last day of work updates that offboarding; otherwise it's added. exit_interview_date (YYYY-MM-DD, format the cell as Text) is optional — leave it blank when no exit interview was held; a blank cell keeps the date already saved. Older templates without that column still import.",
  },
  {
    value: "work_schedule",
    label: "Work Schedule",
    templatePermission: "employee-master-data-work-schedule-template-download",
    importPermission: "employee-master-data-work-schedule-import",
    filename: "EmployeeWorkScheduleTemplate.xls",
    download: () => workScheduleApi.templateDownload(),
    upload: (file) => workScheduleApi.import(file),
    hint: "Columns: employee_code, effective_date (YYYY-MM-DD, format the cell as Text), shift_code, remarks. Each line adds a Work Schedule version that follows the shift — the template's \"Shifts\" sheet lists the active shift codes and their weekly hours. Older files with rest_day, time_in and time_out still import (as hand-typed versions).",
  },
  {
    value: "compensation",
    label: "Salary (Compensation)",
    templatePermission: "compensation-template-download",
    importPermission: "compensation-import",
    filename: "EmployeeCompensationTemplate.xls",
    download: (params) => compensationApi.templateDownload(params),
    upload: (file) => compensationApi.import(file),
    templateOptions: { status: true, employees: true },
    hint: "The template lists each employee with today's salary and a blank effective_date. Fill effective_date (YYYY-MM-DD, cell formatted as Text), pay_basis (Monthly / Daily), basic_rate and change_type on the lines to change — blank effective_date lines are skipped. The same employee and effective date as a saved salary updates it; otherwise a new salary is added. One wrong line stops the whole import.",
  },
  {
    value: "allowance",
    label: "Allowances",
    templatePermission: "allowance-template-download",
    importPermission: "allowance-import",
    filename: "EmployeeAllowanceTemplate.xls",
    download: (params) => allowanceApi.templateDownload(params),
    upload: (file) => allowanceApi.import(file),
    templateOptions: { status: true, employees: true },
    hint: "The template lists each employee's allowances in force today (current_from / current_to are for reference) with a blank effective_from. Fill allowance_type_code (see the Values sheet), basis, amount and effective_from (YYYY-MM-DD, cell formatted as Text) on the lines to add or change — blank effective_from lines are skipped. A new effective_from adds the allowance and ends the same type running then on the day before. The same employee, type and effective_from as a saved allowance updates it (copy current_from into effective_from and fill effective_to to end one). One wrong line stops the whole import.",
  },
  {
    value: "deduction",
    label: "Deductions",
    templatePermission: "deduction-template-download",
    importPermission: "deduction-import",
    filename: "EmployeeDeductionTemplate.xls",
    download: (params) => deductionApi.templateDownload(params),
    upload: (file) => deductionApi.import(file),
    templateOptions: { status: true, employees: true },
    hint: "One line per deduction (loan, cash advance, …): deduction_type_code, total_amount, amount_per_cutoff, start_cutoff (cut-off code) and schedule — codes and schedules are on the Values sheet; amount_per_cutoff may be blank for One-time; description is required for a type marked \"needs description\" (e.g. Other Deduction). Lines with a blank deduction_type_code are skipped. The same type and reference_no as a saved, not cancelled deduction updates it; otherwise it's added (a line without reference_no that matches a saved one's type, total and start cut-off is refused). One wrong line stops the whole import.",
  },
  {
    value: "contribution_profile",
    label: "Contribution Profiles",
    templatePermission: "contribution-profile-template-download",
    importPermission: "contribution-profile-import",
    filename: "ContributionProfileTemplate.xls",
    download: (params) => contributionProfileApi.templateDownload(params),
    upload: (file) => contributionProfileApi.import(file),
    templateOptions: { status: true, employees: true },
    hint: "The template lists each employee's saved profile (or the Computed defaults). Edit the lines to change: modes Computed / Fixed / Exempt (Fixed needs its EE and ER amounts, tax_fixed for tax — monthly), pagibig_ee_additional, minimum_wage_earner Yes / No. Every line replaces that employee's whole profile; unchanged lines are skipped. One wrong line stops the whole import.",
  },
  {
    value: "bank_account",
    label: "Bank Accounts",
    templatePermission: "bank-account-template-download",
    importPermission: "bank-account-import",
    filename: "EmployeeBankAccountTemplate.xls",
    download: (params) => bankAccountApi.templateDownload(params),
    upload: (file) => bankAccountApi.import(file),
    templateOptions: { status: true, employees: true },
    hint: "The template lists each employee's payroll account in force today (current_from is for reference) with a blank effective_from. Fill bank_code (see the Values sheet), account_name, account_no (digits, spaces and dashes — keep the cell as Text so leading zeros stay) and effective_from (YYYY-MM-DD, Text) on the lines to add or change — blank effective_from lines are skipped. A new effective_from adds the account from that date (the earlier one stays as history); the same employee and effective_from as a saved account updates it. One wrong line stops the whole import.",
  },
  {
    value: "attendance_log",
    label: "Attendance Logs",
    templatePermission: "attendance-log-template-download",
    importPermission: "attendance-log-import",
    filename: "AttendanceLogTemplate.xls",
    download: (params) => attendanceLogApi.templateDownload(params),
    upload: (file) => attendanceLogApi.import(file),
    templateOptions: { status: true, employees: true, dateRange: true },
    hint: "For employees whose punches don't come from the biometric device (or to correct a day). One line per employee per date (YYYY-MM-DD): time_in, break_out, break_in, time_out as HH:MM, 24-hour (cells formatted as Text); any may be blank. A time earlier than the one before it is the next day (a night shift's time out). A line replaces that employee's imported times for the date — blank times clear them — and the DTR uses them instead of that date's biometric punches. Future dates and dates inside an approved or pending payroll are refused. One wrong line stops the whole import.",
  },
];

export const TEMPLATE_PERMISSIONS = DOCUMENT_TYPES.map((t) => t.templatePermission);
export const IMPORT_PERMISSIONS = DOCUMENT_TYPES.map((t) => t.importPermission);

// Vue's branchPositionParamsIsVisible: these roles pick Branch / Position on
// templates with templateOptions.branchPosition (others get their own scope).
export const BRANCH_POSITION_ROLES = [
  "Administrator", "Employee Master Data Administrator", "Recruitment & Hiring",
  "Payroll Admin", "Employees Relation", "Performance Management",
];

export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
