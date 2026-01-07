/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  syncNotesWithServer,
  registerBackgroundSync,
  pullNotesFromServer,
} from "@/lib/sync";
import { getUnsyncedNotesCount } from "@/lib/db";

type SyncStatus = "synced" | "syncing" | "pending" | "error";

interface MessageEventWithData extends MessageEvent {
  data: {
    type: string;
    [key: string]: any;
  };
}

export function useSync() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("synced");
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isSyncingRef = useRef(false);
  const lastOnlineCheckRef = useRef<number>(Date.now());

  const performSync = useCallback(async () => {
    if (!navigator.onLine) {
      console.log("[useSync] Offline, skipping sync");
      setSyncStatus("pending");
      return;
    }

    // Prevent duplicate syncs
    if (isSyncingRef.current) {
      console.log("[useSync] Sync already in progress, skipping");
      return;
    }

    try {
      isSyncingRef.current = true;
      setSyncStatus("syncing");
      setSyncError(null);

      console.log("[useSync] Starting sync...");

      // Step 1: Sync local changes to server
      const syncResult = await syncNotesWithServer();
      console.log("[useSync] Sync result:", syncResult);

      // Step 2: Pull any updates from server
      await pullNotesFromServer();

      setLastSyncTime(new Date());
      setSyncStatus("synced");
      console.log("[useSync] Sync completed successfully");
    } catch (error) {
      console.error("[useSync] Sync error:", error);
      setSyncError(error instanceof Error ? error.message : "Sync failed");
      setSyncStatus("error");

      // Retry after 5 seconds
      setTimeout(() => {
        setSyncStatus("pending");
      }, 5000);
    } finally {
      isSyncingRef.current = false;
    }
  }, []);

  // Register background sync on mount
  useEffect(() => {
    registerBackgroundSync();
  }, []);

  // Check initial status
  useEffect(() => {
    const checkInitialStatus = async () => {
      if (!navigator.onLine) {
        setSyncStatus("pending");
        return;
      }

      try {
        const count = await getUnsyncedNotesCount();
        if (count > 0) {
          console.log(
            `[useSync] ${count} unsynced notes found, marking as pending`
          );
          setSyncStatus("pending");
        } else {
          setSyncStatus("synced");
        }
      } catch (error) {
        console.error("[useSync] Error checking unsynced notes:", error);
      }
    };

    checkInitialStatus();
  }, []);

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => {
      console.log("[useSync] Coming online, triggering sync...");
      setSyncStatus("syncing");
      performSync();
    };

    const handleOffline = () => {
      console.log("[useSync] Going offline");
      setSyncStatus("pending");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [performSync]);

  // Listen for custom sync events
  useEffect(() => {
    const handleSyncStart = () => {
      console.log("[useSync] Custom event: sync:start");
      setSyncStatus("syncing");
      setSyncError(null);
    };

    const handleSyncComplete = ((event: CustomEvent) => {
      console.log("[useSync] Custom event: sync:complete", event.detail);
      setSyncStatus("synced");
      setLastSyncTime(new Date());
      setSyncError(null);
      isSyncingRef.current = false;
    }) as EventListener;

    const handleSyncError = ((event: CustomEvent) => {
      console.log("[useSync] Custom event: sync:error", event.detail);
      setSyncStatus("error");
      setSyncError(event.detail?.message || "Sync failed");
      isSyncingRef.current = false;
    }) as EventListener;

    window.addEventListener("sync:start", handleSyncStart);
    window.addEventListener("sync:complete", handleSyncComplete);
    window.addEventListener("sync:error", handleSyncError);

    return () => {
      window.removeEventListener("sync:start", handleSyncStart);
      window.removeEventListener("sync:complete", handleSyncComplete);
      window.removeEventListener("sync:error", handleSyncError);
    };
  }, []);

  // Listen for sync messages from service worker
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      const handleMessage = (event: MessageEventWithData) => {
        if (event.data.type === "SYNC_START") {
          console.log("[useSync] Service worker triggered sync");
          performSync();
        }
      };

      navigator.serviceWorker.addEventListener("message", handleMessage);
      return () => {
        navigator.serviceWorker.removeEventListener("message", handleMessage);
      };
    }
  }, [performSync]);

  // Periodic sync every 30 seconds when online
  useEffect(() => {
    if (navigator.onLine) {
      syncIntervalRef.current = setInterval(() => {
        if (syncStatus !== "syncing" && !isSyncingRef.current) {
          const now = Date.now();
          const timeSinceLastCheck = now - lastOnlineCheckRef.current;

          // Debounce - only sync if at least 25 seconds have passed
          if (timeSinceLastCheck >= 25000) {
            lastOnlineCheckRef.current = now;
            performSync();
          }
        }
      }, 30000);

      return () => {
        if (syncIntervalRef.current) {
          clearInterval(syncIntervalRef.current);
        }
      };
    }
  }, [syncStatus, performSync]);

  // Check for unsynced notes periodically
  useEffect(() => {
    const checkUnsyncedNotes = async () => {
      // Only check if we think we're synced AND we're online AND not currently syncing
      if (
        syncStatus === "synced" &&
        navigator.onLine &&
        !isSyncingRef.current
      ) {
        try {
          const count = await getUnsyncedNotesCount();
          if (count > 0) {
            console.log(
              `[useSync] Found ${count} unsynced notes, updating status to pending`
            );
            setSyncStatus("pending");
          }
        } catch (error) {
          console.error("[useSync] Error checking unsynced notes:", error);
        }
      }
    };

    // Check every 10 seconds
    const intervalId = setInterval(checkUnsyncedNotes, 10000);

    return () => clearInterval(intervalId);
  }, [syncStatus]);

  return {
    syncStatus,
    lastSyncTime,
    syncError,
    performSync,
  };
}

