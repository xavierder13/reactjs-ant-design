# Employee Master Data — file map and routes

Part of the `employee-master-data` skill; read `SKILL.md` first (cross-cutting rules). Lookup material.

## Architecture / File Map

```
src/pages/employee_master_data/
  EmployeeMasterData.jsx          list page (title+actions row, search/status/column toolbar, bulk-action bar)
  CreateEmployee.jsx              thin wrapper → EmployeeForm mode="create"
  EditEmployee.jsx                useLatestEmployee(id) → EmployeeForm mode="edit" (or a "not found" fallback)
  ViewEmployee.jsx                useLatestEmployee(id) → profile/EmployeeProfile view="hr" (Back/Edit actions, same fallback)
  profile/                        shared Employee Profile (see areas/profile.md), also used by src/pages/user/UserProfile.jsx
  components/
    EmployeeForm.jsx              shared create/edit form (owns the single Form instance, Save/Cancel); its view mode is no longer routed
    EmployeeTabs.jsx              tab container for EmployeeForm, filters tabs by umbrella permission
    employeeTabItems.jsx          getEmployeeTabItems() + TAB_PERMISSIONS — tab definitions shared by EmployeeTabs and the profile
    EmployeeTable.jsx             desktop table + row actions (View/Edit/Delete)
    EmployeeCardMobile.jsx        mobile card list, same actions
    employeeColumns.jsx           list columns (EMPLOYEE_COLUMNS / DEFAULT_EMPLOYEE_COLUMNS), shared with the segment lists
    useEmployeeColumns.js         ⚙ Columns for the employee lists (show ≤ 8 / reorder, localStorage) → selectedHeaders = table_headers
    ColumnSelector.jsx            UNUSED (old multi-select picker, replaced by useEmployeeColumns)
    PaginationControls.jsx        mobile pagination UI
    EmployeeModal.jsx             UNUSED — see SKILL.md "Decisions" #3
    importDocumentTypes.js        bulk create/update document types (shared by the two modals below)
    GenerateTemplateModal.jsx     Generate Template (Document Type + its options)
    ImportDataModal.jsx           Import Data (Document Type + file; error list)
    ExportEmployeesModal.jsx      Excel export (core record "Employee List" report only); optional presetValues/extraPayload/title
    SubmitAcknowledgmentReportModal.jsx  opened from the bulk-action bar; Branch picker only for Administrator / employee-acknowledgment-reports-all, else the account's branch (users.branch_id) read-only — vueportal store() refuses another branch (422)
    SelectionBar.jsx              bulk-action bar (count, Clear selection, actions) — main list + segment lists
    FileSlotCard.jsx              attachment card (status tag, drag-drop picker, download/delete) + FileSlots row wrapper; used by NTE and Disciplinary dialogs
    tabs/
      PersonalDataTab.jsx         nested: personal/PersonalInformation.jsx + personal/FilesRequirements.jsx
      EmployeeDetailsTab.jsx      position/department/branch/employment type/dates/referral code
      PerformanceManagementTab.jsx  7 sub-tabs in performance/ (see areas/record-tabs.md)
      DisciplinaryTab.jsx         disciplinary/NteRecordsTab.jsx + disciplinary/DisciplinaryRecordsTab.jsx
                                  (form fields: NteFormFields.jsx / DisciplinaryFormFields.jsx; NteFileSlot.jsx)
      TrainingProgramTab.jsx      HR-encoded training programs (on PerformanceRecordTab), before Offboarding
      OffboardingTab.jsx          + offboarding/OffboardingFileSlot.jsx, offboarding/OffboardingFormFields.jsx
      AttendanceTab.jsx           read-only, own fetch
      AssetAssignmentTab.jsx      Edit only: company assets of the employee — View / Return / Assign asset (own fetch, no Form.Items)
  lists/                          segment / open-case list pages (see areas/segment-lists.md)
    EmployeeSegmentList.jsx       shared server-paginated list → HiredThisMonth.jsx, ForRegularization.jsx, CareersSyncedList.jsx
    ResignedEmployees.jsx         latest offboarding per employee, date-filtered, edit/delete offboarding
    OpenCaseList.jsx              shared client-side queue list → OpenNteList.jsx, OpenDisciplinaryList.jsx
    BranchFilter.jsx, useListAccess.js  branch-name filter; `can()` (Administrator bypass) + canFilterByBranch
  referral_codes/
    ReferralCodeList.jsx          /employees/referral-codes — every employee's referral code + copyable link
  new_hired/
    NewHiredList.jsx              /employees/new-hired — careers-portal hires not yet synced; select + Sync
  acknowledgment_report/
    AcknowledgmentReportIndex.jsx   /acknowledgment-reports
    AcknowledgmentReportView.jsx    /acknowledgment-reports/:id

src/store/employeeStore.js, src/store/acknowledgmentReportStore.js
src/hooks/useEmployees.js, src/hooks/useAcknowledgmentReports.js
src/services/employee/
  employeeApi.js                  core CRUD + files + import/export/template + resign
  employeeOptionApi.js            dropdown/typeahead lookups only (also used by Manpower Request)
  employeeAcknowledgmentReportApi.js
  keyPerformanceApi.js, classroomPerformanceRatingApi.js, ojtPerformanceRatingApi.js,
  branchAssignmentPositionApi.js, meritHistoryApi.js, trainingApi.js,
  trainingProgramApi.js, nteApi.js, disciplinaryApi.js, offboardingApi.js, attendanceApi.js,
  employeeReferralApi.js
src/utils/referralLink.js          buildReferralLink() + copyText() (clipboard with a non-HTTPS fallback)
src/utils/downloadBlobResponse.js  blob download that detects a JSON error body (see areas/import-export.md)
```

