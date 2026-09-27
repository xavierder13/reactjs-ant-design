"use client";

import { useState } from "react";
import { Modal, Select, App } from "antd";
import useAuth from "../../../hooks/useAuth";
import handleApiError from "../../../utils/handleApiError";
import downloadBlobResponse from "../../../utils/downloadBlobResponse";
import employeeApi from "../../../services/employee/employeeApi";
import workScheduleApi from "../../../services/employee/workScheduleApi";

// Matches vueportal's TemplateDownloadDialog.vue: one entry point with a
// "Document Type" dropdown deciding which sub-module's import template to
// generate, instead of a separate button per module (see
// EmployeeMasterData.jsx, which used to have a single Template button
// scoped only to the core record). Vue's own dropdown also covers Branch
// Assignment Position / Monthly Key Performance / Classroom & OJT
// Performance Rating / NTE / Disciplinary / Offboarding — none of those
// have an Import UI built in this app yet (see ImportDataModal.jsx's own
// header comment), so listing their templates here would be a dead end;
// only document types with a real Import counterpart are offered. Add a
// new entry here and to ImportDataModal.jsx's DOCUMENT_TYPES together,
// not separately, when the next sub-module's import UI gets built.
const DOCUMENT_TYPES = [
  {
    value: 'employee_master_data',
    label: 'Employee Master Data',
    permission: 'employee-master-data-template-download',
    filename: 'EmployeeMasterDataTemplate.xls',
    download: () => employeeApi.templateDownload(),
  },
  {
    value: 'work_schedule',
    label: 'Work Schedule',
    permission: 'employee-master-data-work-schedule-template-download',
    filename: 'EmployeeWorkScheduleTemplate.xls',
    download: () => workScheduleApi.templateDownload(),
  },
];

export default function GenerateTemplateModal({ open, onClose }) {
  const { message: messageApi } = App.useApp();
  const { hasPermission } = useAuth();
  const [documentType, setDocumentType] = useState(undefined);
  const [downloading, setDownloading] = useState(false);

  const options = DOCUMENT_TYPES.filter((type) => hasPermission(type.permission))
    .map(({ value, label }) => ({ value, label }));

  const handleClose = () => {
    if (downloading) return;
    setDocumentType(undefined);
    onClose();
  };

  const handleGenerate = async () => {
    const type = DOCUMENT_TYPES.find((t) => t.value === documentType);
    if (!type) {
      messageApi.warning('Select a document type first.');
      return;
    }
    setDownloading(true);
    try {
      const response = await type.download();
      const downloaded = await downloadBlobResponse(response, type.filename, messageApi);
      if (downloaded) {
        messageApi.success('Template downloaded.');
        handleClose();
      }
    } catch (error) {
      handleApiError(error, messageApi);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Generate Template"
      onCancel={handleClose}
      onOk={handleGenerate}
      okText="Generate"
      confirmLoading={downloading}
      destroyOnHidden
    >
      <Select
        placeholder="Select document type"
        style={{ width: '100%' }}
        options={options}
        value={documentType}
        onChange={setDocumentType}
      />
    </Modal>
  );
}
