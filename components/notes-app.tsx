"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NoteEditor } from "./note-editor";
import type { Note } from "@/types/note";
import { Plus, Menu, X } from "lucide-react";
import { NotesGrid } from "./notes-grid";

export function NotesApp() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
        className={`fixed md:relative w-64 h-screen bg-sidebar border-r border-sidebar-border flex flex-col transition-transform duration-300 z-30 md:z-auto ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="p-6 border-b border-sidebar-border flex items-center justify-between">
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
              {notes
                .slice()
                .reverse()
                .slice(0, 5)
                .map((note) => (
                  <button
                    key={note.id}
                    onClick={() => {
                      setSelectedNote(note);
                      setSidebarOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      selectedNote?.id === note.id
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
                  </button>
                ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-sidebar-border">
          <Button
            onClick={() => {
              const newNote: Note = {
                id: crypto.randomUUID(),
                user_id: "emmanueltemitopedorcas20@gmail.com",
                title: "",
                content: "",
                created_at: new Date().toISOString(),
                modified_at: new Date().toISOString(),
                synced: false,
              };
              setNotes([...notes, newNote]);
              setSelectedNote(newNote);
              setSidebarOpen(false);
            }}
            className="w-full gap-2"
          >
            <Plus className="w-4 h-4" />
            New Note
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="border-b border-border bg-card p-4 md:p-6">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden">
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex-1">
              <Input
                placeholder="Search notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-md"
              />
            </div>
            <span className="text-sm text-muted-foreground">
              {notes.length} notes
            </span>
          </div>
        </header>

        {/* Content area */}
        {selectedNote ? (
          <NoteEditor
            note={selectedNote}
            onUpdate={(updated) => {
              setNotes(notes.map((n) => (n.id === updated.id ? updated : n)));
              setSelectedNote(updated);
            }}
            onDelete={(id) => {
              setNotes(notes.filter((n) => n.id !== id));
              setSelectedNote(null);
            }}
          />
        ) : (
          <NotesGrid
            notes={notes}
            onSelectNote={setSelectedNote}
            searchQuery={searchQuery}
          />
        )}
      </div>
    </div>
  );
}
