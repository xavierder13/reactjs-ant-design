import { App } from "antd";

import handleApiError from "../../../../../utils/handleApiError";
import nteApi from "../../../../../services/employee/nteApi";
import FileSlotCard, { FileSlots } from "../../FileSlotCard";

// The NTE File / Explanation File cards, side by side (stacked on phones).
export const NteFileSlots = FileSlots;

// One NTE file slot (NTE File or Explanation File) — FileSlotCard wired to
// nteApi. `record` is null for a record that isn't saved yet (no id to
// download/delete against). Duplicated per slot since NTE records carry two
// independent files (see nteApi.js).
export default function NteFileSlot({ label, documentType, record, pendingFile, onPendingFileChange, canDownload, canDeleteFile, onFileDeleted }) {
  const { message: messageApi } = App.useApp();
  const fileName = documentType === "nte_file" ? record?.nte_file_name : record?.explanation_file_name;

  const handleDownload = async () => {
    try {
      const response = await nteApi.fileDownload(record.id, documentType);
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
      const { data } = await nteApi.fileDelete(record.id, documentType);
      onFileDeleted(data.explanations);
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
      onDelete={canDeleteFile ? handleDelete : undefined}
    />
  );
}
