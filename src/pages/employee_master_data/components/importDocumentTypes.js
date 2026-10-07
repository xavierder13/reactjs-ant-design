import employeeApi from "../../../services/employee/employeeApi";
import workScheduleApi from "../../../services/employee/workScheduleApi";
import branchAssignmentPositionApi from "../../../services/employee/branchAssignmentPositionApi";
import keyPerformanceApi from "../../../services/employee/keyPerformanceApi";
import nteApi from "../../../services/employee/nteApi";
import disciplinaryApi from "../../../services/employee/disciplinaryApi";
import offboardingApi from "../../../services/employee/offboardingApi";

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
  },
  {
    value: "work_schedule",
    label: "Work Schedule",
    templatePermission: "employee-master-data-work-schedule-template-download",
    importPermission: "employee-master-data-work-schedule-import",
    filename: "EmployeeWorkScheduleTemplate.xls",
    download: () => workScheduleApi.templateDownload(),
    upload: (file) => workScheduleApi.import(file),
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