## Routes

Registered in both `AppRoutes.jsx` (`permissionRoutes`) and
`MainLayout.jsx` (`menuData` + `titleMap`/`getPageMeta`). Sidebar: the list pages
sit under Human Resource → Employee; Branch Reports and Branch Manpower Fill
Rate sit in Employee's **Workforce Reports** group (`emp-workforce-reports`) —
reports live inside the process they belong to, like Payroll's and KPI's:

```
/employees                 → EmployeeMasterData         (employee-master-data-list)
/employees/create          → CreateEmployee             (employee-master-data-create)
/employees/:id             → ViewEmployee = profile     (employee-master-data-list); `?tab=` keeps the open tab
/employees/:id/edit        → EditEmployee               (employee-master-data-create, employee-master-data-edit)
/acknowledgment-reports    → AcknowledgmentReportIndex  (employee-acknowledgment-reports)
/acknowledgment-reports/:id → AcknowledgmentReportView  (employee-acknowledgment-reports)
/reports/branch-manpower   → BranchManpowerReport       (employee-master-data-branch-manpower-export)
/employees/hired-this-month   → HiredThisMonth       (employee-master-data-for-regularization — the backend gates this list on it too)
/employees/for-regularization → ForRegularization    (employee-master-data-for-regularization)
/employees/resigned           → ResignedEmployees    (employee-master-data-resigned-list)
/employees/overdue-deactivation   → OverdueDeactivation   (employee-master-data-deactivate)
/employees/overdue-regularization → OverdueRegularization (employee-master-data-regularize)
/employees/nte                → OpenNteList          (employee-master-data-nte-list)
/employees/disciplinary       → OpenDisciplinaryList (employee-master-data-disciplinary-list)
/employees/referral-codes     → ReferralCodeList     (employee-referral-list)
/employees/new-hired          → NewHiredList         (employee-master-data-new-hired-list; Sync: employee-master-data-sync-new-hired)
/employees/careers-synced     → CareersSyncedList    (employee-master-data-list)
```
