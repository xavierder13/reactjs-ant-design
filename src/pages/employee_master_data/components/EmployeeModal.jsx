"use client";

import { Modal, Button } from "antd";
import { CloseOutlined } from "@ant-design/icons";

interface EmployeeModalProps {
  visible: boolean;
  title: string;
  onCancel: () => void;
  onSave: () => void;
  children: React.ReactNode;
}

export default function EmployeeModal({
  visible,
  title,
  onCancel,
  onSave,
  children
}: EmployeeModalProps) {
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