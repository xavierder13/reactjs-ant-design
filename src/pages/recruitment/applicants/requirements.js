// Applicant requirements — recruitment-portal's current rules
// (ApplicationProgressDialog.vue, ApplicantFiles.vue, ApplicantDataTable.vue).

// Upload "Document Type" choices; "Others" asks for a name, which becomes the title.
export const DOC_TYPES = [
  'Exam', 'Background Investigation', 'Diploma or Certification', 'Copy of Grades',
  'Birth Certificate', 'Police Clearance', 'Health Declaration', 'SSS', 'Pag-IBIG',
  'PhilHealth', 'TIN', "Driver's License", 'Drive Test Result', 'Final Interview Result', 'Others',
];

export const UPLOAD_EXTENSIONS = ['jpeg', 'jpg', 'png', 'docs', 'docx', 'pdf'];
export const UPLOAD_MAX_MB = 20;

// Files that must exist before Exam / Final Interview can be set to Passed.
// TIN was dropped from the final list by the portal (its status dialog and
// files checklist; only its list icon still counts it).
export const EXAM_REQUIRED_FILES = ['Exam'];
const FINAL_REQUIRED_FILES = [
  'Background Investigation', 'Final Interview Result', 'Birth Certificate', 'Police Clearance',
  'Diploma or Certification', 'Health Declaration', 'SSS', 'Pag-IBIG', 'PhilHealth',
];
const DRIVER_POSITIONS = ['Logistics Driver', 'C.I Collector', 'Technician'];

// `employmentPosition` is the position NAME (callers resolve ids first).
export const finalRequiredFiles = (employmentPosition) => (
  DRIVER_POSITIONS.includes(employmentPosition) ? [...FINAL_REQUIRED_FILES, "Driver's License"] : FINAL_REQUIRED_FILES
);

// Required titles not among `files` (portal checklist matches case-insensitively).
export const missingFiles = (required, files) => {
  const titles = new Set((files || []).map((f) => String(f.title || '').toLowerCase()));
  return required.filter((t) => !titles.has(t.toLowerCase()));
};

// Personal details an applicant past screening must have filled in, plus at
// least one education and one reference record.
const REQUIRED_DETAILS = [
  'lastname', 'firstname', 'address', 'address2', 'birthdate', 'birth_place', 'gender',
  'civil_status', 'contact_no', 'email', 'educ_attain', 'citizenship', 'religion', 'height', 'weight',
];

export const detailsComplete = (applicant, educAttains, references) => (
  REQUIRED_DETAILS.every((f) => applicant?.[f]) && educAttains?.length > 0 && references?.length > 0
);

// A gateway / portal failure as one line. Shapes seen: { error: "..." }
// (gateway refusals, relayed by vueportal), { error: { field: [msg] } }
// (validation bags), { warning } (portal, HTTP 200), { message }.
export const gatewayMessage = (body, fallback = 'The careers portal request failed.') => {
  if (!body) return fallback;
  const { error, warning, message } = body;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    const first = Object.values(error)[0];
    return Array.isArray(first) ? first[0] : String(first);
  }
  return warning || message || fallback;
};

export const errorMessage = (err, fallback) => gatewayMessage(err?.response?.data, fallback);
