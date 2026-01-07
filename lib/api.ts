/* eslint-disable @typescript-eslint/no-unused-vars */
import type { Note } from "@/types/note";

// Validate environment variables
const API_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL;
const API_KEY = process.env.SUPABASE_ANON_KEY;

if (!API_BASE || !API_KEY) {
  console.error("❌ Missing environment variables:", {
    hasUrl: !!API_BASE,
    hasKey: !!API_KEY,
  });
}

const headers = {
  "Content-Type": "application/json",
  apikey: API_KEY || "",
  Authorization: `Bearer ${API_KEY || ""}`,
};

const headersWithPrefer = {
  ...headers,
  Prefer: "return=representation",
};

// Helper function to handle API errors
async function handleApiError(response: Response, operation: string) {
  let errorMessage = `${operation} failed: ${response.status} ${response.statusText}`;

  try {
    const errorData = await response.json();
    if (errorData.message) {
      errorMessage = `${operation} failed: ${errorData.message}`;
    }
    console.error(`[API Error] ${operation}:`, errorData);
  } catch {
    // If error response isn't JSON, use status text
    console.error(`[API Error] ${operation}:`, response.statusText);
  }

  throw new Error(errorMessage);
}

export async function fetchNotes(userId: string): Promise<Note[]> {
  // Validate inputs
  if (!API_BASE || !API_KEY) {
    console.error("❌ Cannot fetch notes: Missing API configuration");
    throw new Error("API not configured. Check environment variables.");
  }

  if (!userId) {
    throw new Error("User ID is required");
  }

  try {
    console.log(`[API] Fetching notes for user: ${userId}`);

    const url = `${API_BASE}/rest/v1/notes?user_id=eq.${encodeURIComponent(
      userId
    )}&order=created_at.desc`;
    console.log(`[API] Request URL: ${url}`);

    const response = await fetch(url, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      await handleApiError(response, "Fetch notes");
    }

    const data = await response.json();
    console.log(`[API] ✓ Fetched ${data.length} notes successfully`);
    return data;
  } catch (error) {
    console.error("[API] Error fetching notes:", error);

    // If offline, return empty array instead of throwing
    if (!navigator.onLine) {
      console.log("[API] Device is offline, will use local data only");
      return [];
    }

    throw error;
  }
}

export async function createNoteOnServer(note: Note): Promise<Note> {
  // Validate inputs
  if (!API_BASE || !API_KEY) {
    console.error("❌ Cannot create note: Missing API configuration");
    throw new Error("API not configured. Check environment variables.");
  }

  if (!note.id || !note.user_id) {
    throw new Error("Invalid note data: missing id or user_id");
  }

  try {
    console.log(`[API] Creating note: ${note.id}`);

    const url = `${API_BASE}/rest/v1/notes`;

    // Prepare note data (exclude synced field for server)
    // Ensure title and content have at least some value (use "Untitled" and space for empty)
    const { synced, ...noteData } = note;
    const dataToSend = {
      ...noteData,
      title: noteData.title.trim() || "Untitled",
      content: noteData.content.trim() || " ", // Space to satisfy "required" constraint
    };

    const response = await fetch(url, {
      method: "POST",
      headers: headersWithPrefer,
      body: JSON.stringify(dataToSend),
    });

    if (!response.ok) {
      await handleApiError(response, "Create note");
    }

    const data = await response.json();
    const createdNote = Array.isArray(data) ? data[0] : data;
    console.log(`[API] ✓ Note created successfully: ${createdNote.id}`);
    return createdNote;
  } catch (error) {
    console.error("[API] Error creating note:", error);
    throw error;
  }
}

export async function updateNoteOnServer(note: Note): Promise<Note> {
  // Validate inputs
  if (!API_BASE || !API_KEY) {
    console.error("❌ Cannot update note: Missing API configuration");
    throw new Error("API not configured. Check environment variables.");
  }

  if (!note.id || !note.user_id) {
    throw new Error("Invalid note data: missing id or user_id");
  }

  try {
    console.log(`[API] Updating note: ${note.id}`);

    const url = `${API_BASE}/rest/v1/notes?id=eq.${
      note.id
    }&user_id=eq.${encodeURIComponent(note.user_id)}`;

    // Only send fields that should be updated
    // Ensure title and content are not empty
    const updateData = {
      title: note.title.trim() || "Untitled",
      content: note.content.trim() || " ",
      modified_at: note.modified_at,
    };

    const response = await fetch(url, {
      method: "PATCH",
      headers: headersWithPrefer,
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      await handleApiError(response, "Update note");
    }

    const data = await response.json();
    const updatedNote = Array.isArray(data) ? data[0] : data;

    if (!updatedNote) {
      console.warn(
        `[API] ⚠ Note ${note.id} not found on server, returning local version`
      );
      return note;
    }

    console.log(`[API] ✓ Note updated successfully: ${updatedNote.id}`);
    return updatedNote;
  } catch (error) {
    console.error("[API] Error updating note:", error);
    throw error;
  }
}

export async function deleteNoteOnServer(
  id: string,
  userId?: string
): Promise<void> {
  // Validate inputs
  if (!API_BASE || !API_KEY) {
    console.error("❌ Cannot delete note: Missing API configuration");
    throw new Error("API not configured. Check environment variables.");
  }

  if (!id) {
    throw new Error("Note ID is required");
  }

  try {
    console.log(`[API] Deleting note: ${id}`);

    // Include user_id in query for security
    const url = userId
      ? `${API_BASE}/rest/v1/notes?id=eq.${id}&user_id=eq.${encodeURIComponent(
          userId
        )}`
      : `${API_BASE}/rest/v1/notes?id=eq.${id}`;

    const response = await fetch(url, {
      method: "DELETE",
      headers,
    });

    if (!response.ok) {
      // 404 is acceptable for delete (already deleted)
      if (response.status === 404) {
        console.log(`[API] Note ${id} not found on server (already deleted)`);
        return;
      }
      await handleApiError(response, "Delete note");
    }

    console.log(`[API] ✓ Note deleted successfully: ${id}`);
  } catch (error) {
    console.error("[API] Error deleting note:", error);
    throw error;
  }
}

export async function checkConflict(localNote: Note): Promise<Note | null> {
  // Validate inputs
  if (!API_BASE || !API_KEY) {
    console.log("[API] Cannot check conflict: Missing API configuration");
    return null;
  }

  try {
    const url = `${API_BASE}/rest/v1/notes?id=eq.${
      localNote.id
    }&user_id=eq.${encodeURIComponent(localNote.user_id)}`;

    const response = await fetch(url, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.log(`[API] Note ${localNote.id} not found on server`);
        return null;
      }
      return null;
    }

    const data = await response.json();
    const serverNote = Array.isArray(data) ? data[0] : data;

    if (!serverNote) {
      console.log(`[API] No server version found for note ${localNote.id}`);
      return null;
    }

    // Check if server version is newer than local version
    const serverTime = new Date(serverNote.modified_at).getTime();
    const localTime = new Date(localNote.modified_at).getTime();

    if (serverTime > localTime) {
      console.log(
        `[API] ⚠ Conflict detected for note ${localNote.id} (server is newer)`
      );
      return serverNote;
    }

    return null;
  } catch (error) {
    console.error("[API] Error checking conflict:", error);
    return null;
  }
}

