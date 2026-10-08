import { useState } from "react";
import { Card, Table, Select, Upload, Button, Space, Tooltip, Popconfirm, Tag, Typography, App } from "antd";
import {
  UploadOutlined, DownloadOutlined, DeleteOutlined,
  FileOutlined, FilePdfOutlined, FileWordOutlined, FileImageOutlined,
} from "@ant-design/icons";

import employeeApi from "../../../services/employee/employeeApi";
import handleApiError from "../../../utils/handleApiError";
import downloadBlobResponse from "../../../utils/downloadBlobResponse";
import { formatDate } from "../../../utils/formatDate";
import { DOCUMENT_TYPES, REGULARIZATION_DOCUMENT_TYPES } from "../components/tabs/personal/documentTypes";
import { tablePagination } from '../../../utils/tablePagination';

const ACCEPTED_FILE_TYPES = ".jpeg,.jpg,.png,.docs,.docx,.pdf";
const TYPE_OPTIONS = [...DOCUMENT_TYPES, ...REGULARIZATION_DOCUMENT_TYPES].map((t) => ({ label: t, value: t }));

const fileIcon = (name = "") => {
  const ext = name.split(".").pop().toLowerCase();
  if (ext === "pdf") return <FilePdfOutlined style={{ color: "#cf1322" }} />;
  if (["doc", "docx", "docs"].includes(ext)) return <FileWordOutlined style={{ color: "#1677ff" }} />;
  if (["jpg", "jpeg", "png"].includes(ext)) return <FileImageOutlined style={{ color: "#389e0d" }} />;
  return <FileOutlined />;
};

// The backend prefixes stored names with a Unix timestamp (`time().name`).
const displayName = (fileName = "") => fileName.replace(/^\d{10}/, "");

// file_upload answers HTTP 200 with `{ error }` on failure — a string or a
// validator bag. Pull out the first message.
const uploadErrorMessage = (error) => {
  if (typeof error === "string") return error;
  const first = Object.values(error || {})[0];
  return [].concat(first)[0] || "Failed to upload file.";
};

// Every file attached to the employee (core employee_master_data_files:
// Files & Requirements plus the Evaluation & Regularization attachments),
// with upload/download/delete per permission. Uploads require a document
// type, saved as the file's `title`.
export default function ProfileDocuments({ employee, canUpload, canDownload, canDelete }) {
  const { message: messageApi } = App.useApp();
  const [files, setFiles] = useState(employee.files || []);
  const [documentType, setDocumentType] = useState(undefined);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (file) => {
    if (!documentType) {
      messageApi.warning("Select a document type first.");
      return false;
    }
    setUploading(true);
    try {
      const { data } = await employeeApi.fileUpload(employee.id, file, { document_type: documentType });
      if (data?.error || !data?.file) {
        messageApi.error(uploadErrorMessage(data?.error));
        return false;
      }
      setFiles((prev) => [...prev, data.file]);
      setDocumentType(undefined);
      messageApi.success("File uploaded.");
    } catch (error) {
      handleApiError(error, messageApi);
    } finally {
      setUploading(false);
    }
    return false;
  };

  const handleDownload = async (file) => {
    try {
      const response = await employeeApi.fileDownload(file.id);
      await downloadBlobResponse(response, displayName(file.file_name) || "file", messageApi);
    } catch (error) {
      handleApiError(error, messageApi);
    }
  };

  const handleDelete = async (file) => {
    try {
      await employeeApi.fileDelete(file.id);
      setFiles((prev) => prev.filter((f) => f.id !== file.id));
      messageApi.success("File deleted.");
    } catch (error) {
      handleApiError(error, messageApi);
    }
  };

  const columns = [
    {
      title: "Document",
      key: "document",
      render: (_, file) => (
        <Space>
          <span style={{ fontSize: 20 }}>{fileIcon(file.file_name)}</span>
          <Typography.Text ellipsis={{ tooltip: displayName(file.file_name) }} style={{ maxWidth: 320 }}>
            {displayName(file.file_name)}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: "Type",
      dataIndex: "title",
      key: "title",
      filters: [...new Set(files.map((f) => f.title || "Untitled"))].map((t) => ({ text: t, value: t })),
      onFilter: (value, file) => (file.title || "Untitled") === value,
      render: (title) => (title ? <Tag>{title}</Tag> : <Typography.Text type="secondary">Untitled</Typography.Text>),
    },
    {
      title: "Uploaded",
      key: "uploaded",
      render: (_, file) => formatDate(file.created_at),
      sorter: (a, b) => String(a.created_at || "").localeCompare(String(b.created_at || "")),
      defaultSortOrder: "descend",
    },
    ...(canDownload || canDelete ? [{
      title: "Actions",
      key: "actions",
      width: 100,
      render: (_, file) => (
        <Space>
          {canDownload && (
            <Tooltip title="Download">
              <Button color="purple" variant="outlined" icon={<DownloadOutlined />} size="small" onClick={() => handleDownload(file)} />
            </Tooltip>
          )}
          {canDelete && (
            <Popconfirm title="Delete this file?" onConfirm={() => handleDelete(file)} okButtonProps={{ danger: true }} okText="Delete">
              <Tooltip title="Delete">
                <Button danger icon={<DeleteOutlined />} size="small" />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    }] : []),
  ];

  return (
    <Card
      title="Documents"
      size="small"
      extra={canUpload && (
        <Space wrap>
          <Select
            placeholder="Document type"
            style={{ width: 240 }}
            options={TYPE_OPTIONS}
            value={documentType}
            onChange={setDocumentType}
            showSearch
          />
          <Upload accept={ACCEPTED_FILE_TYPES} showUploadList={false} beforeUpload={handleUpload} disabled={uploading}>
            <Button type="primary" icon={<UploadOutlined />} loading={uploading}>Upload</Button>
          </Upload>
        </Space>
      )}
    >
      <Table
        rowKey="id"
        size="small"
        dataSource={files}
        columns={columns}
        pagination={files.length > 10 ? tablePagination(10) : false}
        locale={{ emptyText: "No documents uploaded yet." }}
        scroll={{ x: "max-content" }}
      />
    </Card>
  );
}
