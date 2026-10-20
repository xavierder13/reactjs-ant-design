import { useState } from "react";
import { Form, Typography, Card, Tag, Spin, Descriptions, App } from "antd";

import employeeApi from "../../../../../services/employee/employeeApi";
import handleApiError from "../../../../../utils/handleApiError";
import downloadBlobResponse from "../../../../../utils/downloadBlobResponse";
import { DISPLAY_DATE_FORMAT, formatDate, toDayjs } from "../../../../../utils/formatDate";
import FileSlotCard, { FileSlots } from "../../FileSlotCard";
import RegularizationDateWarning from "../../RegularizationDateWarning";
import RegularizationInterviews from "./RegularizationInterviews";

// vueportal's "Evaluation & Regularization" sub-tab (EmployeeInformationTabs.vue)
// is not its own CRUD module like the other 6 Performance Management
// sub-tabs — it's just a `regularization_date` field on the core
// employee_master_data record (confirmed handled in
// EmployeeMasterDataController@store/update, same endpoint as every other
// core field) plus two specific file attachments distinguished only by
// their `title` metadata ("Performance for Regularization", "Memo of
// Regularization"), reusing the exact same file_upload/file_delete/
// file_download endpoints as the Personal Data tab's Files & Requirements.
//
// `regularization_date` is a bare Form.Item relying on EmployeeForm.jsx's
// shared ancestor Form context (see that file and PersonalInformation.jsx
// for why — it is NOT its own <Form>) and is saved by the main Save
// button, not a dedicated action here. The two file slots, like Files &
// Requirements, persist immediately on upload/delete — they are not part
// of the form's own payload.
const SLOTS = [
  { key: "performance", title: "Performance for Regularization" },
  { key: "memo", title: "Memo of Regularization" },
];

// file_upload answers HTTP 200 with `{ error }` on failure — a string, or a
// validator bag like `{ file_ext: ["..."] }`. Pull out the first message.
const uploadErrorMessage = (error) => {
  if (typeof error === "string") return error;
  const first = Object.values(error || {})[0];
  return [].concat(first)[0] || "Failed to upload file.";
};

// One saved slot: uploads as soon as a file is picked (like Files &
// Requirements), so the card's "pending" state only lasts while uploading.
function FileSlot({ title, employeeId, initialFiles, readOnly }) {
  const { message: messageApi } = App.useApp();
  // Matches the Vue reference's own `.find()` semantics — at most one
  // current file per title is shown; the most recently uploaded one wins.
  const initial = [...initialFiles].reverse().find((f) => f.title === title) || null;
  const [file, setFile] = useState(initial);
  const [uploading, setUploading] = useState(null);

  const handleUpload = async (uploadFile) => {
    if (!uploadFile) return;
    setUploading(uploadFile);
    try {
      // The backend stores `document_type` as the file's `title`, which is
      // how this slot finds its file again after a reload.
      const { data } = await employeeApi.fileUpload(employeeId, uploadFile, { document_type: title });
      if (data?.error || !data?.file) {
        messageApi.error(uploadErrorMessage(data?.error));
        return;
      }
      setFile(data.file);
      messageApi.success("File uploaded.");
    } catch (error) {
      handleApiError(error, messageApi);
    } finally {
      setUploading(null);
    }
  };

  const handleDelete = async () => {
    try {
      await employeeApi.fileDelete(file.id);
      setFile(null);
      messageApi.success("File deleted.");
    } catch (error) {
      handleApiError(error, messageApi);
    }
  };

  const handleDownload = async () => {
    try {
      const response = await employeeApi.fileDownload(file.id);
      await downloadBlobResponse(response, file.file_name || title, messageApi);
    } catch (error) {
      handleApiError(error, messageApi);
    }
  };

  if (readOnly && !file) {
    return (
      <Card size="small" title={title} extra={<Tag>No file</Tag>} style={{ height: "100%" }}>
        <Typography.Text type="secondary">Not uploaded.</Typography.Text>
      </Card>
    );
  }

  return (
    <Spin spinning={Boolean(uploading)} description="Uploading…">
      <FileSlotCard
        label={title}
        fileName={file?.file_name}
        pendingFile={uploading}
        onPendingFileChange={handleUpload}
        onDownload={handleDownload}
        onDelete={readOnly ? undefined : handleDelete}
      />
    </Spin>
  );
}

