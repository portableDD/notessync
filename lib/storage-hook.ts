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
  const hasLoadedRef = useRef(false);
  const isSyncingRef = useRef(false);

  // Reload notes from IndexedDB
  const reloadNotesFromDB = useCallback(async () => {
    try {
      const loadedNotes = await getAllNotes(USER_ID);
      setNotes(loadedNotes);
      console.log(
        "[NotesSync] Notes reloaded from IndexedDB:",
        loadedNotes.length
      );
    } catch (err) {
      console.error("[NotesSync] Error reloading notes:", err);
    }
  }, []);

  // Sync notes with server
  const syncNotes = useCallback(async () => {
    if (isSyncingRef.current) {
      console.log("[NotesSync] Sync already in progress, skipping");
      return;
    }

    if (!navigator.onLine) {
      console.log("[NotesSync] Offline, skipping sync");
      return;
    }

    try {
      isSyncingRef.current = true;
      setSyncing(true);

      console.log("[NotesSync] Starting sync process...");

      // Step 1: Push local changes to server
      const syncResult = await syncNotesWithServer();
      console.log("[NotesSync] Push sync result:", syncResult);

      // Step 2: Pull updates from server
      await pullNotesFromServer();

      // Step 3: Reload notes from IndexedDB to reflect all changes
      await reloadNotesFromDB();

      console.log("[NotesSync] Sync completed successfully");
    } catch (err) {
      console.error("[NotesSync] Sync error:", err);
    } finally {
      setSyncing(false);
      isSyncingRef.current = false;
    }
  }, [reloadNotesFromDB]);

  // Load notes - runs once on mount
  const loadNotes = useCallback(async () => {
    if (hasLoadedRef.current) {
      console.log("[NotesSync] Already loaded, skipping");
      return;
    }

    try {
      setLoading(true);
      hasLoadedRef.current = true;

      console.log("[NotesSync] Initial load starting...");

      // Always pull from server first if online
      if (navigator.onLine) {
        console.log("[NotesSync] Online - pulling from server...");
        await pullNotesFromServer();
      } else {
        console.log("[NotesSync] Offline - using local data only");
      }

      // Load from IndexedDB
      const localNotes = await getAllNotes(USER_ID);
      console.log(
        `[NotesSync] Loaded ${localNotes.length} notes from IndexedDB`
      );
      setNotes(localNotes);

      // If online, sync any pending changes
      if (navigator.onLine) {
        await syncNotes();
      }
    } catch (err) {
      console.error("[NotesSync] Error loading notes:", err);
      setError(err instanceof Error ? err : new Error("Failed to load notes"));
      hasLoadedRef.current = false;
    } finally {
      setLoading(false);
    }
  }, [syncNotes]);

  // Load notes on mount
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
  }, [syncNotes]);

  const createNote = useCallback(
    async (note: Note) => {
      try {
        console.log("[NotesSync] Creating note:", note.id);

        // Save to IndexedDB first (instant for user)
        await addNote(note);

        // Update UI immediately
        setNotes((prev) => [note, ...prev]);

        // Sync with server immediately if online
        if (navigator.onLine) {
          // Clear any pending timeout
          if (syncTimeoutRef.current) {
            clearTimeout(syncTimeoutRef.current);
          }

          // Sync immediately for create operations
          await syncNotes();
        } else {
          console.log("[NotesSync] Offline - note will sync when online");
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
        console.log("[NotesSync] Updating note:", note.id);

        // Mark as unsynced
        const unsyncedNote = { ...note, synced: false };

        // Save to IndexedDB first
        await updateNote(unsyncedNote);

        // Update UI immediately
        setNotes((prev) =>
          prev.map((n) => (n.id === note.id ? unsyncedNote : n))
        );

        // Debounce sync for update operations (500ms)
        if (navigator.onLine) {
          if (syncTimeoutRef.current) {
            clearTimeout(syncTimeoutRef.current);
          }

          syncTimeoutRef.current = setTimeout(async () => {
            await syncNotes();
          }, 500);
        } else {
          console.log("[NotesSync] Offline - note will sync when online");
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
        console.log("[NotesSync] Deleting note:", id);

        // Delete from IndexedDB
        await deleteNote(id, USER_ID);

        // Update UI immediately
        setNotes((prev) => prev.filter((n) => n.id !== id));

        // Sync with server immediately if online
        if (navigator.onLine) {
          // Clear any pending timeout
          if (syncTimeoutRef.current) {
            clearTimeout(syncTimeoutRef.current);
          }

          // Sync immediately for delete operations
          await syncNotes();
        } else {
          console.log("[NotesSync] Offline - deletion will sync when online");
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
