"use client";

import { useState } from "react";
import { Upload, Button, List, Popconfirm, Typography, Empty, App } from "antd";
import { UploadOutlined, DeleteOutlined, DownloadOutlined } from "@ant-design/icons";
import employeeApi from "../../../../../services/employee/employeeApi";
import handleApiError from "../../../../../utils/handleApiError";

// Upload/list/delete/download requirement attachments for an existing
// employee. File upload needs a real employee id (the backend route is
// `/employee_master_data/file_upload/{id}`), so this is unavailable until
// after the employee's core record has been saved once — matching Create
// mode not having an id yet.
//
// The exact response shape of file_upload (a single new file record? the
// full updated file list?) and the field name(s) on each file object
// (file_name? name? original_name?) are NOT confirmed against the live
// EmployeeMasterDataController — this renders defensively against several
// likely shapes rather than assuming one. Verify against a real response
// and simplify once confirmed.
export default function FilesRequirements({ employeeId, initialFiles = [], mode = "create" }) {
  const { message: messageApi } = App.useApp();
  const [files, setFiles] = useState(initialFiles);
  const [uploading, setUploading] = useState(false);
  const readOnly = mode === "view";

  if (!employeeId) {
    return (
      <Empty description="Save the employee's Personal Data and Employee Details first — file attachments are uploaded against an existing employee record." />
    );
  }

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

  return (
    <div>
      {!readOnly && (
        <Upload customRequest={handleUpload} showUploadList={false} disabled={uploading}>
          <Button icon={<UploadOutlined />} loading={uploading}>Upload File</Button>
        </Upload>
      )}

      <List
        style={{ marginTop: 16 }}
        bordered
        locale={{ emptyText: 'No files uploaded yet.' }}
        dataSource={files}
        renderItem={(file) => (
          <List.Item
            actions={[
              <Button key="download" type="link" icon={<DownloadOutlined />} onClick={() => handleDownload(file)} />,
              ...(!readOnly ? [
                <Popconfirm key="delete" title="Delete this file?" onConfirm={() => handleDelete(file.id)}>
                  <Button type="link" danger icon={<DeleteOutlined />} />
                </Popconfirm>,
              ] : []),
            ]}
          >
            <Typography.Text>{file.file_name || file.name}</Typography.Text>
          </List.Item>
        )}
      />
    </div>
  );
}
