"use client";

import { Modal, Button } from "antd";
import { CloseOutlined } from "@ant-design/icons";

// Not currently wired into any page — Employee Master Data's Add/Edit/View
// flow uses routed pages (CreateEmployee/EditEmployee/ViewEmployee) instead
// of a modal, since vueportal has no single-employee "show/{id}" endpoint
// to refresh a modal's data against reliably (see the employee-master-data
// skill). Kept as reusable scaffolding for a future in-place quick-edit
// modal if that's ever wanted; not deleted since it's still a reasonable
// generic full-screen modal shell.
export default function EmployeeModal({
  visible,
  title,
  onCancel,
  onSave,
  children
}) {
  return (
    <Modal
      open={visible}
      title={title}
      onCancel={onCancel}

      mask={{ closable: false }}     // prevents clicking outside
      keyboard={false}               // disables ESC closing

      width="100%"
      style={{ top: 0 }}

      styles={{
        body: {
          height: "calc(100vh - 160px)",
          overflowY: "auto"
        }
      }}

      destroyOnHidden                // replaces destroyOnClose
      closeIcon={<CloseOutlined />}

      footer={[
        <Button key="cancel" onClick={onCancel}>
          Cancel
        </Button>,
        <Button key="save" type="primary" onClick={onSave}>
          Save
        </Button>
      ]}
    >
      {children}
    </Modal>
  );
}
