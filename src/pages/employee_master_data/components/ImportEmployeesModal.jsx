"use client";

import { useState } from "react";
import { Modal, Upload, Button, App, Typography } from "antd";
import { InboxOutlined } from "@ant-design/icons";
import employeeApi from "../../../services/employee/employeeApi";
import handleApiError from "../../../utils/handleApiError";

const { Dragger } = Upload;

// The expected spreadsheet column layout and the shape of a per-row
// validation failure are not confirmed against vueportal's live `import()`
// handler (maatwebsite/excel-based, per its own CLAUDE.md) — errors are
// surfaced generically via handleApiError rather than a bespoke per-row
// error table. See the employee-master-data skill's "Unconfirmed Backend
// Contracts" section.
export default function ImportEmployeesModal({ open, onClose, onImported }) {
  const { message: messageApi } = App.useApp();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleClose = () => {
    if (uploading) return;
    setFile(null);
    onClose();
  };

  const handleImport = async () => {
    if (!file) {
      messageApi.warning('Select a file first.');
      return;
    }
    setUploading(true);
    try {
      const { data } = await employeeApi.import(file);
      messageApi.success(data?.message || 'Employees imported.');
      setFile(null);
      onImported?.();
      onClose();
    } catch (error) {
      handleApiError(error, messageApi);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Import Employees"
      onCancel={handleClose}
      destroyOnHidden
      footer={[
        <Button key="cancel" onClick={handleClose} disabled={uploading}>Cancel</Button>,
        <Button key="import" type="primary" loading={uploading} disabled={!file} onClick={handleImport}>
          Import
        </Button>,
      ]}
    >
      <Dragger
        multiple={false}
        accept=".xlsx,.xls,.csv"
        beforeUpload={(selected) => { setFile(selected); return false; }}
        onRemove={() => setFile(null)}
        fileList={file ? [file] : []}
      >
        <p className="ant-upload-drag-icon"><InboxOutlined /></p>
        <p className="ant-upload-text">Click or drag a spreadsheet to this area to upload</p>
        <p className="ant-upload-hint">Accepts .xlsx, .xls, or .csv.</p>
      </Dragger>
      <Typography.Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0 }}>
        The expected column layout isn't confirmed against the backend's
        import handler — if the upload fails, the error message should
        say which column or row it rejected.
      </Typography.Paragraph>
    </Modal>
  );
}
