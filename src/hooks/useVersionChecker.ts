import { useEffect, useState } from "react";

declare const __BUILD_TIME__: number;

const POLL_INTERVAL = 5 * 60 * 1000; // 5 minutes

export function useVersionChecker() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if (import.meta.env.DEV) return;

    const currentBuildTime = __BUILD_TIME__;

    async function check() {
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`, { cache: "no-store" });
        if (!res.ok) return;
        const data: { buildTime: number } = await res.json();
        if (data.buildTime !== currentBuildTime) {
          setUpdateAvailable(true);
        }
      } catch {
        // Ignore network errors silently
      }
    }

    const id = setInterval(check, POLL_INTERVAL);
    return () => clearInterval(id);
  }, []);

  return updateAvailable;
}
