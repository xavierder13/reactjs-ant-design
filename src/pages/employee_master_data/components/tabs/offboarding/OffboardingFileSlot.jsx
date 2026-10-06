import { App } from "antd";

import handleApiError from "../../../../../utils/handleApiError";
import offboardingApi from "../../../../../services/employee/offboardingApi";
import FileSlotCard, { FileSlots } from "../../FileSlotCard";

// Offboarding's three file cards (Last Day, Clearance, Quitclaim), one row.
export function OffboardingFileSlots({ children, readOnly = false }) {
  return (
    <FileSlots perRow={3} hint={readOnly ? null : undefined}>
      {children}
    </FileSlots>
  );
}

// One of Offboarding's three independent file slots — FileSlotCard wired to
// offboardingApi. Same backend limitation as Disciplinary/NTE: once a slot
// has a file, re-uploading via update() is silently ignored server-side, so
// only Download/Delete are offered once one exists — delete first to
// replace it. `record` is null for a record that isn't saved yet (no id to
// download/delete against); its picked file goes out with the create.
export default function OffboardingFileSlot({
  label, documentType, record, pendingFile, onPendingFileChange, canDownload, canDeleteFile, onFileDeleted, readOnly = false,
}) {
  const { message: messageApi } = App.useApp();
  const fileName = record?.[`${documentType}_name`];

  const handleDownload = async () => {
    try {
      const response = await offboardingApi.fileDownload(record.id, documentType);
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
      const { data } = await offboardingApi.fileDelete(record.id, documentType);
      onFileDeleted(data.offboardings);
      messageApi.success("File deleted.");
    } catch (error) {
      handleApiError(error, messageApi);
    }
  };

  return (
    <FileSlotCard
      label={label}
      fileName={fileName}
      pendingFile={pendingFile}
      onPendingFileChange={onPendingFileChange}
      onDownload={canDownload ? handleDownload : undefined}
      onDelete={canDeleteFile && !readOnly ? handleDelete : undefined}
      readOnly={readOnly}
    />
  );
}
