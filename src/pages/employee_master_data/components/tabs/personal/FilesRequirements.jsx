"use client";

import { useState } from "react";
import { Upload, Button, Select, Table, Popconfirm, Space, Tooltip, App } from "antd";
import { UploadOutlined, DeleteOutlined, DownloadOutlined } from "@ant-design/icons";
import employeeApi from "../../../../../services/employee/employeeApi";
import handleApiError from "../../../../../utils/handleApiError";

// Matches AttachFileDialog.vue's own list exactly (real company document
// types, not invented) — see vueportal for the source.
const DOCUMENT_TYPES = [
  "Application Form", "Resume", "Copy of Grades", "Background Investigation",
  "Birth Certificate", "Exam", "Diploma", "Police Clearance",
  "Health Declaration", "Contract of Employment", "Duties and Responsibilities",
];

// Upload/list/delete/download requirement attachments for an existing
// employee. Immediate-upload mode (below) needs a real employee id (the
// backend route is `/employee_master_data/file_upload/{id}`) — matches
// edit/view mode, where the employee already exists.
//
// Create mode (2026-09-24): matches EmployeeInformationTabs.vue's own
// "Upload File" button, which is NOT gated on `editedIndex > -1` at all —
// AttachFileDialog.vue only calls the immediate-upload API when
// `editedIndex > -1`; in create mode it just `$emit`s the picked file back
// up, staged locally into `employee_files` and bundled into the SAME
// multipart request that creates the employee
// (`EmployeeMasterDataController@store()`'s `employee_files[]`/
// `document_types[]` fields, confirmed by reading store() directly — "save
// the employee first" was a frontend-only restriction, not a real backend
// one). Ported the same way via the shared `pendingFiles` array lifted to
// EmployeeForm.jsx (also written to by EvaluationRegularizationTab.jsx's
// two fixed file slots — see that file for why they share one array) —
// `source: 'files_requirements'` scopes this list to only the entries it
// added.
//
// The exact response shape of file_upload (a single new file record? the
// full updated file list?) and the field name(s) on each file object
// (file_name? name? original_name?) are NOT confirmed against the live
// EmployeeMasterDataController — this renders defensively against several
// likely shapes rather than assuming one. Verify against a real response
// and simplify once confirmed.
export default function FilesRequirements({ employeeId, initialFiles = [], mode = "create", pendingFiles = [], onPendingFilesChange }) {
  const { message: messageApi } = App.useApp();
  const [files, setFiles] = useState(initialFiles);
  const [uploading, setUploading] = useState(false);
  const [pendingDocumentType, setPendingDocumentType] = useState(undefined);
  const readOnly = mode === "view";
  const isCreateMode = mode === "create";

  const handleUpload = async ({ file, onSuccess, onError }) => {
    setUploading(true);
    try {
      const { data } = await employeeApi.fileUpload(employeeId, file);
      const uploaded = data?.file || data?.employee_master_data_file || { id: `local-${Date.now()}`, file_name: file.name };
      setFiles((prev) => [...prev, uploaded]);
      messageApi.success('File uploaded.');
      onSuccess?.(data);
    } catch (error) {
      handleApiError(error, messageApi);
      onError?.(error);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (fileId) => {
    try {
      await employeeApi.fileDelete(fileId);
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
      messageApi.success('File deleted.');
    } catch (error) {
      handleApiError(error, messageApi);
    }
  };

  const handleDownload = async (file) => {
    try {
      const response = await employeeApi.fileDownload(file.id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = file.file_name || file.name || 'file';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      handleApiError(error, messageApi);
    }
  };

  const pendingOwnFiles = pendingFiles.filter((f) => f.source === "files_requirements");

  const handleAddPending = (file) => {
    if (!pendingDocumentType) {
      messageApi.warning('Select a document type first.');
      return false;
    }
    onPendingFilesChange([
      ...pendingFiles,
      { id: `files_requirements-${Date.now()}`, file, document_type: pendingDocumentType, source: "files_requirements" },
    ]);
    setPendingDocumentType(undefined);
    return false;
  };

  const handleRemovePending = (id) => {
    onPendingFilesChange(pendingFiles.filter((f) => f.id !== id));
  };

  if (isCreateMode) {
    return (
      <div>
        {!readOnly && (
          <Space style={{ marginBottom: 16 }}>
            <Select
              placeholder="Document type"
              style={{ width: 220 }}
              options={DOCUMENT_TYPES.map((t) => ({ label: t, value: t }))}
              value={pendingDocumentType}
              onChange={setPendingDocumentType}
            />
            <Upload beforeUpload={handleAddPending} showUploadList={false}>
              <Button icon={<UploadOutlined />}>Select File</Button>
            </Upload>
          </Space>
        )}

        <Table
          rowKey="id"
          size="small"
          bordered
          locale={{ emptyText: 'No files added yet.' }}
          dataSource={pendingOwnFiles}
          pagination={false}
          columns={[
            { title: 'Document Type', dataIndex: 'document_type' },
            { title: 'File Name', render: (_, entry) => entry.file.name },
            ...(!readOnly ? [{
              title: 'Actions',
              key: 'actions',
              width: 80,
              render: (_, entry) => (
                <Tooltip title="Remove">
                  <Button danger icon={<DeleteOutlined />} size="small" onClick={() => handleRemovePending(entry.id)} />
                </Tooltip>
              ),
            }] : []),
          ]}
        />
      </div>
    );
  }

  return (
    <div>
      {!readOnly && (
        <Upload customRequest={handleUpload} showUploadList={false} disabled={uploading}>
          <Button icon={<UploadOutlined />} loading={uploading}>Upload File</Button>
        </Upload>
      )}

      <Table
        rowKey="id"
        size="small"
        style={{ marginTop: 16 }}
        bordered
        locale={{ emptyText: 'No files uploaded yet.' }}
        dataSource={files}
        pagination={false}
        columns={[
          { title: 'File Name', render: (_, file) => file.file_name || file.name },
          {
            title: 'Actions',
            key: 'actions',
            width: 100,
            render: (_, file) => (
              <Space>
                <Tooltip title="Download">
                  <Button color="purple" variant="outlined" icon={<DownloadOutlined />} size="small" onClick={() => handleDownload(file)} />
                </Tooltip>
                {!readOnly && (
                  <Popconfirm title="Delete this file?" onConfirm={() => handleDelete(file.id)}>
                    <Tooltip title="Delete">
                      <Button danger icon={<DeleteOutlined />} size="small" />
                    </Tooltip>
                  </Popconfirm>
                )}
              </Space>
            ),
          },
        ]}
      />
    </div>
  );
}
