import type { Note } from "@/types/note";

const DB_NAME = "NotesSync";
const DB_VERSION = 1;
const STORE_NAME = "notes";
const SYNC_QUEUE_STORE = "syncQueue";

let dbInstance: IDBDatabase | null = null;

export async function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error("[NotesSync] IndexedDB Error:", request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      console.log("[NotesSync] IndexedDB initialized successfully");
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create notes object store
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const noteStore = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        noteStore.createIndex("user_id", "user_id", { unique: false });
        noteStore.createIndex("synced", "synced", { unique: false });
        noteStore.createIndex("modified_at", "modified_at", { unique: false });
        console.log("[NotesSync] Created notes object store");
      }

      // Create sync queue store
      if (!db.objectStoreNames.contains(SYNC_QUEUE_STORE)) {
        db.createObjectStore(SYNC_QUEUE_STORE, {
          keyPath: "id",
          autoIncrement: true,
        });
        console.log("[NotesSync] Created sync queue store");
      }
    };
  });
}

export async function getAllNotes(userId: string): Promise<Note[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index("user_id");
    const request = index.getAll(userId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const notes = request.result as Note[];
      const sorted = notes.sort(
        (a, b) =>
          new Date(b.modified_at).getTime() - new Date(a.modified_at).getTime()
      );
      resolve(sorted);
    };
  });
}

export async function getNote(id: string): Promise<Note | undefined> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

export async function addNote(note: Note): Promise<string> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    // Ensure note is marked as unsynced when created
    const noteToAdd = { ...note, synced: false };
    const request = store.add(noteToAdd);

    request.onerror = () => {
      console.error("[NotesSync] Error adding note:", request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      console.log(`[NotesSync] Note ${note.id} added to IndexedDB`);
      // Add to sync queue
      addToSyncQueue("create", noteToAdd);
      resolve(request.result as string);
    };
  });
}

export async function updateNote(note: Note): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    // Mark as unsynced unless explicitly synced
    const noteToUpdate =
      note.synced !== undefined ? note : { ...note, synced: false };

    const request = store.put(noteToUpdate);

    request.onerror = () => {
      console.error("[NotesSync] Error updating note:", request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      console.log(`[NotesSync] Note ${note.id} updated in IndexedDB`);
      // Only add to sync queue if not already synced
      if (!noteToUpdate.synced) {
        addToSyncQueue("update", noteToUpdate);
      }
      resolve();
    };
  });
}

export async function deleteNote(id: string, userId: string): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    // First get the note to add to sync queue
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const note = getRequest.result as Note;

      // Delete from IndexedDB
      const deleteRequest = store.delete(id);

      deleteRequest.onerror = () => {
        console.error("[NotesSync] Error deleting note:", deleteRequest.error);
        reject(deleteRequest.error);
      };

      deleteRequest.onsuccess = () => {
        console.log(`[NotesSync] Note ${id} deleted from IndexedDB`);
        // Add to sync queue if note was found
        if (note) {
          addToSyncQueue("delete", note);
        }
        resolve();
      };
    };

    getRequest.onerror = () => reject(getRequest.error);
  });
}

export async function addToSyncQueue(
  operation: "create" | "update" | "delete",
  note: Note
): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(SYNC_QUEUE_STORE, "readwrite");
    const store = transaction.objectStore(SYNC_QUEUE_STORE);
    const request = store.add({
      operation,
      note,
      timestamp: new Date().toISOString(),
    });

    request.onerror = () => {
      console.error("[NotesSync] Error adding to sync queue:", request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      console.log(
        `[NotesSync] Added ${operation} operation for note ${note.id} to sync queue`
      );
      resolve();
    };
  });
}

export async function getSyncQueue(): Promise<
  Array<{ id: number; operation: string; note: Note; timestamp: string }>
> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(SYNC_QUEUE_STORE, "readonly");
    const store = transaction.objectStore(SYNC_QUEUE_STORE);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const queue = request.result;
      console.log(
        `[NotesSync] Retrieved ${queue.length} items from sync queue`
      );
      resolve(queue);
    };
  });
}

export async function clearSyncQueue(): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(SYNC_QUEUE_STORE, "readwrite");
    const store = transaction.objectStore(SYNC_QUEUE_STORE);
    const request = store.clear();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      console.log("[NotesSync] Sync queue cleared");
      resolve();
    };
  });
}

export async function removeSyncQueueItem(id: number): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(SYNC_QUEUE_STORE, "readwrite");
    const store = transaction.objectStore(SYNC_QUEUE_STORE);
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      console.log(`[NotesSync] Removed sync queue item ${id}`);
      resolve();
    };
  });
}

// FIXED: Count unsynced notes by manually filtering instead of using IDBKeyRange.only()
export async function getUnsyncedNotesCount(): Promise<number> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const allNotes = request.result as Note[];
      // Manually filter for unsynced notes
      const unsyncedCount = allNotes.filter(
        (note) => note.synced === false
      ).length;
      console.log(`[NotesSync] Found ${unsyncedCount} unsynced notes`);
      resolve(unsyncedCount);
    };
  });
}

// FIXED: Get all unsynced notes by manually filtering instead of using IDBKeyRange.only()
export async function getAllUnsyncedNotes(): Promise<Note[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const allNotes = request.result as Note[];
      // Manually filter for unsynced notes
      const unsyncedNotes = allNotes.filter((note) => note.synced === false);
      console.log(`[NotesSync] Found ${unsyncedNotes.length} unsynced notes`);
      resolve(unsyncedNotes);
    };
  });
}

// import type { Note } from "@/types/note";

