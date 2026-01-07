/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Note } from "@/types/note";
import {
  getSyncQueue,
  removeSyncQueueItem,
  updateNote as updateNoteLocal,
  getAllNotes,
  addNote as addNoteLocal,
  deleteNote,
} from "./db";
import {
  fetchNotes,
  createNoteOnServer,
  updateNoteOnServer,
  deleteNoteOnServer,
  checkConflict,
} from "./api";
import { getResolutionStrategy } from "./conflict-resolver";

const USER_ID = "emmanueltemitopedorcas20@gmail.com";

export async function syncNotesWithServer(): Promise<{
  synced: number;
  failed: number;
  conflicts: number;
}> {
  const stats = { synced: 0, failed: 0, conflicts: 0 };

  try {
    console.log("[NotesSync] Starting sync with server...");

    // Dispatch sync start event
    window.dispatchEvent(new CustomEvent("sync:start"));

    // Get pending operations from sync queue
    const queue = await getSyncQueue();

    if (queue.length === 0) {
      console.log("[NotesSync] No pending operations to sync");
      // Dispatch sync complete event
      window.dispatchEvent(new CustomEvent("sync:complete", { detail: stats }));
      return stats;
    }

    console.log(`[NotesSync] Processing ${queue.length} pending operations`);

    // Process each operation in queue
    for (const item of queue) {
      try {
        const { operation, note } = item;

        console.log(`[NotesSync] Processing ${operation} for note ${note.id}`);

        // Check for conflicts before sync (except for delete)
        if (operation !== "delete") {
          const conflictingNote = await checkConflict(note);

          if (conflictingNote) {
            console.log(`[NotesSync] Conflict detected for note ${note.id}`);

            // Resolve conflict using local-wins strategy
            const resolvedNote = getResolutionStrategy(
              note,
              conflictingNote,
              "local-wins"
            );

            // Update server with resolved version
            await updateNoteOnServer(resolvedNote);

            // Update local with resolved version
            const syncedNote: Note = { ...resolvedNote, synced: true };
            await updateNoteLocal(syncedNote);

            stats.conflicts++;
            await removeSyncQueueItem(item.id);
            continue;
          }
        }

        // Execute the operation
        switch (operation) {
          case "create":
            await createNoteOnServer(note);
            // Mark as synced in local database
            const createdNote: Note = { ...note, synced: true };
            await updateNoteLocal(createdNote);
            break;

          case "update":
            await updateNoteOnServer(note);
            // Mark as synced in local database
            const updatedNote: Note = { ...note, synced: true };
            await updateNoteLocal(updatedNote);
            break;

          case "delete":
            await deleteNoteOnServer(note.id, note.user_id);
            break;
        }

        // Remove from sync queue
        await removeSyncQueueItem(item.id);
        stats.synced++;

        console.log(
          `[NotesSync] ✓ Successfully synced ${operation} for note ${note.id}`
        );
      } catch (error: any) {
        console.error(`[NotesSync] ✗ Failed to sync item:`, error);
        stats.failed++;

        // If it's a 404, the note might have been deleted on server
        if (error.message?.includes("404") && item.operation !== "delete") {
          console.log(
            `[NotesSync] Note ${item.note.id} not found on server, removing from queue`
          );
          await removeSyncQueueItem(item.id);
        }
      }
    }

    console.log("[NotesSync] Sync completed:", stats);

    // Dispatch sync complete event
    window.dispatchEvent(new CustomEvent("sync:complete", { detail: stats }));

    return stats;
  } catch (error) {
    console.error("[NotesSync] Fatal error during sync:", error);

    // Dispatch sync error event
    window.dispatchEvent(
      new CustomEvent("sync:error", {
        detail: {
          message: error instanceof Error ? error.message : "Unknown error",
        },
      })
    );

    throw error;
  }
}

export async function registerBackgroundSync() {
  if ("serviceWorker" in navigator && "SyncManager" in window) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await (registration as any).sync.register("sync-notes");
      console.log("[NotesSync] Background sync registered");
    } catch (error) {
      console.warn("[NotesSync] Background sync not available:", error);
    }
  }
}

