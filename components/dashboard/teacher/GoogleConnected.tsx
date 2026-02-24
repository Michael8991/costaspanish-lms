"use client";

import { useEffect, useState } from "react";

export function GoogleConnected() {
  const [connected, setConnected] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/integrations/google/status", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setConnected(d.connected))
      .catch(() => setConnected(false));
  }, []);

  if (connected === null) return null;

  return (
    <span
      className={`px-4 py-1 text-xs rounded-lg ${
        connected
          ? "bg-green-100 text-green-700 shadow-md"
          : "bg-red-100 text-red-700"
      }`}
    >
      {connected ? "Google Connected" : "Disconnected"}
    </span>
  );
}
