import { useEffect } from 'react';
import useAcknowledgmentReportStore from '../store/acknowledgmentReportStore';

const useAcknowledgmentReports = () => {
  const branches       = useAcknowledgmentReportStore((state) => state.branches);
  const isLoading       = useAcknowledgmentReportStore((state) => state.isLoading);
  const error           = useAcknowledgmentReportStore((state) => state.error);
  const fetchBranches   = useAcknowledgmentReportStore((state) => state.fetchBranches);
  const submitReport    = useAcknowledgmentReportStore((state) => state.submitReport);
  const deleteReport     = useAcknowledgmentReportStore((state) => state.deleteReport);

  useEffect(() => { fetchBranches(); }, []);

  return { branches, isLoading, error, fetchBranches, submitReport, deleteReport };
};

export default useAcknowledgmentReports;
