"use client";

import { useEffect, useState } from "react";
import { Cloud, CloudOff, AlertCircle } from "lucide-react";

export function SyncStatusIndicator() {
  const [syncStatus, setSyncStatus] = useState<
    "synced" | "syncing" | "pending" | "error"
  >("synced");

  useEffect(() => {
    const handleOnline = () => setSyncStatus("synced");
    const handleOffline = () => setSyncStatus("pending");

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Check initial online status
    // if (!navigator.onLine) {
    //   setSyncStatus("pending");
    // }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const statusConfig = {
    synced: {
      icon: Cloud,
      label: "Synced",
      color: "text-green-600 dark:text-green-400",
      bg: "bg-green-50 dark:bg-green-950",
    },
    syncing: {
      icon: Cloud,
      label: "Syncing...",
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-950",
    },
    pending: {
      icon: CloudOff,
      label: "Offline - Changes saved locally",
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-950",
    },
    error: {
      icon: AlertCircle,
      label: "Sync failed - Retrying...",
      color: "text-red-600 dark:text-red-400",
      bg: "bg-red-50 dark:bg-red-950",
    },
  };

  const config = statusConfig[syncStatus];
  const Icon = config.icon;

  return (
    <div
      className={`fixed bottom-4 right-4 flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium ${config.color} ${config.bg} shadow-lg border border-current/20`}
    >
      <Icon className="w-4 h-4 animate-pulse" />
      <span>{config.label}</span>
    </div>
  );
}
