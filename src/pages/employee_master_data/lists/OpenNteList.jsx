import { useState } from "react";
import { Modal, Form, App } from "antd";
import dayjs from "dayjs";

import nteApi from "../../../services/employee/nteApi";
import handleApiError from "../../../utils/handleApiError";
import { formatDate } from "../../../utils/formatDate";
import NteFormFields from "../components/tabs/disciplinary/NteFormFields";
import NteFileSlot, { NteFileSlots } from "../components/tabs/disciplinary/NteFileSlot";
import OpenCaseList from "./OpenCaseList";
import useListAccess from "./useListAccess";

const COLUMNS = [
  { title: "Date Issued", dataIndex: "date_issued", render: (v) => formatDate(v) },
  { title: "Issued By", dataIndex: "issued_by" },
  { title: "NTE Code", dataIndex: "nte_code" },
  { title: "Violation", dataIndex: "violation", ellipsis: true, width: 260 },
  { title: "Explanation Date", dataIndex: "explanation_date", render: (v) => formatDate(v) },
  { title: "Received by HR", dataIndex: "date_received_by_hr", render: (v) => formatDate(v) },
];

const loadOpenNte = async () => (await nteApi.getOpenQueue()).data.explanations;
const removeNte = (record) => nteApi.remove(record.id);

// Edit form for one queued NTE — same fields and file slots as the employee
// record's NTE tab (NteFormFields / NteFileSlot).
function NteEditModal({ record, onClose, onSaved }) {
  const { message: messageApi } = App.useApp();
  const { can } = useListAccess();
  const [form] = Form.useForm();
  const [current, setCurrent] = useState(null);
  const [pendingFiles, setPendingFiles] = useState({});
  const [saving, setSaving] = useState(false);

  const handleAfterOpenChange = (isOpen) => {
    if (!isOpen) {
      setCurrent(null);
      setPendingFiles({});
      return;
    }
    setCurrent(record);
    form.setFieldsValue({
      date_issued: record.date_issued ? dayjs(record.date_issued) : null,
      issued_by: record.issued_by,
      nte_code: record.nte_code,
      violation: record.violation,
      explanation_date: record.explanation_date ? dayjs(record.explanation_date) : null,
      date_received_by_hr: record.date_received_by_hr ? dayjs(record.date_received_by_hr) : null,
      remarks: record.remarks,
      status: record.status || "Open",
    });
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
    formData.append("issued_by", values.issued_by);
    formData.append("nte_code", values.nte_code);
    formData.append("violation", values.violation);
    if (values.explanation_date) formData.append("explanation_date", values.explanation_date.format("YYYY-MM-DD"));
    formData.append("date_received_by_hr", values.date_received_by_hr ? values.date_received_by_hr.format("YYYY-MM-DD") : "");
    if (values.remarks) formData.append("remarks", values.remarks);
    if (values.status) formData.append("status", values.status);
    Object.entries(pendingFiles).forEach(([key, file]) => { if (file) formData.append(key, file); });

    setSaving(true);
    try {
      const { data } = await nteApi.update(record.id, formData);
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

  const slot = (label, documentType) => (
    <NteFileSlot
      label={label}
      documentType={documentType}
      record={current}
      pendingFile={pendingFiles[documentType]}
      onPendingFileChange={(file) => setPendingFiles((p) => ({ ...p, [documentType]: file }))}
      canDownload={can("employee-master-data-nte-file-download")}
      canDeleteFile={can("employee-master-data-nte-file-delete")}
      onFileDeleted={(explanations) => {
        const fresh = explanations?.find((e) => e.id === current?.id);
        if (fresh) setCurrent((prev) => ({ ...prev, ...fresh }));
      }}
    />
  );

  return (
    <Modal
      keyboard={false}
      title={record ? `Edit Issued NTE — ${record.employee_name}` : ""}
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
        <NteFormFields />
        {current && (
          <NteFileSlots>
            {slot("NTE File", "nte_file")}
            {slot("Explanation File", "explanation_file")}
          </NteFileSlots>
        )}
      </Form>
    </Modal>
  );
}

// NTE (Open) — vueportal EmployeeNTEList.vue.
export default function OpenNteList() {
  return (
    <OpenCaseList
      title="Issued NTE"
      load={loadOpenNte}
      columns={COLUMNS}
      editPermission="employee-master-data-nte-edit"
      deletePermission="employee-master-data-nte-delete"
      remove={removeNte}
      EditModal={NteEditModal}
    />
  );
}
