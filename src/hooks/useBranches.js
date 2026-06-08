import { useEffect } from "react";
import useBranchStore from "../store/branchStore";

const useBranches = () => {
  const branches = useBranchStore((state) => state.branches);
  const isLoading = useBranchStore((state) => state.isLoading);
  const isLoaded = useBranchStore((state) => state.isLoaded);
  const error = useBranchStore((state) => state.error);
  const fetchBranches = useBranchStore((state) => state.fetchBranches);
  const clearBranches = useBranchStore((state) => state.clearBranches);

  // auto-fetch on first use
  useEffect(() => {
    fetchBranches();
  }, []);

  // formatted for Ant Design Select options
  const branchOptions = branches.map((branch) => ({
    label: branch.name,
    value: branch.id,
  }));

  return {
    branches,
    branchOptions,
    isLoaded,
    isLoading,
    error,
    fetchBranches,
    clearBranches,
  };
};

export default useBranches;