import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "../../../services/api";
import { dftcApi } from "../../../services/api";

const VERSION_KEY = ["privileged-data-version"];

/** Refresh cached workspace queries only when the shared Redis marker changes. */
export function usePrivilegedDataVersion(scope) {
  const queryClient = useQueryClient();
  const previousVersion = useRef(null);
  const { data } = useQuery({
    queryKey: [...VERSION_KEY, scope],
    queryFn: scope === "admin" ? adminApi.getDataVersion : dftcApi.getDataVersion,
    staleTime: 0,
    refetchInterval: 30 * 1000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    const version = data?.version;
    if (typeof version !== "number") return;
    if (previousVersion.current !== null && previousVersion.current !== version) {
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] !== VERSION_KEY[0],
      });
    }
    previousVersion.current = version;
  }, [data?.version, queryClient]);
}
