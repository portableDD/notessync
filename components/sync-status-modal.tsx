// components/sync-status-modal.tsx - COMPLETELY REWRITTEN (No setState in Effect)
"use client";

import { useSyncContext } from "./sync-provider";
import { Cloud, CloudOff, AlertCircle, CheckCircle2, X } from "lucide-react";
import { useMemo } from "react";

export function SyncStatusModal() {
  const { syncStatus, lastSyncTime, syncError } = useSyncContext();

  // Derive visibility directly from syncStatus - no state needed!
  const shouldShow = useMemo(() => {
    // Always show when syncing, error, or offline
    if (
      syncStatus === "syncing" ||
      syncStatus === "error" ||
      syncStatus === "pending"
    ) {
      return true;
    }

    // Show synced state briefly (will auto-hide via CSS animation)
    if (syncStatus === "synced") {
      return true;
    }

    return false;
  }, [syncStatus]);

  // Don't render at all if shouldn't show
  if (!shouldShow) return null;

  const statusConfig = {
    synced: {
      icon: CheckCircle2,
      title: "All changes synced",
      description: lastSyncTime
        ? `Last sync: ${lastSyncTime.toLocaleTimeString()}`
        : "Everything is up to date",
      color:
        "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800",
      // Auto-hide animation for synced state
      animation: "animate-[fadeOut_3s_ease-in-out_forwards]",
    },
    syncing: {
      icon: Cloud,
      title: "Syncing...",
      description: "Uploading your changes to the cloud",
      color:
        "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
      animation: "",
    },
    pending: {
      icon: CloudOff,
      title: "Offline",
      description: "Changes are saved locally and will sync when online",
      color:
        "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
      animation: "",
    },
    error: {
      icon: AlertCircle,
      title: "Sync failed",
      description: syncError || "Will retry automatically",
      color:
        "bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800",
      animation: "",
    },
  };

  const config = statusConfig[syncStatus];
  const Icon = config.icon;

  return (
    <>
      <style jsx>{`
        @keyframes fadeOut {
          0%,
          80% {
            opacity: 1;
            transform: translateY(0);
          }
          100% {
            opacity: 0;
            transform: translateY(8px);
            pointer-events: none;
          }
        }
      `}</style>

      <div
        className={`fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm p-4 rounded-lg shadow-lg border transition-all duration-300 z-50 ${config.color} ${config.animation}`}
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

          {/* Close button for error state */}
          {syncStatus === "error" && (
            <button
              onClick={(e) => {
                // Just hide the parent element
                const modal = e.currentTarget.closest('div[class*="fixed"]');
                if (modal instanceof HTMLElement) {
                  modal.style.display = "none";
                }
              }}
              className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
              aria-label="Close"
            >
             <X />
            </button>
          )}
        </div>
      </div>
    </>
  );
}

// "use client";

// import { useSyncContext } from "./sync-provider";
// import { Cloud, CloudOff, AlertCircle, CheckCircle2 } from "lucide-react";

// export function SyncStatusModal() {
//   const { syncStatus, lastSyncTime, syncError } = useSyncContext();

//   const statusConfig = {
//     synced: {
//       icon: CheckCircle2,
//       title: "All changes synced",
//       description: lastSyncTime
//         ? `Last sync: ${lastSyncTime.toLocaleTimeString()}`
//         : "Everything is up to date",
//       color: "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300",
//     },
//     syncing: {
//       icon: Cloud,
//       title: "Syncing...",
//       description: "Uploading your changes to the cloud",
//       color: "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300",
//     },
//     pending: {
//       icon: CloudOff,
//       title: "Offline",
//       description: "Changes are saved locally and will sync when online",
//       color: "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300",
//     },
//     error: {
//       icon: AlertCircle,
//       title: "Sync failed",
//       description: syncError || "Will retry automatically",
//       color: "bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300",
//     },
//   };

//   const config = statusConfig[syncStatus];
//   const Icon = config.icon;

//   return (
//     <div
//       className={`fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm p-4 rounded-lg shadow-lg border ${config.color}`}
//     >
//       <div className="flex items-start gap-3">
//         <Icon
//           className={`w-5 h-5 mt-0.5 shrink-0 ${
//             syncStatus === "syncing" ? "animate-spin" : ""
//           }`}
//         />
//         <div className="flex-1 min-w-0">
//           <h3 className="font-semibold text-sm">{config.title}</h3>
//           <p className="text-xs opacity-80 mt-1">{config.description}</p>
//         </div>
//       </div>
//     </div>
//   );
// }
