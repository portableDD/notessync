"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Note } from "@/types/note";
import { Trash2, Save, Check } from "lucide-react";
import { useState, useEffect } from "react";

interface NoteEditorProps {
  note: Note;
  onUpdate: (note: Note) => void;
  onDelete: (id: string) => void;
  onClose?: () => void;
}

export function NoteEditor({ note, onUpdate, onDelete }: NoteEditorProps) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Update local state when note prop changes
  useEffect(() => {
    setTitle(note.title);
    setContent(note.content);
    setHasChanges(false);
  }, [note.id]); // Only reset when note ID changes

  const handleSave = async () => {
    setIsSaving(true);

    // Ensure we have valid data
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();

    const updated: Note = {
      ...note,
      title: trimmedTitle || "Untitled",
      content: trimmedContent || " ",
      modified_at: new Date().toISOString(),
      synced: false,
    };

    try {
      await onUpdate(updated);
      setHasChanges(false);
    } catch (error) {
      console.error("Failed to save:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this note?")) {
      onDelete(note.id);
    }
  };

  // Auto-save after 2 seconds of inactivity
  useEffect(() => {
    if (!hasChanges) return;

    const timer = setTimeout(() => {
      handleSave();
    }, 2000);

    return () => clearTimeout(timer);
  }, [title, content, hasChanges]);

  return (
    <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full rounded-2xl border border-border bg-card shadow-lg my-4 md:my-10">
      {/* Editor header */}
      <div className="border-b border-border p-3 md:p-6">
        <div className="flex flex-col md:flex-row gap-2 md:items-center md:gap-8">
          <div className="flex-1">
            <Input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setHasChanges(true);
              }}
              placeholder="Note title"
              className="w-full md:text-xl font-semibold bg-transparent px-3 py-5"
              maxLength={100}
            />
          </div>
          <div className="flex gap-2 justify-end items-center">
            {/* Sync status indicator */}
            {note.synced ? (
              <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                <Check className="w-3 h-3" />
                Synced
              </span>
            ) : (
              <span className="text-xs text-amber-600 dark:text-amber-400">
                Not synced
              </span>
            )}

            {hasChanges && !isSaving && (
              <Button
                onClick={handleSave}
                variant="default"
                size="sm"
                className="gap-2"
              >
                <Save className="w-4 h-4" />
                Save
              </Button>
            )}

            {isSaving && (
              <Button variant="default" size="sm" disabled className="gap-2">
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                Saving...
              </Button>
            )}

            <Button
              onClick={handleDelete}
              variant="destructive"
              size="sm"
              className="gap-2"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden md:inline">Delete</span>
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
          <span>Created {new Date(note.created_at).toLocaleDateString()}</span>
          <span>•</span>
          <span>
            Modified {new Date(note.modified_at).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Editor content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <textarea
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            setHasChanges(true);
          }}
          placeholder="Start typing your note..."
          className="w-full h-full min-h-[400px] resize-none bg-transparent text-foreground placeholder-muted-foreground focus:outline-none text-base leading-relaxed"
          maxLength={5000}
        />
        <div className="text-xs text-muted-foreground text-right mt-2">
          {content.length} / 5000 characters
        </div>
      </div>
    </div>
  );
}

// "use client";

// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import type { Note } from "@/types/note";
// import { Trash2, Save } from "lucide-react";
// import { useState } from "react";

// interface NoteEditorProps {
//   note: Note;
//   onUpdate: (note: Note) => void;
//   onDelete: (id: string) => void;
// }

// export function NoteEditor({ note, onUpdate, onDelete }: NoteEditorProps) {
//   const [title, setTitle] = useState(note.title);
//   const [content, setContent] = useState(note.content);
//   const [hasChanges, setHasChanges] = useState(false);

// //   useEffect(() => {
// //     setTitle(note.title);
// //     setContent(note.content);
// //     setHasChanges(false);
// //   }, [note.id]);

//   const handleSave = () => {
//     const updated: Note = {
//       ...note,
//       title,
//       content,
//       modified_at: new Date().toISOString(),
//       synced: false,
//     };
//     onUpdate(updated);
//     setHasChanges(false);
//   };

//   return (
//     <div className="flex-1 flex flex-col">
//       {/* Editor header */}
//       <div className="border-b border-border bg-card p-4 md:p-6 flex items-center justify-between">
//         <div className="flex-1">
//           <Input
//             value={title}
//             onChange={(e) => {
//               setTitle(e.target.value);
//               setHasChanges(true);
//             }}
//             placeholder="Note title"
//             className="text-xl font-semibold border-0 bg-transparent px-0 mb-2"
//           />
//           <p className="text-sm text-muted-foreground">
//             Modified {new Date(note.modified_at).toLocaleDateString()}
//           </p>
//         </div>
//         <div className="flex gap-2">
//           {hasChanges && (
//             <Button
//               onClick={handleSave}
//               variant="default"
//               size="sm"
//               className="gap-2"
//             >
//               <Save className="w-4 h-4" />
//               Save
//             </Button>
//           )}
//           <Button
//             onClick={() => onDelete(note.id)}
//             variant="destructive"
//             size="sm"
//             className="gap-2"
//           >
//             <Trash2 className="w-4 h-4" />
//             Delete
//           </Button>
//         </div>
//       </div>

//       {/* Editor content */}
//       <div className="flex-1 overflow-y-auto p-4 md:p-8">
//         <textarea
//           value={content}
//           onChange={(e) => {
//             setContent(e.target.value);
//             setHasChanges(true);
//           }}
//           placeholder="Start typing..."
//           className="w-full h-full resize-none bg-transparent text-foreground placeholder-muted-foreground focus:outline-none text-base leading-relaxed"
//         />
//       </div>
//     </div>
//   );
// }
