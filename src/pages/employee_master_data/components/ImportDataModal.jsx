"use client";

import { useState } from "react";
import { Modal, Upload, Button, Select, Table, App } from "antd";
import { InboxOutlined } from "@ant-design/icons";
import useAuth from "../../../hooks/useAuth";
import handleApiError from "../../../utils/handleApiError";
import employeeApi from "../../../services/employee/employeeApi";
import workScheduleApi from "../../../services/employee/workScheduleApi";

const { Dragger } = Upload;

// Matches vueportal's ImportDialog.vue exactly: one entry point with a
// "Document Type" dropdown (same list as GenerateTemplateModal.jsx's, kept
// in sync with it — a type belongs in one of these two dialogs only if it
// belongs in both), a file picker, and the shared response contract every
// sibling *Controller@import() action uses: HTTP 200 even on validation
// failure (never 422), with `success` | `error_column` |
// `error_row_data`+`field_values` | `error_empty` telling you which
// happened. Checked explicitly here, not routed through the generic
// handleApiError — that only fires on a real HTTP error status and would
// silently treat a validation failure as success otherwise, since 200
// never reaches a catch block. This replaces the previous
// ImportEmployeesModal.jsx, which had exactly that bug (no success/error
// shape check at all — see git history) — real defect, not hypothetical,
// found while building this. See workScheduleApi.js/employeeApi.js's own
// header comments for the confirmed backend contract.
const DOCUMENT_TYPES = [
  {
    value: 'employee_master_data',
    label: 'Employee Master Data',
    permission: 'employee-master-data-import',
    upload: (file) => employeeApi.import(file),
  },
  {
    value: 'work_schedule',
    label: 'Work Schedule',
    permission: 'employee-master-data-work-schedule-import',
    upload: (file) => workScheduleApi.import(file),
  },
];

export default function ImportDataModal({ open, onClose, onImported }) {
  const { message: messageApi } = App.useApp();
  const { hasPermission } = useAuth();
  const [documentType, setDocumentType] = useState(undefined);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  // null = error-list modal closed; an array (possibly empty) = open.
  const [errorRows, setErrorRows] = useState(null);

  const options = DOCUMENT_TYPES.filter((type) => hasPermission(type.permission))
    .map(({ value, label }) => ({ value, label }));

  const resetState = () => {
    setDocumentType(undefined);
    setFile(null);
  };

  const handleClose = () => {
    if (uploading) return;
    resetState();
    onClose();
  };

  // Flattens the backend's `{ "<rowIndex>.<column>": ["message", ...] }`
  // shape (matching ImportDialog.vue's own row/col parsing of the same
  // response) into one row per (row, column, message) for the table below.
  const buildErrorRows = (errorRowData, fieldValues) => {
    const rows = [];
    Object.entries(errorRowData).forEach(([key, messages]) => {
      const [rowIndex, column] = key.split('.');
      messages.forEach((msg) => {
        rows.push({
          key: `${key}-${rows.length}`,
          row: Number(rowIndex) + 1,
          column,
          message: msg,
          value: fieldValues?.[rowIndex]?.[column] ?? '',
        });
      });
    });
    return rows;
  };

  const handleImport = async () => {
    const type = DOCUMENT_TYPES.find((t) => t.value === documentType);
    if (!type) {
      messageApi.warning('Select a document type first.');
      return;
    }
    if (!file) {
      messageApi.warning('Select a file first.');
      return;
    }

    setUploading(true);
    try {
      const { data } = await type.upload(file);

      if (data.success) {
        messageApi.success(typeof data.success === 'string' ? data.success : 'Record has been imported.');
        resetState();
        onImported?.();
        onClose();
      } else if (data.error_column) {
        setErrorRows(data.error_column.map((msg, i) => ({ key: i, row: '-', column: '-', message: msg, value: '' })));
      } else if (data.error_row_data) {
        setErrorRows(buildErrorRows(data.error_row_data, data.field_values));
      } else if (data.error_empty) {
        messageApi.error('File is empty.');
      } else {
        messageApi.error('File type must be xlsx, xls, or csv.');
      }
    } catch (error) {
      handleApiError(error, messageApi);
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <Modal
        open={open}
        title="Import Data"
        onCancel={handleClose}
        destroyOnHidden
        footer={[
          <Button key="cancel" onClick={handleClose} disabled={uploading}>Cancel</Button>,
          <Button key="import" type="primary" loading={uploading} disabled={!file || !documentType} onClick={handleImport}>
            Import
          </Button>,
        ]}
      >
        <Select
          placeholder="Select document type"
          style={{ width: '100%', marginBottom: 16 }}
          options={options}
          value={documentType}
          onChange={setDocumentType}
        />

        <Dragger
          multiple={false}
          accept=".xlsx,.xls,.csv"
          beforeUpload={(selected) => { setFile(selected); return false; }}
          onRemove={() => setFile(null)}
          fileList={file ? [file] : []}
        >
          <p className="ant-upload-drag-icon"><InboxOutlined /></p>
          <p className="ant-upload-text">Click or drag a spreadsheet to this area to upload</p>
          <p className="ant-upload-hint">
            Accepts .xlsx, .xls, or .csv — columns must match the downloaded
            template exactly.
          </p>
        </Dragger>
      </Modal>

      <Modal
        open={!!errorRows}
        title="Error List"
        onCancel={() => setErrorRows(null)}
        footer={[<Button key="close" onClick={() => setErrorRows(null)}>Close</Button>]}
        width={720}
        destroyOnHidden
      >
        <Table
          rowKey="key"
          size="small"
          dataSource={errorRows || []}
          pagination={false}
          columns={[
            { title: 'Row', dataIndex: 'row', width: 70 },
            { title: 'Column', dataIndex: 'column' },
            { title: 'Message', dataIndex: 'message' },
            { title: 'Value', dataIndex: 'value' },
          ]}
        />
      </Modal>
    </>
  );
}
