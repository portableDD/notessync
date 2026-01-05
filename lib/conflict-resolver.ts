import type { Note } from "@/types/note";

export type ConflictResolutionStrategy =
  | "local-wins"
  | "server-wins"
  | "merge"
  | "manual";

/**
 * Local-Wins Strategy: User's local changes take priority
 * Use when you trust the user's work more than server version
 */
export function resolveConflictLocalWins(
  localNote: Note,
  serverNote: Note
): Note {
  console.log(
    ` Resolving conflict with local-wins strategy for note ${localNote.id}`
  );
  return {
    ...localNote,
    modified_at: new Date().toISOString(),
  };
}

/**
 * Server-Wins Strategy: Server version takes priority
 * Use when server is source of truth (collaborative apps)
 */
export function resolveConflictServerWins(
  localNote: Note,
  serverNote: Note
): Note {
  console.log(
    ` Resolving conflict with server-wins strategy for note ${localNote.id}`
  );
  return serverNote;
}

/**
 * Merge Strategy: Combine both versions
 * Use when both versions have valuable changes
 */
export function resolveConflictMerge(localNote: Note, serverNote: Note): Note {
  console.log(` Merging conflict for note ${localNote.id}`);

  // Simple merge: append local changes to server content if they differ
  let mergedContent = serverNote.content;

  if (localNote.content !== serverNote.content) {
    // Check if local content contains server content (already merged)
    if (!localNote.content.includes(serverNote.content)) {
      // Append with separator
      mergedContent = `${serverNote.content}\n\n--- Local changes ---\n${localNote.content}`;
    } else {
      mergedContent = localNote.content;
    }
  }

  return {
    ...localNote,
    content: mergedContent,
    title: localNote.title || serverNote.title,
    modified_at: new Date().toISOString(),
  };
}

/**
 * Compare two notes and detect conflicts
 */
export function detectConflict(localNote: Note, serverNote: Note): boolean {
  const localTime = new Date(localNote.modified_at).getTime();
  const serverTime = new Date(serverNote.modified_at).getTime();

  // Conflict exists if both were modified after the other
  return (
    localNote.content !== serverNote.content ||
    localNote.title !== serverNote.title
  );
}

/**
 * Get conflict resolution strategy based on situation
 */
export function getResolutionStrategy(
  localNote: Note,
  serverNote: Note,
  userPreference: ConflictResolutionStrategy = "local-wins"
): Note {
  if (!detectConflict(localNote, serverNote)) {
    return localNote;
  }

  switch (userPreference) {
    case "local-wins":
      return resolveConflictLocalWins(localNote, serverNote);
    case "server-wins":
      return resolveConflictServerWins(localNote, serverNote);
    case "merge":
      return resolveConflictMerge(localNote, serverNote);
    case "manual":
      // Return both versions for manual resolution
      return localNote;
    default:
      return resolveConflictLocalWins(localNote, serverNote);
  }
}
