"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Note } from "@/types/note";
import { Plus, FileText } from "lucide-react";

interface NotesGridProps {
  notes: Note[];
  onSelectNote: (note: Note) => void;
  searchQuery: string;
}

export function NotesGrid({
  notes,
  onSelectNote,
  searchQuery,
}: NotesGridProps) {
  const filteredNotes = notes.filter(
    (note) =>
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8">
      {filteredNotes.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center">
          <FileText className="w-16 h-16 text-muted-foreground mb-4 opacity-30" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            No notes yet
          </h3>
          <p className="text-muted-foreground mb-6">
            Create your first note to get started
          </p>
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
              onSelectNote(newNote);
            }}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Note
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-max">
          {filteredNotes
            .slice()
            .reverse()
            .map((note) => (
              <Card
                key={note.id}
                onClick={() => onSelectNote(note)}
                className="gap-3 md:gap-6 p-3 md:p-4 cursor-pointer hover:shadow-lg transition-shadow bg-card"
              >
                <h3 className="font-semibold text-foreground truncate md:mb-2">
                  {note.title || "Untitled"}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-3 md:mb-4">
                  {note.content}
                </p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{new Date(note.modified_at).toLocaleDateString()}</span>
                  {!note.synced && (
                    <span className="text-accent font-medium">Pending</span>
                  )}
                </div>
              </Card>
            ))}
        </div>
      )}
    </div>
  );
}
