// Matches AttachFileDialog.vue's own list exactly (real company document
// types, not invented) — see vueportal for the source. The backend stores
// the picked type as the file's `title`.
export const DOCUMENT_TYPES = [
  "Application Form", "Resume", "Copy of Grades", "Background Investigation",
  "Birth Certificate", "Exam", "Diploma", "Police Clearance",
  "Health Declaration", "Contract of Employment", "Duties and Responsibilities",
];

// The two fixed attachments of Performance Management → Evaluation &
// Regularization (also offered in AttachFileDialog.vue's list).
export const REGULARIZATION_DOCUMENT_TYPES = [
  "Performance for Regularization", "Memo of Regularization",
];
