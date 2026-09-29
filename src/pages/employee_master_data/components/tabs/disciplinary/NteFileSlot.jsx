import { Form, Button, Space, Popconfirm, Typography, Upload, App } from "antd";
import { DeleteOutlined, UploadOutlined, DownloadOutlined } from "@ant-design/icons";

import handleApiError from "../../../../../utils/handleApiError";
import nteApi from "../../../../../services/employee/nteApi";

const ACCEPTED_FILE_TYPES = ".jpeg,.jpg,.png,.docs,.docx,.pdf";

// One file slot (NTE File or Explanation File) — download/delete when a
// file already exists, otherwise a pending-upload picker. Matches
// disciplinaryApi's single-file pattern, duplicated per slot since NTE
// records carry two independent files (see nteApi.js).
export default function NteFileSlot({ label, documentType, record, pendingFile, onPendingFileChange, canDownload, canDeleteFile, onFileDeleted }) {
  const { message: messageApi } = App.useApp();
  const fileName = documentType === "nte_file" ? record?.nte_file_name : record?.explanation_file_name;

  const handleDownload = async () => {
    try {
      const response = await nteApi.fileDownload(record.id, documentType);
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
      const { data } = await nteApi.fileDelete(record.id, documentType);
      onFileDeleted(data.explanations);
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
