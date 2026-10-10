import { useState } from "react";
import { Modal, Form, App } from "antd";
import dayjs from "dayjs";

import disciplinaryApi from "../../../services/employee/disciplinaryApi";
import handleApiError from "../../../utils/handleApiError";
import downloadBlobResponse from "../../../utils/downloadBlobResponse";
import { formatDate } from "../../../utils/formatDate";
import DisciplinaryFormFields from "../components/tabs/disciplinary/DisciplinaryFormFields";
import FileSlotCard, { FileSlots } from "../components/FileSlotCard";
import OpenCaseList from "./OpenCaseList";
import useListAccess from "./useListAccess";

const COLUMNS = [
  { title: "Date Issued", dataIndex: "date_issued", render: (v) => formatDate(v) },
  { title: "Issued By", dataIndex: "issued_by" },
  { title: "NTE Code", dataIndex: "nte_code" },
  { title: "Offense Code", dataIndex: "offense_code" },
  { title: "Offense", dataIndex: "offense" },
  { title: "Type", dataIndex: "offense_type" },
  { title: "Disc. Action", dataIndex: "disciplinary_action" },
  { title: "Series", dataIndex: "series" },
];

const loadOpenDisciplinary = async () => (await disciplinaryApi.getOpenQueue()).data.disciplinaries;
const removeDisciplinary = (record) => disciplinaryApi.remove(record.id);

// Edit form for one queued disciplinary action — same fields as the employee
// record's Disciplinary tab (DisciplinaryFormFields), plus the memo file's
// download/delete here in the modal. Like the backend, a file that already
// exists must be deleted before a replacement can be uploaded.
function DisciplinaryEditModal({ record, onClose, onSaved }) {
  const { message: messageApi } = App.useApp();
  const { can } = useListAccess();
  const [form] = Form.useForm();
  const [fileName, setFileName] = useState(null);
  const [pendingFile, setPendingFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleAfterOpenChange = (isOpen) => {
    if (!isOpen) {
      setPendingFile(null);
      return;
    }
    setFileName(record.file_name || null);
    form.setFieldsValue({
      date_issued: record.date_issued ? dayjs(record.date_issued) : null,
      nte_code: record.nte_code,
      offense_code: record.offense_code,
      offense: record.offense,
      offense_type: record.offense_type,
      disciplinary_action: record.disciplinary_action,
      series: record.series,
      status: record.status || "Open",
      transmit_date: record.transmit_date ? dayjs(record.transmit_date) : null,
      return_date: record.return_date ? dayjs(record.return_date) : null,
    });
  };

  const handleDownload = async () => {
    try {
      const response = await disciplinaryApi.fileDownload(record.id);
      await downloadBlobResponse(response, fileName || "file", messageApi);
    } catch (error) {
      handleApiError(error, messageApi);
    }
  };

  const handleFileDelete = async () => {
    try {
      await disciplinaryApi.fileDelete(record.id);
      setFileName(null);
      messageApi.success("File deleted.");
    } catch (error) {
      handleApiError(error, messageApi);
    }
  };

  const handleSave = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    const formData = new FormData();
    formData.append("employee_id", record.employee_id);
    formData.append("date_issued", values.date_issued.format("YYYY-MM-DD"));
    ["nte_code", "offense_code", "offense", "offense_type", "disciplinary_action", "series", "status"]
      .forEach((key) => formData.append(key, values[key]));
    if (values.transmit_date) formData.append("transmit_date", values.transmit_date.format("YYYY-MM-DD"));
    if (values.return_date) formData.append("return_date", values.return_date.format("YYYY-MM-DD"));
    if (pendingFile) formData.append("file", pendingFile);

    setSaving(true);
    try {
      const { data } = await disciplinaryApi.update(record.id, formData);
      if (data.success) {
        messageApi.success("Record updated.");
        onSaved();
      } else {
        const [field, fieldErrors] = Object.entries(data || {})[0] || [];
        if (field && field !== "error") form.setFields([{ name: field, errors: [].concat(fieldErrors) }]);
        else messageApi.error(data.error || "Failed to save record.");
      }
    } catch (error) {
      handleApiError(error, messageApi);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      keyboard={false}
      title={record ? `Edit Disciplinary Action — ${record.employee_name}` : ""}
      open={Boolean(record)}
      onCancel={onClose}
      onOk={handleSave}
      afterOpenChange={handleAfterOpenChange}
      confirmLoading={saving}
      okText="Save"
      width={720}
      destroyOnHidden
    >
      <Form form={form} layout="vertical">
        <DisciplinaryFormFields />
        <FileSlots>
          <FileSlotCard
            label="Memo File"
            fileName={fileName}
            pendingFile={pendingFile}
            onPendingFileChange={setPendingFile}
            onDownload={can("employee-master-data-disciplinary-file-download") ? handleDownload : undefined}
            onDelete={can("employee-master-data-disciplinary-file-delete") ? handleFileDelete : undefined}
          />
        </FileSlots>
      </Form>
    </Modal>
  );
}

// Disciplinary (Open) — vueportal EmployeeDisciplinaryList.vue. Row actions
// are gated on the disciplinary-* permissions the backend enforces
// (vueportal's page checks the nte-* ones by mistake).
export default function OpenDisciplinaryList() {
  return (
    <OpenCaseList
      title="Disciplinary Actions"
      load={loadOpenDisciplinary}
      columns={COLUMNS}
      editPermission="employee-master-data-disciplinary-edit"
      deletePermission="employee-master-data-disciplinary-delete"
      remove={removeDisciplinary}
      EditModal={DisciplinaryEditModal}
    />
  );
}
