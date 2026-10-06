import { Form, Button, Space, Popconfirm, Typography, Upload, Card, Tag, Tooltip, Row, Col } from "antd";
import {
  DeleteOutlined, DownloadOutlined, InboxOutlined, CloseOutlined,
  FileOutlined, FilePdfOutlined, FileWordOutlined, FileImageOutlined,
} from "@ant-design/icons";

const ACCEPTED_FILE_TYPES = ".jpeg,.jpg,.png,.docs,.docx,.pdf";

const fileIcon = (name = "") => {
  const ext = name.split(".").pop().toLowerCase();
  if (ext === "pdf") return <FilePdfOutlined style={{ color: "#cf1322" }} />;
  if (["doc", "docx", "docs"].includes(ext)) return <FileWordOutlined style={{ color: "#1677ff" }} />;
  if (["jpg", "jpeg", "png"].includes(ext)) return <FileImageOutlined style={{ color: "#389e0d" }} />;
  return <FileOutlined />;
};

// Shrinks to the space left beside the buttons (narrow cards cut the name
// with an ellipsis and show it in full on hover).
const FileName = ({ name }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1 }}>
    <span style={{ fontSize: 28, lineHeight: 1, flexShrink: 0 }}>{fileIcon(name)}</span>
    <Typography.Text ellipsis={{ tooltip: name }} style={{ minWidth: 0 }}>{name}</Typography.Text>
  </div>
);

// A row of file cards, `perRow` per row (stacked on phones). Render inside
// the caller's <Form>. The backend ignores an upload over an existing file,
// hence the default hint (pass hint={null} where nothing can be changed).
export function FileSlots({ children, perRow = 2, hint = "To replace a file, delete it first." }) {
  return (
    <Form.Item label="Attachments" extra={hint}>
      <Row gutter={[16, 16]}>
        {[].concat(children).filter(Boolean).map((child, i) => (
          <Col key={i} xs={24} md={24 / perRow}>{child}</Col>
        ))}
      </Row>
    </Form.Item>
  );
}

// One attachment card. With a saved file (`fileName`): name + download/delete.
// Without one: a drag-and-drop picker whose file is held as pending until the
// record is saved. Pass `onDownload`/`onDelete` only when the user may do
// that; omitted means the button is hidden. `readOnly` shows "Not uploaded."
// instead of the picker.
export default function FileSlotCard({ label, fileName, pendingFile, onPendingFileChange, onDownload, onDelete, readOnly = false }) {
  const status = fileName
    ? <Tag color="success">Attached</Tag>
    : pendingFile
      ? <Tag color="processing">Ready to upload</Tag>
      : <Tag>No file</Tag>;

  let body;
  if (fileName) {
    body = (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <FileName name={fileName} />
        <Space style={{ flexShrink: 0 }}>
          {onDownload && (
            <Tooltip title="Download">
              <Button color="purple" variant="outlined" icon={<DownloadOutlined />} size="small" onClick={onDownload} />
            </Tooltip>
          )}
          {onDelete && (
            <Popconfirm title="Delete this file?" onConfirm={onDelete} okButtonProps={{ danger: true }} okText="Delete">
              <Tooltip title="Delete">
                <Button danger icon={<DeleteOutlined />} size="small" />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      </div>
    );
  } else if (pendingFile) {
    body = (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <FileName name={pendingFile.name} />
        <Tooltip title="Remove">
          <Button type="text" icon={<CloseOutlined />} size="small" onClick={() => onPendingFileChange(null)} />
        </Tooltip>
      </div>
    );
  } else if (readOnly) {
    body = <Typography.Text type="secondary">Not uploaded.</Typography.Text>;
  } else {
    body = (
      <Upload.Dragger
        accept={ACCEPTED_FILE_TYPES}
        beforeUpload={(file) => { onPendingFileChange(file); return false; }}
        showUploadList={false}
        maxCount={1}
        style={{ padding: "4px 8px" }}
      >
        <p className="ant-upload-drag-icon" style={{ marginBottom: 4 }}><InboxOutlined /></p>
        <p className="ant-upload-text" style={{ fontSize: 14 }}>Click or drag file here</p>
        <p className="ant-upload-hint" style={{ fontSize: 12 }}>PDF, DOCX, JPG, PNG</p>
      </Upload.Dragger>
    );
  }

  return (
    <Card size="small" title={label} extra={status} style={{ height: "100%" }}>
      {body}
    </Card>
  );
}