// "use client";

// import { useEffect, useState, useCallback, useRef } from "react";
// import {
//   syncNotesWithServer,
//   registerBackgroundSync,
//   pullNotesFromServer,
// } from "@/lib/sync";
// import { getAllNotes, updateNote as updateNoteLocal } from "@/lib/db";

// const USER_ID = "emmanueltemitopedorcas20@gmail.com";

// type SyncStatus = "synced" | "syncing" | "pending" | "error";

// export function useSync() {
//   const [syncStatus, setSyncStatus] = useState<SyncStatus>("synced");
//   const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
//   const [syncError, setSyncError] = useState<string | null>(null);
//   const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

//   // Register background sync on mount
//   useEffect(() => {
//     registerBackgroundSync();
//   }, []);

//   // Handle online/offline events
//   useEffect(() => {
//     const handleOnline = () => {
//       console.log("[v0] Coming online, triggering sync...");
//       setSyncStatus("syncing");
//       performSync();
//     };

//     const handleOffline = () => {
//       console.log("[v0] Going offline");
//       setSyncStatus("pending");
//     };

//     window.addEventListener("online", handleOnline);
//     window.addEventListener("offline", handleOffline);

//     // Set initial status
//     if (!navigator.onLine) {
//       setSyncStatus("pending");
//     } else {
//       setSyncStatus("synced");
//     }

//     return () => {
//       window.removeEventListener("online", handleOnline);
//       window.removeEventListener("offline", handleOffline);
//     };
//   }, []);

//   // Listen for sync messages from service worker
//   useEffect(() => {
//     if ("serviceWorker" in navigator) {
//       const handleMessage = (event: ExtendableMessageEvent) => {
//         if (event.data.type === "SYNC_START") {
//           console.log("[v0] Service worker triggered sync");
//           performSync();
//         }
//       };

//       navigator.serviceWorker.addEventListener("message", handleMessage);
//       return () => {
//         navigator.serviceWorker.removeEventListener("message", handleMessage);
//       };
//     }
//   }, []);

//   // Periodic sync every 30 seconds when online
//   useEffect(() => {
//     if (navigator.onLine) {
//       syncIntervalRef.current = setInterval(() => {
//         if (syncStatus !== "syncing") {
//           performSync();
//         }
//       }, 30000);

//       return () => {
//         if (syncIntervalRef.current) {
//           clearInterval(syncIntervalRef.current);
//         }
//       };
//     }
//   }, [syncStatus]);

//   const performSync = useCallback(async () => {
//     if (!navigator.onLine) {
//       console.log("[v0] Offline, skipping sync");
//       return;
//     }

//     try {
//       setSyncStatus("syncing");
//       setSyncError(null);

//       // Sync local changes to server
//       const syncResult = await syncNotesWithServer();
//       console.log("[v0] Sync result:", syncResult);

//       // Pull any updates from server
//       const serverNotes = await pullNotesFromServer();

//       // Merge server notes with local notes (server version wins for conflicts)
//       const localNotes = await getAllNotes(USER_ID);
//       for (const serverNote of serverNotes) {
//         const localNote = localNotes.find((n) => n.id === serverNote.id);
//         if (!localNote) {
//           // New note from server
//           await updateNoteLocal(serverNote);
//         } else {
//           const serverTime = new Date(serverNote.modified_at).getTime();
//           const localTime = new Date(localNote.modified_at).getTime();
//           if (serverTime > localTime) {
//             // Server version is newer
//             await updateNoteLocal(serverNote);
//           }
//         }
//       }

//       setLastSyncTime(new Date());
//       setSyncStatus("synced");
//       console.log("[v0] Sync completed successfully");
//     } catch (error) {
//       console.error("[v0] Sync error:", error);
//       setSyncError(error instanceof Error ? error.message : "Sync failed");
//       setSyncStatus("error");

//       // Retry after 5 seconds
//       setTimeout(() => {
//         setSyncStatus("pending");
//       }, 5000);
//     }
//   }, []);

//   return {
//     syncStatus,
//     lastSyncTime,
//     syncError,
//     performSync,
//   };
// }
