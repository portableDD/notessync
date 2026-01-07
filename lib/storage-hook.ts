"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import type { Note } from "@/types/note";
import { getAllNotes, addNote, updateNote, deleteNote } from "./db";
import { syncNotesWithServer, pullNotesFromServer } from "./sync";

const USER_ID = "emmanueltemitopedorcas20@gmail.com";

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const syncTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Reload notes from IndexedDB
  const reloadNotesFromDB = useCallback(async () => {
    try {
      const loadedNotes = await getAllNotes(USER_ID);
      setNotes(loadedNotes);
      console.log("[NotesSync] Notes reloaded from IndexedDB");
    } catch (err) {
      console.error("[NotesSync] Error reloading notes:", err);
    }
  }, []);

  // Load all notes on mount
  useEffect(() => {
    loadNotes();
  }, []);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      console.log("[NotesSync] Back online, syncing...");
      syncNotes();
    };

    const handleOffline = () => {
      console.log("[NotesSync] Gone offline");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const loadNotes = useCallback(async () => {
    try {
      setLoading(true);

      // Load from local IndexedDB first (instant)
      const localNotes = await getAllNotes(USER_ID);
      setNotes(localNotes);

      // Then sync with server if online
      if (navigator.onLine) {
        console.log("[NotesSync] Online - fetching from server...");

        // Pull notes from server
        const serverNotes = await pullNotesFromServer();

        // Add server notes to local IndexedDB if they don't exist
        for (const serverNote of serverNotes) {
          const localNote = localNotes.find((n) => n.id === serverNote.id);

          if (!localNote) {
            // New note from server - add to local
            console.log(
              `[NotesSync] Adding server note ${serverNote.id} to local`
            );
            const noteWithSyncStatus = { ...serverNote, synced: true };
            await addNote(noteWithSyncStatus);
          } else if (
            new Date(serverNote.modified_at).getTime() >
            new Date(localNote.modified_at).getTime()
          ) {
            // Server version is newer - update local
            console.log(
              `[NotesSync] Updating local note ${serverNote.id} with server version`
            );
            const noteWithSyncStatus = { ...serverNote, synced: true };
            await updateNote(noteWithSyncStatus);
          }
        }

        // Push any unsynced local changes to server
        await syncNotes();
      } else {
        console.log("[NotesSync] Offline - using local data only");
      }
    } catch (err) {
      console.error("[NotesSync] Error loading notes:", err);
      setError(err instanceof Error ? err : new Error("Failed to load notes"));
    } finally {
      setLoading(false);
    }
  }, []);

  const syncNotes = useCallback(async () => {
    if (syncing) {
      console.log("[NotesSync] Sync already in progress, skipping");
      return;
    }

    try {
      setSyncing(true);

      // Sync pending local changes to server
      const syncResult = await syncNotesWithServer();
      console.log("[NotesSync] Sync result:", syncResult);

      // Pull latest notes from server
      const serverNotes = await pullNotesFromServer();

      // Merge server notes with local
      if (serverNotes.length > 0) {
        const localNotes = await getAllNotes(USER_ID);
        const localNotesMap = new Map(localNotes.map((n) => [n.id, n]));

        // Add server notes that don't exist locally
        for (const serverNote of serverNotes) {
          if (!localNotesMap.has(serverNote.id)) {
            const noteWithSyncStatus = { ...serverNote, synced: true };
            await addNote(noteWithSyncStatus);
          }
        }
      }
      // CRITICAL: Reload notes from IndexedDB to reflect sync status changes
      await reloadNotesFromDB();
    } catch (err) {
      console.error("[NotesSync] Sync error:", err);
    } finally {
      setSyncing(false);
    }
  }, [syncing, reloadNotesFromDB]);

  const createNote = useCallback(
    async (note: Note) => {
      try {
        // Save to IndexedDB first (instant for user)
        await addNote(note);

        // Update UI immediately with unsynced status
        setNotes((prev) => [note, ...prev]);

        // Try to sync with server in background if online
        if (navigator.onLine) {
          // Clear any existing timeout
          if (syncTimeoutRef.current) {
            clearTimeout(syncTimeoutRef.current);
          }

          // Sync after a short delay to batch operations
          syncTimeoutRef.current = setTimeout(async () => {
            await syncNotes();
          }, 500);
        }

        return note;
      } catch (err) {
        console.error("[NotesSync] Error creating note:", err);
        throw err;
      }
    },
    [syncNotes]
  );

  const modifyNote = useCallback(
    async (note: Note) => {
      try {
        // Mark as unsynced
        const unsyncedNote = { ...note, synced: false };

        // Save to IndexedDB first
        await updateNote(unsyncedNote);

        // Update UI immediately with unsynced status
        setNotes((prev) =>
          prev.map((n) => (n.id === note.id ? unsyncedNote : n))
        );

        // Try to sync with server in background if online
        if (navigator.onLine) {
          // Clear any existing timeout
          if (syncTimeoutRef.current) {
            clearTimeout(syncTimeoutRef.current);
          }

          // Sync after a short delay to batch operations
          syncTimeoutRef.current = setTimeout(async () => {
            await syncNotes();
          }, 500);
        }
      } catch (err) {
        console.error("[NotesSync] Error updating note:", err);
        throw err;
      }
    },
    [syncNotes]
  );

  const removeNote = useCallback(
    async (id: string) => {
      try {
        // Delete from IndexedDB
        await deleteNote(id, USER_ID);

        // Update UI immediately
        setNotes((prev) => prev.filter((n) => n.id !== id));

        // Try to sync with server in background if online
        if (navigator.onLine) {
          // Clear any existing timeout
          if (syncTimeoutRef.current) {
            clearTimeout(syncTimeoutRef.current);
          }

          // Sync after a short delay
          syncTimeoutRef.current = setTimeout(async () => {
            await syncNotes();
          }, 500);
        }
      } catch (err) {
        console.error("[NotesSync] Error deleting note:", err);
        throw err;
      }
    },
    [syncNotes]
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

  return {
    notes,
    loading,
    syncing,
    error,
    createNote,
    modifyNote,
    removeNote,
    reloadNotes: loadNotes,
    syncNotes,
  };
}
// "use client";

// import { useEffect, useState, useCallback } from "react";
// import type { Note } from "@/types/note";
// import { getAllNotes, addNote, updateNote, deleteNote } from "./db";

// const USER_ID = "emmanueltemitopedorcas20@gmail.com";

// export function useNotes() {
//   const [notes, setNotes] = useState<Note[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<Error | null>(null);

//   // Load all notes on mount
//   useEffect(() => {
//     loadNotes();
//   }, []);

//   const loadNotes = useCallback(async () => {
//     try {
//       setLoading(true);
//       const loadedNotes = await getAllNotes(USER_ID);
//       setNotes(loadedNotes);
//     } catch (err) {
//       console.error("[v0] Error loading notes:", err);
//       setError(err instanceof Error ? err : new Error("Failed to load notes"));
//     } finally {
//       setLoading(false);
//     }
//   }, []);

//   const createNote = useCallback(async (note: Note) => {
//     try {
//       await addNote(note);
//       setNotes((prev) => [note, ...prev]);
//       return note;
//     } catch (err) {
//       console.error("[v0] Error creating note:", err);
//       throw err;
//     }
//   }, []);

//   const modifyNote = useCallback(async (note: Note) => {
//     try {
//       await updateNote(note);
//       setNotes((prev) => prev.map((n) => (n.id === note.id ? note : n)));
//     } catch (err) {
//       console.error("[v0] Error updating note:", err);
//       throw err;
//     }
//   }, []);

//   const removeNote = useCallback(async (id: string) => {
//     try {
//       await deleteNote(id, USER_ID);
//       setNotes((prev) => prev.filter((n) => n.id !== id));
//     } catch (err) {
//       console.error("[v0] Error deleting note:", err);
//       throw err;
//     }
//   }, []);

//   return {
//     notes,
//     loading,
//     error,
//     createNote,
//     modifyNote,
//     removeNote,
//     reloadNotes: loadNotes,
//   };
// }
