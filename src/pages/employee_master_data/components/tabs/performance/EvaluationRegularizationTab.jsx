import { useState } from "react";
import { Form, DatePicker, Select, Row, Col, Typography, Card, Tag, Spin, App } from "antd";

import employeeApi from "../../../../../services/employee/employeeApi";
import handleApiError from "../../../../../utils/handleApiError";
import downloadBlobResponse from "../../../../../utils/downloadBlobResponse";
import { DISPLAY_DATE_FORMAT } from "../../../../../utils/formatDate";
import FileSlotCard, { FileSlots } from "../../FileSlotCard";

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

export default function EvaluationRegularizationTab({ employeeId, mode, initialFiles = [], pendingFiles = [], onPendingFilesChange }) {
  const readOnly = mode === "view";
  const isCreateMode = mode === "create";

  return (
    <div>
      <Row gutter={16}>
        <Col xs={24} md={8}>
          {/* Filled by the backend (Direct Hire Since + 180 days) when a Passed
              interview regularizes the employee; HR can still change it. */}
          <Form.Item
            name="regularization_date"
            label="Date of Regularization"
            labelCol={{ span: 24 }}
            extra="Set automatically 180 days after Direct Hire Since once the interview is Passed; can be changed."
          >
            <DatePicker style={{ width: "100%" }} format={DISPLAY_DATE_FORMAT} disabled={readOnly} />
          </Form.Item>
        </Col>
        {/* A Passed result regularizes the employee (Employment Type →
            Regular) once due — see the backend's passedForRegularizationQuery(). */}
        <Col xs={24} md={8}>
          <Form.Item name="regularization_interview_date" label="Date of Regularization Interview" labelCol={{ span: 24 }}>
            <DatePicker style={{ width: "100%" }} format={DISPLAY_DATE_FORMAT} disabled={readOnly} />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item
            name="regularization_interview_status"
            label="Interview Result"
            labelCol={{ span: 24 }}
            dependencies={["regularization_interview_date"]}
            rules={[({ getFieldValue }) => ({
              validator: (_, value) => (getFieldValue("regularization_interview_date") && !value
                ? Promise.reject(new Error("Interview Result is required when the interview date is filled in"))
                : Promise.resolve()),
            })]}
          >
            <Select
              allowClear
              placeholder="Passed or Failed"
              disabled={readOnly}
              options={[
                { label: "Passed", value: "Passed" },
                { label: "Failed", value: "Failed" },
              ]}
            />
          </Form.Item>
        </Col>
      </Row>

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
