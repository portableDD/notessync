/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  syncNotesWithServer,
  registerBackgroundSync,
  pullNotesFromServer,
} from "@/lib/sync";
import { getAllNotes, updateNote as updateNoteLocal } from "@/lib/db";

const USER_ID = "emmanueltemitopedorcas20@gmail.com";

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

  const performSync = useCallback(async () => {
    if (!navigator.onLine) {
      console.log("[v0] Offline, skipping sync");
      return;
    }

    try {
      setSyncStatus("syncing");
      setSyncError(null);

      // Sync local changes to server
      const syncResult = await syncNotesWithServer();
      console.log("[v0] Sync result:", syncResult);

      // Pull any updates from server
      const serverNotes = await pullNotesFromServer();

      // Merge server notes with local notes (server version wins for conflicts)
      const localNotes = await getAllNotes(USER_ID);
      for (const serverNote of serverNotes) {
        const localNote = localNotes.find((n) => n.id === serverNote.id);
        if (!localNote) {
          // New note from server
          await updateNoteLocal(serverNote);
        } else {
          const serverTime = new Date(serverNote.modified_at).getTime();
          const localTime = new Date(localNote.modified_at).getTime();
          if (serverTime > localTime) {
            // Server version is newer
            await updateNoteLocal(serverNote);
          }
        }
      }

      setLastSyncTime(new Date());
      setSyncStatus("synced");
      console.log("[v0] Sync completed successfully");
    } catch (error) {
      console.error("[v0] Sync error:", error);
      setSyncError(error instanceof Error ? error.message : "Sync failed");
      setSyncStatus("error");

      // Retry after 5 seconds
      setTimeout(() => {
        setSyncStatus("pending");
      }, 5000);
    }
  }, []);

  // Register background sync on mount
  useEffect(() => {
    registerBackgroundSync();
  }, []);

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => {
      console.log("[v0] Coming online, triggering sync...");
      setSyncStatus("syncing");
      performSync();
    };

    const handleOffline = () => {
      console.log("[v0] Going offline");
      setSyncStatus("pending");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // if (!navigator.onLine) {
    //   setSyncStatus("pending");
    // }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [performSync]);

  // Listen for sync messages from service worker
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      const handleMessage = (event: MessageEventWithData) => {
        if (event.data.type === "SYNC_START") {
          console.log("[v0] Service worker triggered sync");
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
        if (syncStatus !== "syncing") {
          performSync();
        }
      }, 30000);

      return () => {
        if (syncIntervalRef.current) {
          clearInterval(syncIntervalRef.current);
        }
      };
    }
  }, [syncStatus, performSync]);

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
