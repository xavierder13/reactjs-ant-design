import { useState } from "react";
import { Form, DatePicker, Upload, Button, Typography, Space, Popconfirm, App } from "antd";
import { UploadOutlined, DeleteOutlined, DownloadOutlined } from "@ant-design/icons";

import employeeApi from "../../../../../services/employee/employeeApi";
import handleApiError from "../../../../../utils/handleApiError";

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

function FileSlot({ label, title, employeeId, initialFiles, readOnly }) {
  const { message: messageApi } = App.useApp();
  // Matches the Vue reference's own `.find()` semantics — at most one
  // current file per title is shown; the most recently uploaded one wins.
  const initial = [...initialFiles].reverse().find((f) => f.title === title) || null;
  const [file, setFile] = useState(initial);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async ({ file: uploadFile, onSuccess, onError }) => {
    setUploading(true);
    try {
      const { data } = await employeeApi.fileUpload(employeeId, uploadFile, { title });
      const uploaded = data?.file || data?.employee_master_data_file || { id: `local-${Date.now()}`, file_name: uploadFile.name, title };
      setFile(uploaded);
      messageApi.success("File uploaded.");
      onSuccess?.(data);
    } catch (error) {
      handleApiError(error, messageApi);
      onError?.(error);
    } finally {
      setUploading(false);
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
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = file.file_name || file.name || label;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      handleApiError(error, messageApi);
    }
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <Typography.Text strong style={{ display: "block", marginBottom: 8 }}>{label}</Typography.Text>
      {file ? (
        <Space>
          <Typography.Text>{file.file_name || file.name}</Typography.Text>
          <Button type="link" icon={<DownloadOutlined />} onClick={handleDownload} />
          {!readOnly && (
            <Popconfirm title="Delete this file?" onConfirm={handleDelete}>
              <Button type="link" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ) : (
        !readOnly && (
          <Upload customRequest={handleUpload} showUploadList={false} disabled={uploading}>
            <Button icon={<UploadOutlined />} loading={uploading}>Upload</Button>
          </Upload>
        )
      )}
      {!file && readOnly && <Typography.Text type="secondary">Not uploaded.</Typography.Text>}
    </div>
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
function PendingFileSlot({ label, documentType, pendingFiles, onPendingFilesChange, readOnly }) {
  const entry = pendingFiles.find((f) => f.source === "regularization" && f.document_type === documentType);

  const handlePick = (file) => {
    const others = pendingFiles.filter((f) => !(f.source === "regularization" && f.document_type === documentType));
    onPendingFilesChange([...others, { id: `regularization-${documentType}`, file, document_type: documentType, source: "regularization" }]);
  };

  const handleRemove = () => {
    onPendingFilesChange(pendingFiles.filter((f) => !(f.source === "regularization" && f.document_type === documentType)));
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <Typography.Text strong style={{ display: "block", marginBottom: 8 }}>{label}</Typography.Text>
      {entry ? (
        <Space>
          <Typography.Text>{entry.file.name}</Typography.Text>
          {!readOnly && (
            <Button type="link" danger icon={<DeleteOutlined />} onClick={handleRemove} />
          )}
        </Space>
      ) : (
        !readOnly && (
          <Upload beforeUpload={(file) => { handlePick(file); return false; }} showUploadList={false}>
            <Button icon={<UploadOutlined />}>Select File</Button>
          </Upload>
        )
      )}
    </div>
  );
}

export default function EvaluationRegularizationTab({ employeeId, mode, initialFiles = [], pendingFiles = [], onPendingFilesChange }) {
  const readOnly = mode === "view";
  const isCreateMode = mode === "create";

  return (
    <div>
      <Form.Item
        name="regularization_date"
        label="Date of Regularization"
        labelCol={{ span: 24 }}
        style={{ maxWidth: 320 }}
      >
        <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
      </Form.Item>

      {employeeId ? (
        SLOTS.map((slot) => (
          <FileSlot
            key={slot.key}
            label={slot.title}
            title={slot.title}
            employeeId={employeeId}
            initialFiles={initialFiles}
            readOnly={readOnly}
          />
        ))
      ) : isCreateMode ? (
        SLOTS.map((slot) => (
          <PendingFileSlot
            key={slot.key}
            label={slot.title}
            documentType={slot.title}
            pendingFiles={pendingFiles}
            onPendingFilesChange={onPendingFilesChange}
            readOnly={readOnly}
          />
        ))
      ) : (
        <Typography.Text type="secondary">
          Save the employee first before attaching regularization documents.
        </Typography.Text>
      )}
    </div>
  );
}