// Staged (not yet uploaded) version of FileSlot for create mode — matches
// Offboarding.vue-style local staging, not an API call: picks a file
// locally and reports it up via onPendingFilesChange, bundled into the
// employee_files[]/document_types[] fields on the initial create request
// (see EmployeeForm.jsx). Uses the SAME shared pendingFiles array
// PersonalDataTab's Files & Requirements writes into — matches the
// backend, which puts regularization files through that exact same
// employee_files[]/document_types[] mechanism (confirmed by reading
// EmployeeMasterDataController@store()'s save() call directly: Vue's own
// regularization_file_input/regularization_memo_file_input are appended
// into the same formData.append('employee_files[]', ...) calls as the
// generic Files & Requirements ones, not a separate field). `source` tags
// which UI staged an entry so each one only displays/edits its own.
function PendingFileSlot({ label, documentType, pendingFiles, onPendingFilesChange }) {
  const isOwn = (f) => f.source === "regularization" && f.document_type === documentType;
  const entry = pendingFiles.find(isOwn);

  const handleChange = (file) => {
    const others = pendingFiles.filter((f) => !isOwn(f));
    onPendingFilesChange(file
      ? [...others, { id: `regularization-${documentType}`, file, document_type: documentType, source: "regularization" }]
      : others);
  };

  return (
    <FileSlotCard
      label={label}
      pendingFile={entry?.file || null}
      onPendingFileChange={handleChange}
    />
  );
}

// View mode: the form's value as text (Form.Item passes it as `value`), like
// the profile's Employment tab.
const DateText = ({ value }) => formatDate(value);
const ResultText = ({ value }) => (value ? <Tag color={value === "Passed" ? "green" : "red"}>{value}</Tag> : "-");

// Date of Regularization is never typed (DOLE: Direct Hire Since + 180 days,
// set by the backend when the employee is regularized). Not set yet: the
// date it will be, from `dueFrom` (Direct Hire Since).
const RegularizationDateText = ({ value, dueFrom }) => {
  if (toDayjs(value)) return formatDate(value);
  const since = toDayjs(dueFrom);
  return since
    ? <Typography.Text type="secondary">Due {since.add(180, "day").format(DISPLAY_DATE_FORMAT)}</Typography.Text>
    : "-";
};

// `directHireSince`: the saved employee's direct_hire_since; on Add Employee
// (none yet) the form's Date Employed stands in for it.
// `onRegularizationChange(employeeFields)`: after an interview is saved —
// the employee's resulting employment_type / regularization_date /
// regularization_interview_date / _status.
export default function EvaluationRegularizationTab({
  employeeId, mode, directHireSince, initialInterviews, onRegularizationChange,
  initialFiles = [], pendingFiles = [], onPendingFilesChange,
}) {
  const readOnly = mode === "view";
  const regularizationDate = Form.useWatch("regularization_date");
  const dateEmployed = Form.useWatch("date_employed");
  const dueFrom = directHireSince || dateEmployed;
  // flags an older stored date that isn't Direct Hire Since + 180
  const warning = <RegularizationDateWarning regularizationDate={regularizationDate} directHireSince={dueFrom} />;
  const regularizationDateText = <Form.Item name="regularization_date" noStyle><RegularizationDateText dueFrom={dueFrom} /></Form.Item>;
  const isCreateMode = mode === "create";

  return (
    <div>
      {/* All three are set by the backend: the regularization date is
          Direct Hire Since + 180 days (DOLE), the interview date / result
          are the final interview's (RegularizationInterviews below). */}
      <Descriptions
        size="small"
        column={{ xs: 1, sm: 2, lg: 3 }}
        style={{ marginBottom: 16 }}
        items={[
          { key: "regularized", label: "Date of Regularization", children: <>{regularizationDateText}{warning}</> },
          { key: "interview", label: "Final Interview Date", children: <Form.Item name="regularization_interview_date" noStyle><DateText /></Form.Item> },
          { key: "result", label: "Overall Result", children: <Form.Item name="regularization_interview_status" noStyle><ResultText /></Form.Item> },
        ]}
      />

      <Typography.Title level={5} style={{ marginTop: 0 }}>Regularization Interviews</Typography.Title>
      <Typography.Paragraph type="secondary">
        The final interview (latest date) decides the overall result. A Passed result regularizes the employee
        once due (150 days after Direct Hire Since), dated 180 days after Direct Hire Since.
      </Typography.Paragraph>
      {employeeId ? (
        <RegularizationInterviews
          employeeId={employeeId}
          mode={mode}
          initialRecords={initialInterviews}
          onResult={onRegularizationChange}
        />
      ) : (
        <Typography.Paragraph type="secondary">Save the employee first before adding interviews.</Typography.Paragraph>
      )}

      {employeeId ? (
        <FileSlots>
          {SLOTS.map((slot) => (
            <FileSlot
              key={slot.key}
              title={slot.title}
              employeeId={employeeId}
              initialFiles={initialFiles}
              readOnly={readOnly}
            />
          ))}
        </FileSlots>
      ) : isCreateMode ? (
        <FileSlots>
          {SLOTS.map((slot) => (
            <PendingFileSlot
              key={slot.key}
              label={slot.title}
              documentType={slot.title}
              pendingFiles={pendingFiles}
              onPendingFilesChange={onPendingFilesChange}
            />
          ))}
        </FileSlots>
      ) : (
        <Typography.Text type="secondary">
          Save the employee first before attaching regularization documents.
        </Typography.Text>
      )}
    </div>
  );
}