// FIXED: Properly mark server notes as synced and handle deletions
export async function pullNotesFromServer(): Promise<Note[]> {
  try {
    console.log("[NotesSync] Pulling notes from server...");
    const serverNotes = await fetchNotes(USER_ID);
    console.log(`[NotesSync] Pulled ${serverNotes.length} notes from server`);

    // Get local notes to check what exists
    const localNotes = await getAllNotes(USER_ID);
    const localNotesMap = new Map(localNotes.map((n) => [n.id, n]));
    const serverNotesMap = new Map(serverNotes.map((n) => [n.id, n]));

    const notesToProcess: Note[] = [];

    // Process server notes - add new or update existing
    for (const serverNote of serverNotes) {
      const localNote = localNotesMap.get(serverNote.id);

      if (!localNote) {
        // New note from server - add to local with synced status
        console.log(`[NotesSync] New note from server: ${serverNote.id}`);
        const syncedNote = { ...serverNote, synced: true };
        await addNoteLocal(syncedNote);
        notesToProcess.push(syncedNote);
      } else {
        // Note exists locally - check if server version is newer
        const serverTime = new Date(serverNote.modified_at).getTime();
        const localTime = new Date(localNote.modified_at).getTime();

        // Only update if server is newer AND local is already synced
        // (don't overwrite local unsynced changes)
        if (serverTime > localTime && localNote.synced) {
          console.log(
            `[NotesSync] Updating local note with newer server version: ${serverNote.id}`
          );
          const syncedNote = { ...serverNote, synced: true };
          await updateNoteLocal(syncedNote);
          notesToProcess.push(syncedNote);
        } else if (localNote.synced === false) {
          console.log(
            `[NotesSync] Skipping update for ${serverNote.id} - local has unsynced changes`
          );
        } else {
          // Local and server are in sync, ensure synced flag is set
          if (!localNote.synced) {
            console.log(`[NotesSync] Marking note as synced: ${serverNote.id}`);
            const syncedNote = { ...localNote, synced: true };
            await updateNoteLocal(syncedNote);
            notesToProcess.push(syncedNote);
          }
        }
      }
    }

    // CRITICAL: Handle deletions - remove local notes that don't exist on server
    // But only if they're already synced (don't delete unsynced local notes)
    for (const localNote of localNotes) {
      if (!serverNotesMap.has(localNote.id) && localNote.synced) {
        console.log(
          `[NotesSync] ⚠️  Note ${localNote.id} deleted on server, removing from local`
        );
        await deleteNote(localNote.id, USER_ID);
      }
    }

    console.log(
      `[NotesSync] Processed ${notesToProcess.length} notes from server`
    );
    return notesToProcess;
  } catch (error) {
    console.error("[NotesSync] Error pulling notes from server:", error);
    return [];
  }
}

export async function fullSync(): Promise<void> {
  try {
    console.log("[NotesSync] Starting full synchronization...");

    // 1. Push local changes to server
    await syncNotesWithServer();

    // 2. Pull server changes
    const serverNotes = await pullNotesFromServer();

    console.log(
      `[NotesSync] Full sync complete. ${serverNotes.length} notes updated from server`
    );
  } catch (error) {
    console.error("[NotesSync] Full sync failed:", error);
    throw error;
  }
}

// /* eslint-disable @typescript-eslint/no-explicit-any */
// import type { Note } from "@/types/note";
// import {
//   getSyncQueue,
//   removeSyncQueueItem,
//   updateNote as updateNoteLocal,
// } from "./db";
// import {
//   fetchNotes,
//   createNoteOnServer,
//   updateNoteOnServer,
//   deleteNoteOnServer,
//   checkConflict,
// } from "./api";

// const USER_ID = "emmanueltemitopedorcas20@gmail.com";

// export async function syncNotesWithServer(): Promise<{
//   synced: number;
//   failed: number;
//   conflicts: number;
// }> {
//   const stats = { synced: 0, failed: 0, conflicts: 0 };

//   try {
//     console.log("[v0] Starting sync with server...");

//     // Get pending operations from sync queue
//     const queue = await getSyncQueue();

//     if (queue.length === 0) {
//       console.log("[v0] No pending operations to sync");
//       return stats;
//     }

//     // Process each operation in queue
//     for (const item of queue) {
//       try {
//         const { operation, note } = item;

//         console.log(`[v0] Processing ${operation} for note ${note.id}`);

//         // Check for conflicts before sync
//         if (operation !== "delete") {
//           const serverNote = await checkConflict(note);
//           if (serverNote) {
//             console.log(`[v0] Conflict detected for note ${note.id}`);
//             stats.conflicts++;
//             // Keep local version (user's changes take precedence)
//             // In production, you might want to notify user
//             continue;
//           }
//         }

//         // Execute the operation
//         switch (operation) {
//           case "create":
//             await createNoteOnServer(note);
//             break;
//           case "update":
//             await updateNoteOnServer(note);
//             break;
//           case "delete":
//             await deleteNoteOnServer(note.id);
//             break;
//         }

//         // Mark as synced in local database
//         if (operation !== "delete") {
//           const syncedNote: Note = { ...note, synced: true };
//           await updateNoteLocal(syncedNote);
//         }

//         // Remove from sync queue
//         await removeSyncQueueItem(item.id);
//         stats.synced++;

//         console.log(
//           ` Successfully synced ${operation} for note ${note.id}`
//         );
//       } catch (error) {
//         console.error(`[v0] Failed to sync item:`, error);
//         stats.failed++;
//       }
//     }

//     console.log(" Sync completed:", stats);
//     return stats;
//   } catch (error) {
//     console.error(" Fatal error during sync:", error);
//     throw error;
//   }
// }

// export async function registerBackgroundSync() {
//   if ("serviceWorker" in navigator && "SyncManager" in window) {
//     try {
//       const registration = await navigator.serviceWorker.ready;
//       await (registration as any).sync.register("sync-notes");
//       console.log(" Background sync registered");
//     } catch (error) {
//       console.warn(" Background sync not available:", error);
//     }
//   }
// }

// export async function pullNotesFromServer(): Promise<Note[]> {
//   try {
//     console.log(" Pulling notes from server...");
//     const serverNotes = await fetchNotes(USER_ID);
//     console.log(` Pulled ${serverNotes.length} notes from server`);
//     return serverNotes;
//   } catch (error) {
//     console.error(" Error pulling notes from server:", error);
//     return [];
//   }
// }
