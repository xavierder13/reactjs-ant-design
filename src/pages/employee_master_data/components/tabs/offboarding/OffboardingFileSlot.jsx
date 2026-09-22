import { Form, Upload, Button, Typography, Space, Popconfirm, App } from "antd";
import { UploadOutlined, DeleteOutlined, DownloadOutlined } from "@ant-design/icons";

import handleApiError from "../../../../../utils/handleApiError";
import offboardingApi from "../../../../../services/employee/offboardingApi";

const ACCEPTED_FILE_TYPES = ".jpeg,.jpg,.png,.docs,.docx,.pdf";

// One of Offboarding's three independent file slots (Last Day File,
// Clearance File, Quitclaim File) — download/delete when a file already
// exists, otherwise a pending-upload picker. Same backend limitation as
// Disciplinary/NTE: once a slot has a file, re-uploading via update() is
// silently ignored server-side, so only Download/Delete are offered once
// one exists — delete first to replace it. Only usable once the record
// has an id (a brand-new record has nothing to scope a file_delete/
// file_download call to), matching NteRecordsTab.jsx's equivalent split.
export default function OffboardingFileSlot({
  label, documentType, record, pendingFile, onPendingFileChange, canDownload, canDeleteFile, onFileDeleted,
}) {
  const { message: messageApi } = App.useApp();
  const fileNameField = `${documentType}_name`;
  const fileName = record?.[fileNameField];

  const handleDownload = async () => {
    try {
      const response = await offboardingApi.fileDownload(record.id, documentType);
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName || "file";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      handleApiError(error, messageApi);
    }
  };

  const handleDelete = async () => {
    try {
      const { data } = await offboardingApi.fileDelete(record.id, documentType);
      onFileDeleted(data.offboardings);
      messageApi.success("File deleted.");
    } catch (error) {
      handleApiError(error, messageApi);
    }
  };

  return (
    <Form.Item label={label}>
      {fileName ? (
        <Space>
          <Typography.Text>{fileName}</Typography.Text>
          {canDownload && <Button type="link" icon={<DownloadOutlined />} size="small" onClick={handleDownload} />}
          {canDeleteFile && (
            <Popconfirm title="Delete this file?" onConfirm={handleDelete}>
              <Button type="link" danger icon={<DeleteOutlined />} size="small" />
            </Popconfirm>
          )}
        </Space>
      ) : (
        <Upload
          accept={ACCEPTED_FILE_TYPES}
          beforeUpload={(file) => { onPendingFileChange(file); return false; }}
          onRemove={() => onPendingFileChange(null)}
          fileList={pendingFile ? [pendingFile] : []}
          maxCount={1}
        >
          <Button icon={<UploadOutlined />}>Select File</Button>
        </Upload>
      )}
    </Form.Item>
  );
}
