"use client";

import { useSyncContext } from "./sync-provider";
import { Cloud, CloudOff, AlertCircle, CheckCircle2 } from "lucide-react";

export function SyncStatusModal() {
  const { syncStatus, lastSyncTime, syncError } = useSyncContext();

  const statusConfig = {
    synced: {
      icon: CheckCircle2,
      title: "All changes synced",
      description: lastSyncTime
        ? `Last sync: ${lastSyncTime.toLocaleTimeString()}`
        : "Everything is up to date",
      color: "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300",
    },
    syncing: {
      icon: Cloud,
      title: "Syncing...",
      description: "Uploading your changes to the cloud",
      color: "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300",
    },
    pending: {
      icon: CloudOff,
      title: "Offline",
      description: "Changes are saved locally and will sync when online",
      color: "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300",
    },
    error: {
      icon: AlertCircle,
      title: "Sync failed",
      description: syncError || "Will retry automatically",
      color: "bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300",
    },
  };

  const config = statusConfig[syncStatus];
  const Icon = config.icon;

  return (
    <div
      className={`fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm p-4 rounded-lg shadow-lg border ${config.color}`}
    >
      <div className="flex items-start gap-3">
        <Icon
          className={`w-5 h-5 mt-0.5 shrink-0 ${
            syncStatus === "syncing" ? "animate-spin" : ""
          }`}
        />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm">{config.title}</h3>
          <p className="text-xs opacity-80 mt-1">{config.description}</p>
        </div>
      </div>
    </div>
  );
}