// const DB_NAME = "NotesSync";
// const DB_VERSION = 1;
// const STORE_NAME = "notes";
// const SYNC_QUEUE_STORE = "syncQueue";

// let dbInstance: IDBDatabase | null = null;

// export async function initDB(): Promise<IDBDatabase> {
//   return new Promise((resolve, reject) => {
//     if (dbInstance) {
//       resolve(dbInstance);
//       return;
//     }

//     const request = indexedDB.open(DB_NAME, DB_VERSION);

//     request.onerror = () => {
//       console.error("[v0] IndexedDB Error:", request.error);
//       reject(request.error);
//     };

//     request.onsuccess = () => {
//       dbInstance = request.result;
//       resolve(dbInstance);
//     };

//     request.onupgradeneeded = (event) => {
//       const db = (event.target as IDBOpenDBRequest).result;

//       // Create notes object store
//       if (!db.objectStoreNames.contains(STORE_NAME)) {
//         const noteStore = db.createObjectStore(STORE_NAME, { keyPath: "id" });
//         noteStore.createIndex("user_id", "user_id", { unique: false });
//         noteStore.createIndex("synced", "synced", { unique: false });
//         noteStore.createIndex("modified_at", "modified_at", { unique: false });
//       }

//       // Create sync queue store
//       if (!db.objectStoreNames.contains(SYNC_QUEUE_STORE)) {
//         db.createObjectStore(SYNC_QUEUE_STORE, {
//           keyPath: "id",
//           autoIncrement: true,
//         });
//       }
//     };
//   });
// }

// export async function getAllNotes(userId: string): Promise<Note[]> {
//   const db = await initDB();
//   return new Promise((resolve, reject) => {
//     const transaction = db.transaction(STORE_NAME, "readonly");
//     const store = transaction.objectStore(STORE_NAME);
//     const index = store.index("user_id");
//     const request = index.getAll(userId);

//     request.onerror = () => reject(request.error);
//     request.onsuccess = () => {
//       const notes = request.result as Note[];
//       resolve(
//         notes.sort(
//           (a, b) =>
//             new Date(b.modified_at).getTime() -
//             new Date(a.modified_at).getTime()
//         )
//       );
//     };
//   });
// }

// export async function addNote(note: Note): Promise<string> {
//   const db = await initDB();
//   return new Promise((resolve, reject) => {
//     const transaction = db.transaction(STORE_NAME, "readwrite");
//     const store = transaction.objectStore(STORE_NAME);
//     const request = store.add(note);

//     request.onerror = () => reject(request.error);
//     request.onsuccess = () => {
//       addToSyncQueue("create", note);
//       resolve(request.result as string);
//     };
//   });
// }

// export async function updateNote(note: Note): Promise<void> {
//   const db = await initDB();
//   return new Promise((resolve, reject) => {
//     const transaction = db.transaction(STORE_NAME, "readwrite");
//     const store = transaction.objectStore(STORE_NAME);
//     const request = store.put(note);

//     request.onerror = () => reject(request.error);
//     request.onsuccess = () => {
//       addToSyncQueue("update", note);
//       resolve();
//     };
//   });
// }

// export async function deleteNote(id: string, userId: string): Promise<void> {
//   const db = await initDB();
//   return new Promise((resolve, reject) => {
//     const transaction = db.transaction(STORE_NAME, "readwrite");
//     const store = transaction.objectStore(STORE_NAME);
//     const request = store.delete(id);

//     request.onerror = () => reject(request.error);
//     request.onsuccess = () => {
//       const note = { id, user_id: userId } as Note;
//       addToSyncQueue("delete", note);
//       resolve();
//     };
//   });
// }

// export async function addToSyncQueue(
//   operation: "create" | "update" | "delete",
//   note: Note
// ): Promise<void> {
//   const db = await initDB();
//   return new Promise((resolve, reject) => {
//     const transaction = db.transaction(SYNC_QUEUE_STORE, "readwrite");
//     const store = transaction.objectStore(SYNC_QUEUE_STORE);
//     const request = store.add({
//       operation,
//       note,
//       timestamp: new Date().toISOString(),
//     });

//     request.onerror = () => reject(request.error);
//     request.onsuccess = () => resolve();
//   });
// }

// export async function getSyncQueue(): Promise<
//   Array<{ id: number; operation: string; note: Note; timestamp: string }>
// > {
//   const db = await initDB();
//   return new Promise((resolve, reject) => {
//     const transaction = db.transaction(SYNC_QUEUE_STORE, "readonly");
//     const store = transaction.objectStore(SYNC_QUEUE_STORE);
//     const request = store.getAll();

//     request.onerror = () => reject(request.error);
//     request.onsuccess = () => resolve(request.result);
//   });
// }

// export async function clearSyncQueue(): Promise<void> {
//   const db = await initDB();
//   return new Promise((resolve, reject) => {
//     const transaction = db.transaction(SYNC_QUEUE_STORE, "readwrite");
//     const store = transaction.objectStore(SYNC_QUEUE_STORE);
//     const request = store.clear();

//     request.onerror = () => reject(request.error);
//     request.onsuccess = () => resolve();
//   });
// }

// export async function removeSyncQueueItem(id: number): Promise<void> {
//   const db = await initDB();
//   return new Promise((resolve, reject) => {
//     const transaction = db.transaction(SYNC_QUEUE_STORE, "readwrite");
//     const store = transaction.objectStore(SYNC_QUEUE_STORE);
//     const request = store.delete(id);

//     request.onerror = () => reject(request.error);
//     request.onsuccess = () => resolve();
//   });
// }