// Test API connection
export async function testApiConnection(): Promise<{
  success: boolean;
  message: string;
}> {
  if (!API_BASE || !API_KEY) {
    return {
      success: false,
      message: "Missing environment variables. Check .env.local file.",
    };
  }

  try {
    const response = await fetch(`${API_BASE}/rest/v1/notes?limit=1`, {
      method: "GET",
      headers,
    });

    if (response.ok) {
      return {
        success: true,
        message: "API connection successful",
      };
    } else {
      return {
        success: false,
        message: `API returned ${response.status}: ${response.statusText}`,
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Connection failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    };
  }
}

// import type { Note } from "@/types/note";

// const API_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
// const API_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// const headers = {
//   "Content-Type": "application/json",
//   apikey: API_KEY,
//   Authorization: `Bearer ${API_KEY}`,
// };

// const headersWithPrefer = {
//   ...headers,
//   Prefer: "return=representation",
// };

// export async function fetchNotes(userId: string): Promise<Note[]> {
//   try {
//     const response = await fetch(
//       `${API_BASE}/rest/v1/notes?user_id=eq.${userId}&order=created_at.desc`,
//       {
//         method: "GET",
//         headers,
//       }
//     );

//     if (!response.ok) {
//       throw new Error(`Failed to fetch notes: ${response.statusText}`);
//     }

//     return await response.json();
//   } catch (error) {
//     console.error("Error fetching notes from Supabase:", error);
//     throw error;
//   }
// }

// export async function createNoteOnServer(note: Note): Promise<Note> {
//   try {
//     const response = await fetch(`${API_BASE}/rest/v1/notes`, {
//       method: "POST",
//       headers: headersWithPrefer,
//       body: JSON.stringify(note),
//     });

//     if (!response.ok) {
//       throw new Error(`Failed to create note: ${response.statusText}`);
//     }

//     const data = await response.json();
//     return Array.isArray(data) ? data[0] : data;
//   } catch (error) {
//     console.error("Error creating note on server:", error);
//     throw error;
//   }
// }

// export async function updateNoteOnServer(note: Note): Promise<Note> {
//   try {
//     const response = await fetch(`${API_BASE}/rest/v1/notes?id=eq.${note.id}`, {
//       method: "PATCH",
//       headers: headersWithPrefer,
//       body: JSON.stringify({
//         title: note.title,
//         content: note.content,
//         modified_at: note.modified_at,
//         synced: true,
//       }),
//     });

//     if (!response.ok) {
//       throw new Error(`Failed to update note: ${response.statusText}`);
//     }

//     const data = await response.json();
//     return Array.isArray(data) ? data[0] : note;
//   } catch (error) {
//     console.error("Error updating note on server:", error);
//     throw error;
//   }
// }

// export async function deleteNoteOnServer(id: string): Promise<void> {
//   try {
//     const response = await fetch(`${API_BASE}/rest/v1/notes?id=eq.${id}`, {
//       method: "DELETE",
//       headers,
//     });

//     if (!response.ok) {
//       throw new Error(`Failed to delete note: ${response.statusText}`);
//     }
//   } catch (error) {
//     console.error("Error deleting note on server:", error);
//     throw error;
//   }
// }

// export async function checkConflict(localNote: Note): Promise<Note | null> {
//   try {
//     const response = await fetch(
//       `${API_BASE}/rest/v1/notes?id=eq.${localNote.id}`,
//       {
//         method: "GET",
//         headers,
//       }
//     );

//     if (!response.ok) {
//       return null;
//     }

//     const data = await response.json();
//     const serverNote = Array.isArray(data) ? data[0] : data;

//     if (!serverNote) return null;

//     // Check if server version is newer than local version
//     const serverTime = new Date(serverNote.modified_at).getTime();
//     const localTime = new Date(localNote.modified_at).getTime();

//     return serverTime > localTime ? serverNote : null;
//   } catch (error) {
//     console.error(" Error checking conflict:", error);
//     return null;
//   }
// }
