"use client";

import { useEffect, useState, useCallback } from "react";
import type { Note } from "@/types/note";
import { getAllNotes, addNote, updateNote, deleteNote } from "./db";
import { syncNotesWithServer, pullNotesFromServer } from "./sync";

const USER_ID = "emmanueltemitopedorcas20@gmail.com";

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

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

      // Then try to sync with server if online
      if (navigator.onLine) {
        await syncNotes();
      }
    } catch (err) {
      console.error("[NotesSync] Error loading notes:", err);
      setError(err instanceof Error ? err : new Error("Failed to load notes"));
    } finally {
      setLoading(false);
    }
  }, []);

  const syncNotes = useCallback(async () => {
    if (syncing) return; // Prevent concurrent syncs

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

        // Reload to show merged data
        const updatedNotes = await getAllNotes(USER_ID);
        setNotes(updatedNotes);
      }
    } catch (err) {
      console.error("[NotesSync] Sync error:", err);
    } finally {
      setSyncing(false);
    }
  }, [syncing]);

  const createNote = useCallback(
    async (note: Note) => {
      try {
        // Save to IndexedDB first (instant for user)
        await addNote(note);

        // Update UI immediately
        setNotes((prev) => [note, ...prev]);

        // Try to sync with server in background if online
        if (navigator.onLine) {
          syncNotes();
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

        // Update UI immediately
        setNotes((prev) =>
          prev.map((n) => (n.id === note.id ? unsyncedNote : n))
        );

        // Try to sync with server in background if online
        if (navigator.onLine) {
          syncNotes();
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
          syncNotes();
        }
      } catch (err) {
        console.error("[NotesSync] Error deleting note:", err);
        throw err;
      }
    },
    [syncNotes]
  );

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
