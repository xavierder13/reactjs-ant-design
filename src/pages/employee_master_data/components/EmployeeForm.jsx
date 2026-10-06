import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Button, Card, Space, Divider, Tag, App } from 'antd';
import employeeApi from '../../../services/employee/employeeApi';
import handleApiError from '../../../utils/handleApiError';
import { isActiveValue } from '../../../utils/employeeStatus';
import { toDayjs, formatDate } from '../../../utils/formatDate';
import useAuth from '../../../hooks/useAuth';
import EmployeeTabs from './EmployeeTabs';

// Fields belonging to each tab/sub-tab that the Save button's visibility
// depends on — see isFieldGroupChanged() below. Matches each tab
// component's own Form.Item `name`s exactly (EmployeeDetailsTab.jsx
// excludes `active`: it's system-managed via the Offboarding resign/rehire
// flow, never user-edited here, so it must never make this Save button
// appear on its own).
const PERSONAL_INFO_FIELDS = [
  'employee_code', 'last_name', 'first_name', 'middle_name', 'birth_date',
  'gender', 'civil_status', 'contact', 'email', 'address', 'tin_no',
  'pagibig_no', 'philhealth_no', 'sss_no', 'educ_attain', 'school_year',
  'school_attended', 'course',
];
const EMPLOYEE_DETAILS_FIELDS = [
  'job_title_code', 'position_id', 'department_id', 'branch_id',
  'employment_type', 'date_employed', 'date_resigned', 'application_source',
];
const EVALUATION_REGULARIZATION_FIELDS = ['regularization_date', 'regularization_interview_date', 'regularization_interview_status'];
const DATE_FIELDS = new Set(['birth_date', 'date_employed', 'date_resigned', 'regularization_date', 'regularization_interview_date']);

