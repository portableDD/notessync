"use client";

import { useState, useMemo } from "react";
import { useNotes } from "@/lib/storage-hook";
import { Button } from "@/components/ui/button";
import { NoteEditor } from "./note-editor";
import { NoteStatistics } from "./note-statistics";
import { SyncStatusModal } from "./sync-status-modal";
import { SyncProvider } from "./sync-provider";
import type { Note } from "@/types/note";
import { Plus, Menu, X } from "lucide-react";
import { useSearch } from "@/hook/use-search";
import { NotesGrid } from "./notes-grid";
import { SearchFilters } from "./search-filter";
import { SyncDebugPanel } from "./sync-debug-panel";

const USER_ID = "emmanueltemitopedorcas20@gmail.com";

function NotesAppContent() {
  const { notes, createNote, modifyNote, removeNote, loading } = useNotes();
  const {
    results: filteredNotes,
    handleSearch,
    handleFilterChange,
  } = useSearch(notes);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Derive the selected note from notes array instead of storing it separately
  // This ensures it's always up-to-date without causing cascading renders
  const selectedNote = useMemo(() => {
    if (!selectedNoteId) return null;
    return notes.find((n) => n.id === selectedNoteId) || null;
  }, [notes, selectedNoteId]);

  const handleCreateNote = async () => {
    const newNote: Note = {
      id: crypto.randomUUID(),
      user_id: USER_ID,
      title: "Untitled",
      content: " ",
      created_at: new Date().toISOString(),
      modified_at: new Date().toISOString(),
      synced: false,
    };

    try {
      await createNote(newNote);
      // Open the editor with the new note immediately
      setSelectedNoteId(newNote.id);
      setSidebarOpen(false);
    } catch (error) {
      console.error("Failed to create note:", error);
    }
  };

  const handleUpdateNote = async (updated: Note) => {
    try {
      await modifyNote(updated);
      // No need to update selectedNote - it will be derived from notes array
    } catch (error) {
      console.error("Failed to update note:", error);
    }
  };

  const handleDeleteNote = async (id: string) => {
    try {
      await removeNote(id);
      setSelectedNoteId(null);
      // After deletion, show the grid
    } catch (error) {
      console.error("Failed to delete note:", error);
    }
  };

  const handleSelectNote = (note: Note) => {
    setSelectedNoteId(note.id);
  };

  const handleBackToGrid = () => {
    setSelectedNoteId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-foreground">Loading your notes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      {/* Mobile menu overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 md:hidden z-20"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:relative w-64 h-screen bg-sidebar border-r border-sidebar-border flex flex-col transition-transform duration-300 z-30 md:z-auto overflow-y-auto ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="p-6 border-b border-sidebar-border flex items-center justify-between shrink-0">
          <h1 className="text-2xl font-bold text-sidebar-foreground">
            NotesSync
          </h1>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-2">
            <h2 className="text-sm font-semibold text-sidebar-foreground/70 px-2 mb-4">
              Recently Updated
            </h2>
            <div className="space-y-2">
              {notes.length === 0 ? (
                <p className="text-xs text-sidebar-foreground/50 px-2">
                  No notes yet
                </p>
              ) : (
                notes
                  .slice()
                  .sort(
                    (a, b) =>
                      new Date(b.modified_at).getTime() -
                      new Date(a.modified_at).getTime()
                  )
                  .slice(0, 5)
                  .map((note) => (
                    <button
                      key={note.id}
                      onClick={() => {
                        setSelectedNoteId(note.id);
                        setSidebarOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                        selectedNoteId === note.id
                          ? "bg-sidebar-primary text-sidebar-primary-foreground"
                          : "hover:bg-sidebar-accent/50 text-sidebar-foreground"
                      }`}
                    >
                      <div className="font-medium truncate text-sm">
                        {note.title || "Untitled"}
                      </div>
                      <div className="text-xs opacity-70 truncate">
                        {new Date(note.modified_at).toLocaleDateString()}
                      </div>
                      {!note.synced && (
                        <div className="text-xs text-accent mt-1">
                          • Not synced
                        </div>
                      )}
                    </button>
                  ))
              )}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-sidebar-border shrink-0">
          <Button onClick={handleCreateNote} className="w-full gap-2">
            <Plus className="w-4 h-4" />
            New Note
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Header with search - only show when not editing */}
        {!selectedNote && (
          <header className="border-b border-border bg-card p-4 md:p-6 shrink-0">
            <div className="flex items-center gap-4 mb-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="md:hidden"
              >
                <Menu className="w-6 h-6" />
              </button>
              <h2 className="text-lg font-semibold">All Notes</h2>
              <span className="text-sm text-muted-foreground ml-auto">
                {notes.length} {notes.length === 1 ? "note" : "notes"}
              </span>
            </div>
            <SearchFilters
              onSearch={handleSearch}
              onFilterChange={handleFilterChange}
            />
          </header>
        )}

        {/* Statistics - only show when not editing */}
        {!selectedNote && notes.length > 0 && <NoteStatistics notes={notes} />}

        {/* Content area */}
        <div className="flex-1">
          {selectedNote ? (
            <NoteEditor
              key={selectedNote.id}
              note={selectedNote}
              onUpdate={handleUpdateNote}
              onDelete={handleDeleteNote}
              onClose={handleBackToGrid}
            />
          ) : (
            <NotesGrid
              notes={filteredNotes}
              onSelectNote={handleSelectNote}
              searchQuery=""
            />
          )}
        </div>
      </div>

      {/* Sync status indicator */}
      <SyncStatusModal />
      <SyncDebugPanel />
    </div>
  );
}

export function NotesApp() {
  return (
    <SyncProvider>
      <NotesAppContent />
    </SyncProvider>
  );
}

// "use client";

// import { useState } from "react";
// import { useNotes } from "@/lib/storage-hook";
// import { Button } from "@/components/ui/button";
// import { NoteEditor } from "./note-editor";
// import { NoteStatistics } from "./note-statistics";
// import { SyncStatusModal } from "./sync-status-modal";
// import { SyncProvider } from "./sync-provider";
// import type { Note } from "@/types/note";
// import { Plus, Menu, X } from "lucide-react";
// import { useSearch } from "@/hook/use-search";
// import { NotesGrid } from "./notes-grid";
// import { SearchFilters } from "./search-filter";

// const USER_ID = "emmanueltemitopedorcas20@gmail.com";

// function NotesAppContent() {
//   const { notes, createNote, modifyNote, removeNote, loading } = useNotes();
//   const {
//     results: filteredNotes,
//     handleSearch,
//     handleFilterChange,
//   } = useSearch(notes);
//   const [selectedNote, setSelectedNote] = useState<Note | null>(null);
//   const [sidebarOpen, setSidebarOpen] = useState(false);

//   const handleCreateNote = async () => {
//     const newNote: Note = {
//       id: crypto.randomUUID(),
//       user_id: USER_ID,
//       title: "",
//       content: "",
//       created_at: new Date().toISOString(),
//       modified_at: new Date().toISOString(),
//       synced: false,
//     };
//     try {
//       await createNote(newNote);
//       setSelectedNote(newNote);
//       setSidebarOpen(false);
//     } catch (error) {
//       console.error("Failed to create note:", error);
//     }
//   };

//   const handleUpdateNote = async (updated: Note) => {
//     try {
//       await modifyNote(updated);
//       setSelectedNote(updated);
//     } catch (error) {
//       console.error("Failed to update note:", error);
//     }
//   };

//   const handleDeleteNote = async (id: string) => {
//     try {
//       await removeNote(id);
//       setSelectedNote(null);
//     } catch (error) {
//       console.error("Failed to delete note:", error);
//     }
//   };

//   if (loading) {
//     return (
//       <div className="flex items-center justify-center h-screen bg-background">
//         <div className="text-center">
//           <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4" />
//           <p className="text-foreground">Loading your notes...</p>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="flex h-screen">
//       {/* Mobile menu overlay */}
//       {sidebarOpen && (
//         <div
//           className="fixed inset-0 bg-black/30 md:hidden z-20"
//           onClick={() => setSidebarOpen(false)}
//         />
//       )}

//       {/* Sidebar */}
//       <aside
//         className={`fixed md:relative w-64 h-screen bg-sidebar border-r border-sidebar-border flex flex-col transition-transform duration-300 z-30 md:z-auto overflow-y-auto ${
//           sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
//         }`}
//       >
//         <div className="p-6 border-b border-sidebar-border flex items-center justify-between shrink-0">
//           <h1 className="text-2xl font-bold text-sidebar-foreground">
//             NotesSync
//           </h1>
//           <button onClick={() => setSidebarOpen(false)} className="md:hidden">
//             <X className="w-5 h-5" />
//           </button>
//         </div>

//         <div className="flex-1 overflow-y-auto">
//           <div className="p-4 space-y-2">
//             <h2 className="text-sm font-semibold text-sidebar-foreground/70 px-2 mb-4">
//               Recently Updated
//             </h2>
//             <div className="space-y-2">
//               {notes
//                 .slice()
//                 .reverse()
//                 .slice(0, 5)
//                 .map((note) => (
//                   <button
//                     key={note.id}
//                     onClick={() => {
//                       setSelectedNote(note);
//                       setSidebarOpen(false);
//                     }}
//                     className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
//                       selectedNote?.id === note.id
//                         ? "bg-sidebar-primary text-sidebar-primary-foreground"
//                         : "hover:bg-sidebar-accent/50 text-sidebar-foreground"
//                     }`}
//                   >
//                     <div className="font-medium truncate text-sm">
//                       {note.title || "Untitled"}
//                     </div>
//                     <div className="text-xs opacity-70 truncate">
//                       {new Date(note.modified_at).toLocaleDateString()}
//                     </div>
//                   </button>
//                 ))}
//             </div>
//           </div>
//         </div>

//         <div className="p-4 border-t border-sidebar-border shrink-0">
//           <Button onClick={handleCreateNote} className="w-full gap-2">
//             <Plus className="w-4 h-4" />
//             New Note
//           </Button>
//         </div>
//       </aside>

//       {/* Main content */}
//       <div className="flex-1 flex flex-col overflow-hidden">
//         {/* Header with search */}
//         <header className="border-b border-border bg-card p-4 md:p-6 shrink-0">
//           <div className="flex items-center gap-4 mb-4">
//             <button onClick={() => setSidebarOpen(true)} className="md:hidden">
//               <Menu className="w-6 h-6" />
//             </button>
//             <span className="text-sm text-muted-foreground">
//               {notes.length} notes
//             </span>
//           </div>
//           <SearchFilters
//             onSearch={handleSearch}
//             onFilterChange={handleFilterChange}
//           />
//         </header>

//         {/* Statistics */}
//         {notes.length > 0 && <NoteStatistics notes={notes} />}

//         {/* Content area */}
//         <div className="flex-1 overflow-hidden">
//           {selectedNote ? (
//             <NoteEditor
//               note={selectedNote}
//               onUpdate={handleUpdateNote}
//               onDelete={handleDeleteNote}
//             />
//           ) : (
//             <NotesGrid
//               notes={filteredNotes}
//               onSelectNote={setSelectedNote}
//               searchQuery=""
//             />
//           )}
//         </div>
//       </div>

//       {/* Sync status indicator */}
//       <SyncStatusModal />
//     </div>
//   );
// }

// export function NotesApp() {
//   return (
//     <SyncProvider>
//       <NotesAppContent />
//     </SyncProvider>
//   );
// }
