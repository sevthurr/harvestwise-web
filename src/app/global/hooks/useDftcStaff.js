import { useQuery } from "@tanstack/react-query";
import {
  DFTC_STAFF_KEY,
  DFTC_WORKSPACE_STALE_TIME,
  fetchDftcStaff,
} from "./dftcWorkspaceQueries";

export function useDftcStaff() {
  return useQuery({
    queryKey: DFTC_STAFF_KEY,
    queryFn: fetchDftcStaff,
    staleTime: DFTC_WORKSPACE_STALE_TIME,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
}