// mode: 'create' | 'edit' | 'view'. Mirrors ManpowerRequestForm.jsx's
// shape (single Form instance, buildPayload, Save/Cancel). initialData is
// the employee record for edit/view, passed down from CreateEmployee.jsx /
// EditEmployee.jsx / ViewEmployee.jsx (router state — see those files for
// why there's no fetch-by-id here).
const EmployeeForm = ({ mode = 'create', initialData = null }) => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { message: messageApi } = App.useApp();
  const { hasPermission, hasAnyPermission } = useAuth();
  const [saving, setSaving] = useState(false);
  const readOnly = mode === 'view';

  // Which tab/sub-tab is active — reported up from EmployeeTabs.jsx.
  // Personal Data and Performance Management get their own separate
  // sub-tab slots (not one shared one) because AntD keeps every Tabs pane
  // mounted at once, not just the active one — both sub-tab components
  // mount together and would otherwise report into the same value,
  // clobbering each other. Needed for the Save button's visibility below.
  const [activeTab, setActiveTab] = useState(undefined);
  const [personalSubTab, setPersonalSubTab] = useState(undefined);
  const [performanceSubTab, setPerformanceSubTab] = useState(undefined);

  // Bumped on every field change (including a cross-tab patch like
  // patchEmployee's) so this component re-renders and re-reads current
  // form values — AntD's internal field store doesn't itself trigger a
  // re-render of an ancestor component.
  const [, setFormVersion] = useState(0);
  const handleValuesChange = () => setFormVersion((v) => v + 1);

  // Create mode only — every sub-tab's staged-but-not-yet-saved rows/files,
  // one object + one updater lifted down through EmployeeTabs.jsx (see
  // that file and PerformanceManagementTab.jsx for why). Matches
  // EmployeeMasterDataController@store() accepting each of these (except
  // Offboarding, which store() has no handling for at all — confirmed by
  // reading it directly) bundled into the SAME multipart request that
  // creates the employee: real bug found 2026-09-24 — every one of these
  // tabs blocked itself with "save the employee first," even though the
  // backend never required that. See buildCreateRequestBody() below for
  // the exact field-name mapping, ported from EmployeeMasterData2.vue's
  // save() method field-for-field, including its indexed
  // `nte_files[${i}]`/`explanation_files[${i}]`/`disciplinary_files[${i}]`
  // convention (not a plain `[]` array push) — required so a row with no
  // file doesn't shift a later row's file into the wrong array index.
  const [pendingCreateData, setPendingCreateData] = useState({
    files: [],                          // [{ file, document_type }] — Files & Requirements + Evaluation & Regularization's 2 slots, merged (same backend field)
    monthlyKeyPerformances: [],
    classroomPerformanceRatings: [],
    ojtPerformanceRatings: [],
    branchAssignmentPositions: [],
    meritHistories: [],
    trainings: [],
    explanations: [],                   // [{ ...fields, nte_file, explanation_file }] — NTE
    disciplinaries: [],                 // [{ ...fields, file }]
    workSchedules: [],
  });
  const updatePendingCreateData = (key, value) => setPendingCreateData((prev) => ({ ...prev, [key]: value }));

  // Strips the local-only `id` (and, for NTE/Disciplinary, the raw File
  // fields — those go into their own parallel indexed fields instead) each
  // pending row carries, before JSON.stringify-ing it for the backend's
  // plain JSON-array fields.
  const stripLocalFields = (rows, extraKeys = []) => rows.map((row) => {
    const clean = { ...row };
    delete clean.id;
    extraKeys.forEach((key) => delete clean[key]);
    return clean;
  });

  const buildCreateRequestBody = (payload) => {
    const hasPendingData = Object.values(pendingCreateData).some((rows) => rows.length > 0);
    if (!hasPendingData) return payload;

    const formData = new FormData();
    Object.entries(payload).forEach(([key, value]) => {
      if (value == null) return;
      formData.append(key, key === 'active' ? (value ? '1' : '0') : value);
    });

    pendingCreateData.files.forEach(({ file, document_type }) => {
      formData.append('employee_files[]', file);
      formData.append('document_types[]', document_type);
    });

    const jsonBundles = [
      ['monthlyKeyPerformances', 'monthly_key_performances'],
      ['classroomPerformanceRatings', 'classroom_performance_ratings'],
      ['ojtPerformanceRatings', 'ojt_performance_ratings'],
      ['branchAssignmentPositions', 'branch_assignment_positions'],
      ['meritHistories', 'merit_histories'],
      ['trainings', 'trainings'],
      ['workSchedules', 'work_schedules'],
    ];
    jsonBundles.forEach(([stateKey, fieldName]) => {
      const rows = pendingCreateData[stateKey];
      if (rows.length) formData.append(fieldName, JSON.stringify(stripLocalFields(rows)));
    });

    if (pendingCreateData.explanations.length) {
      formData.append('explanations', JSON.stringify(stripLocalFields(pendingCreateData.explanations, ['nte_file', 'explanation_file'])));
      pendingCreateData.explanations.forEach((row, i) => {
        if (row.nte_file) formData.append(`nte_files[${i}]`, row.nte_file);
        if (row.explanation_file) formData.append(`explanation_files[${i}]`, row.explanation_file);
      });
    }

    if (pendingCreateData.disciplinaries.length) {
      formData.append('disciplinaries', JSON.stringify(stripLocalFields(pendingCreateData.disciplinaries, ['file'])));
      pendingCreateData.disciplinaries.forEach((row, i) => {
        if (row.file) formData.append(`disciplinary_files[${i}]`, row.file);
      });
    }

    return formData;
  };

  // Live, patchable copy of the employee record — matches
  // EmployeeMasterData2.vue's `editedItem`, which OffboardingTab's Vue
  // equivalent (Offboarding.vue's resignEmployee()) patches directly via
  // `$emit('updateStatus', {active, date_resigned})` so the dialog's
  // status chip updates immediately after a save, without a page reload.
  // This repo has no single-employee show/{id} endpoint, so `initialData`
  // (router state, frozen at page load) never refreshes on its own —
  // real bug found 2026-09-23: after adding/editing an Offboarding record
  // (which flips `active` server-side via the `resign` endpoint), the
  // Card title's and Employee Details tab's Status stayed stale for the
  // rest of the page visit even though vueportal's Vue reference updated
  // immediately. `employee` is what every *display* read below uses;
  // `initialData` itself is left untouched for the save-payload flow.
  const [employee, setEmployee] = useState(initialData);
  // Adjust state during render (React's documented pattern for "reset
  // derived state when a prop changes") rather than a useEffect — avoids
  // react-hooks/set-state-in-effect's cascading-render warning, and
  // initialData only actually changes if this same routed page instance
  // is reused for a different employee (e.g. browser back/forward).
  const [prevInitialData, setPrevInitialData] = useState(initialData);
  if (initialData !== prevInitialData) {
    setPrevInitialData(initialData);
    setEmployee(initialData);
  }

  // Patches only the given fields (matching Vue's updateStatus, which
  // only ever sends {active, date_resigned}) — deliberately not a full
  // form re-seed, which would risk clobbering in-progress edits on other
  // Employee Details fields if the user is mid-edit on that tab when an
  // Offboarding save happens.
  const patchEmployee = (patch) => {
    setEmployee((prev) => ({ ...prev, ...patch }));
    if ('active' in patch) form.setFieldsValue({ active: Boolean(patch.active) });
    if ('date_resigned' in patch) {
      form.setFieldsValue({ date_resigned: toDayjs(patch.date_resigned) });
    }
    // Set by a Branch Assignment row's agency tag (BranchAssignmentPositionTab).
    if ('employment_type' in patch) form.setFieldsValue({ employment_type: patch.employment_type });
  };

  // `employee` (the saved/live baseline — "currentData") vs the form's
  // live values ("newData"), compared as normalized JSON strings — a
  // straight JSON.stringify of the two objects as-is would false-positive
  // on every date field (the form holds dayjs instances, `employee` holds
  // plain "YYYY-MM-DD" strings) and on key ordering, so both sides are
  // built through the same per-field normalizer, in the same fixed key
  // order (iterating `fields` once), before stringifying.
  const normalizeFieldValue = (field, rawValue) => {
    if (DATE_FIELDS.has(field)) {
      if (!rawValue) return null;
      const value = typeof rawValue?.format === 'function' ? rawValue : toDayjs(rawValue);
      return value?.isValid() ? value.format('YYYY-MM-DD') : null;
    }
    return rawValue === undefined ? null : rawValue;
  };

  const buildComparableSnapshot = (fields, getRawValue) => {
    const snapshot = {};
    fields.forEach((field) => { snapshot[field] = normalizeFieldValue(field, getRawValue(field)); });
    return snapshot;
  };

  const isFieldGroupChanged = (fields) => {
    // birth_date is stored as `birth_date` OR `dob` on the employee record
    // depending on data source (see the field-seeding effect below, same
    // fallback) — matched here so the comparison reads the right source field.
    const currentSnapshot = buildComparableSnapshot(fields, (field) => (
      field === 'birth_date' ? (employee?.birth_date ?? employee?.dob) : employee?.[field]
    ));
    const formValues = form.getFieldsValue(fields);
    const newSnapshot = buildComparableSnapshot(fields, (field) => formValues[field]);
    return JSON.stringify(currentSnapshot) !== JSON.stringify(newSnapshot);
  };

  // Ports EmployeeInformationTabs.vue's changeSaveBtnVisibility() exactly:
  // Save only ever shows on 3 specific tab/sub-tab combinations (each also
  // permission-gated the same way Vue checks it), never on Disciplinary,
  // Offboarding, Attendance, or (new in this app, no Vue equivalent — same
  // reasoning as those 3: it manages its own records via its own modal)
  // Work Schedule. On top of Vue's own condition: once a tab/sub-tab is
  // eligible, Save additionally stays hidden until something in that
  // specific tab's fields actually differs from the saved record — Vue
  // has no equivalent for this second part; it's this app's own addition.
  // Create mode is untouched (Save always shows, matching Vue's own
  // default `saveBtnIsVisible: true` before any tab-tracking engages) and
  // so is view mode (the `!readOnly` check below already hides Save
  // entirely there).
  const isSaveVisible = () => {
    if (mode !== 'edit') return true;

    switch (activeTab) {
      case 'personal':
        return personalSubTab === 'info'
          && hasPermission('employee-master-data-edit')
          && isFieldGroupChanged(PERSONAL_INFO_FIELDS);
      case 'details':
        return hasPermission('employee-master-data-edit')
          && isFieldGroupChanged(EMPLOYEE_DETAILS_FIELDS);
      case 'performance':
        return performanceSubTab === 'eval'
          && hasAnyPermission(
            'employee-master-data-evaluation-regularization-create',
            'employee-master-data-evaluation-regularization-edit',
          )
          && isFieldGroupChanged(EVALUATION_REGULARIZATION_FIELDS);
      case 'disciplinary':
      case 'offboarding':
      case 'workSchedule':
      case 'attendance':
        return false;
      default:
        // Any tab this switch doesn't know about (or before EmployeeTabs.jsx
        // has reported an active tab yet, on the very first render) — show
        // Save rather than surprise-hide it for an un-audited case.
        return true;
    }
  };

  useEffect(() => {
    if ((mode === 'edit' || mode === 'view') && initialData) {
      form.setFieldsValue({
        employee_code:     initialData.employee_code,
        last_name:         initialData.last_name,
        first_name:        initialData.first_name,
        middle_name:       initialData.middle_name,
        birth_date:        toDayjs(initialData.birth_date) || toDayjs(initialData.dob),
        gender:            initialData.gender,
        civil_status:      initialData.civil_status,
        contact:           initialData.contact,
        email:             initialData.email,
        address:           initialData.address,
        tin_no:            initialData.tin_no,
        pagibig_no:        initialData.pagibig_no,
        philhealth_no:     initialData.philhealth_no,
        sss_no:            initialData.sss_no,
        educ_attain:       initialData.educ_attain,
        school_year:       initialData.school_year,
        school_attended:   initialData.school_attended,
        course:            initialData.course,
        job_title_code:    initialData.job_title_code,
        position_id:       initialData.position_id,
        department_id:     initialData.department_id,
        branch_id:         initialData.branch_id,
        employment_type:   initialData.employment_type,
        date_employed:     toDayjs(initialData.date_employed),
        date_resigned:     toDayjs(initialData.date_resigned),
        regularization_date: toDayjs(initialData.regularization_date),
        regularization_interview_date: toDayjs(initialData.regularization_interview_date),
        regularization_interview_status: initialData.regularization_interview_status || null,
        application_source: initialData.application_source,
        active:             Boolean(initialData.active),
      });
    }
  }, [mode, initialData, form]);

  const buildPayload = (values) => ({
    employee_code:      values.employee_code,
    last_name:           values.last_name,
    first_name:          values.first_name,
    middle_name:         values.middle_name,
    birth_date:          values.birth_date ? values.birth_date.format('YYYY-MM-DD') : null,
    gender:              values.gender,
    civil_status:        values.civil_status,
    contact:             values.contact,
    email:               values.email,
    address:             values.address,
    tin_no:              values.tin_no,
    pagibig_no:          values.pagibig_no,
    philhealth_no:       values.philhealth_no,
    sss_no:              values.sss_no,
    educ_attain:         values.educ_attain,
    school_year:         values.school_year,
    school_attended:     values.school_attended,
    course:              values.course,
    job_title_code:      values.job_title_code,
    position_id:         values.position_id,
    department_id:       values.department_id,
    branch_id:           values.branch_id,
    employment_type:     values.employment_type,
    date_employed:       values.date_employed ? values.date_employed.format('YYYY-MM-DD') : null,
    date_resigned:       values.date_resigned ? values.date_resigned.format('YYYY-MM-DD') : null,
    regularization_date: values.regularization_date ? values.regularization_date.format('YYYY-MM-DD') : null,
    regularization_interview_date: values.regularization_interview_date ? values.regularization_interview_date.format('YYYY-MM-DD') : null,
    regularization_interview_status: values.regularization_interview_date ? values.regularization_interview_status || null : null,
    application_source:  values.application_source,
    active:              Boolean(values.active),
  });

  const handleSave = async () => {
    try {
      await form.validateFields();
      // validateFields() only returns fields that are mounted, and a tab's
      // fields only mount once it's opened — saving from Evaluation &
      // Regularization without opening Employee Details dropped branch/
      // position/employment type. The store holds every pre-filled value.
      const values = form.getFieldsValue(true);
      setSaving(true);
      const payload = buildPayload(values);
      if (mode === 'create') {
        const requestBody = buildCreateRequestBody(payload);
        const { data } = await employeeApi.create(requestBody);
        // store() returns HTTP 200 even on a validation failure (never
        // 422) — matches the same quirk documented on every sub-module
        // controller in this app. Genuinely new failure mode as of the
        // pending-files bundling above (a request with no files/pending
        // rows never hit these paths before): `employee_files_errors` (bad
        // file type/size) or the plain core-field validator errors object
        // (no `success`/`employee` key at all) both land here with a 200 —
        // without this check, they'd silently navigate away as if the
        // employee had actually been created.
        if (!data.employee && !data.employee_master_data) {
          if (data.work_schedules_errors) {
            const [rowErrors] = Object.values(data.work_schedules_errors);
            const [firstMessage] = Object.values(rowErrors || {}).flat();
            messageApi.error(`Work Schedule: ${firstMessage || 'Invalid work schedule.'}`);
            return;
          }
          const firstError = data.employee_files_errors
            ? Object.values(data.employee_files_errors)[0]
            : data;
          const message = typeof firstError === 'object'
            ? Object.values(firstError)[0]?.[0] || Object.values(firstError)[0]
            : firstError;
          messageApi.error(typeof message === 'string' ? message : 'Failed to create employee.');
          return;
        }
        // Resource key on the response ("employee"? "employee_master_data"?
        // per this backend's {success, message, <resource_key>} envelope
        // convention) is not confirmed against the live controller — fall
        // back to the submitted payload plus whatever id-bearing shape
        // comes back, rather than crashing on an unconfirmed field name.
        const saved = data.employee || data.employee_master_data || { ...payload, id: data.id };
        messageApi.success(data.message || 'Employee created.');
        navigate(`/employees/${saved.id}`, { state: { employee: saved } });
      } else {
        const { data } = await employeeApi.update(initialData.id, payload);
        // update() also answers a validation failure with HTTP 200 and the
        // bare field-error bag — don't report that as saved.
        if (!data.employee && !data.employee_master_data) {
          const [firstError] = Object.values(data || {});
          messageApi.error([].concat(firstError)[0] || 'Failed to update employee.');
          return;
        }
        // Same unconfirmed-resource-key caveat as create (above). The
        // fallback here additionally drops any nested relation object
        // (position/department/branch, used for the read-only Rank/
        // Division/Company display) whose FK actually changed in this
        // save — keeping `initialData`'s stale nested object would show
        // the employee's OLD rank/division/company on the page shown
        // immediately after the save. Real bug found and fixed 2026-09-15.
        const saved = data.employee || data.employee_master_data || {
          ...initialData,
          ...payload,
          position: payload.position_id === initialData.position_id ? initialData.position : undefined,
          department: payload.department_id === initialData.department_id ? initialData.department : undefined,
          branch: payload.branch_id === initialData.branch_id ? initialData.branch : undefined,
        };
        messageApi.success(data.message || 'Employee updated.');
        // update() switches a due Probationary employee who passed the
        // regularization interview to Regular, dated date_employed + 180 days.
        if (payload.employment_type !== 'Regular' && saved.employment_type === 'Regular') {
          messageApi.info(`Employment Type updated to Regular as of ${formatDate(saved.regularization_date)} (passed the regularization interview).`);
        }
        navigate(`/employees/${initialData.id}`, { state: { employee: saved } });
      }
    } catch (error) {
      if (!error.errorFields) handleApiError(error, messageApi);
    } finally {
      setSaving(false);
    }
  };

  // Matches EmployeeMasterData2.vue's dialog v-card-title exactly: base
  // title, then (only for an existing record, i.e. not Add) a
  // "<employee_code> - <Last, First, Middle>" segment and a colored
  // Active/Inactive chip, divider-separated. Vue joins last/first/middle
  // unconditionally (leaving a trailing ", " when middle_name is empty);
  // filtered here instead so a missing middle name doesn't dangle a comma.
  const employeeFullName = [employee?.last_name, employee?.first_name, employee?.middle_name]
    .filter(Boolean)
    .join(', ');
  const baseTitle = mode === 'create' ? 'Add Employee' : mode === 'edit' ? 'Edit Employee' : 'View Employee';
  const cardTitle = mode === 'create' ? baseTitle : (
    <Space separator={<Divider orientation="vertical" />} size="middle">
      <span>{baseTitle}</span>
      <span>{employee?.employee_code} - {employeeFullName}</span>
      <Tag color={isActiveValue(employee?.active) ? 'success' : 'default'}>
        {isActiveValue(employee?.active) ? 'Active' : 'Inactive'}
      </Tag>
    </Space>
  );

  return (
    <Card title={cardTitle}>
      <Form form={form} layout="vertical" disabled={readOnly} onValuesChange={handleValuesChange}>
        <EmployeeTabs
          mode={mode}
          initialData={employee}
          onEmployeeChange={patchEmployee}
          onActiveTabChange={setActiveTab}
          onPersonalSubTabChange={setPersonalSubTab}
          onPerformanceSubTabChange={setPerformanceSubTab}
          pendingCreateData={pendingCreateData}
          onPendingCreateDataChange={updatePendingCreateData}
        />

        <Divider />

        <Space>
          {!readOnly && isSaveVisible() && (
            <Button type="primary" onClick={handleSave} loading={saving}>
              Save
            </Button>
          )}
          <Button onClick={() => navigate('/employees')} disabled={saving}>
            {readOnly ? 'Back to List' : 'Cancel'}
          </Button>
        </Space>
      </Form>
    </Card>
  );
};

export default EmployeeForm;
