"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Note } from "@/types/note";
import { Trash2, Check, ArrowLeft, Clock } from "lucide-react";
import { useState, useEffect, useRef } from "react";

interface NoteEditorProps {
  note: Note;
  onUpdate: (note: Note) => void;
  onDelete: (id: string) => void;
  onClose?: () => void; // New prop for closing editor
}

export function NoteEditor({
  note,
  onUpdate,
  onDelete,
  onClose,
}: NoteEditorProps) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Update local state when note prop changes
  useEffect(() => {
    setTitle(note.title);
    setContent(note.content);
  }, [note.id]);

  // Auto-save after 1.5 seconds of inactivity
  useEffect(() => {
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Check if content has changed
    const hasChanges = title !== note.title || content !== note.content;

    if (hasChanges) {
      saveTimeoutRef.current = setTimeout(() => {
        handleAutoSave();
      }, 1500); // Auto-save after 1.5s of inactivity
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [title, content, note.title, note.content]);

  const handleAutoSave = async () => {
    // Don't save if nothing changed
    if (title === note.title && content === note.content) {
      return;
    }

    setIsSaving(true);

    const updated: Note = {
      ...note,
      title: title.trim() || "Untitled",
      content: content.trim() || " ",
      modified_at: new Date().toISOString(),
      synced: false,
    };

    try {
      await onUpdate(updated);
      setLastSaved(new Date());
    } catch (error) {
      console.error("Failed to save:", error);
    } finally {
      setTimeout(() => setIsSaving(false), 300); // Show saving state briefly
    }
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this note?")) {
      onDelete(note.id);
    }
  };

  const handleDone = async () => {
    // Save any pending changes before closing
    await handleAutoSave();

    // Close the editor
    if (onClose) {
      onClose();
    }
  };

  // Format last saved time
  const getLastSavedText = () => {
    if (isSaving) return "Saving...";
    if (!lastSaved) {
      // Check if note is synced
      if (note.synced) return "All changes saved";
      return "Not saved yet";
    }

    const seconds = Math.floor((Date.now() - lastSaved.getTime()) / 1000);
    if (seconds < 5) return "Saved just now";
    if (seconds < 60) return `Saved ${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `Saved ${minutes}m ago`;
    return "Saved";
  };

  return (
    <div className="flex-1 flex flex-col max-w-5xl mx-auto w-full h-full mt-10">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b border-border rounded-t-2xl">
        <div className="p-3 md:p-4">
          {/* Top bar with back and actions */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <Button
              onClick={handleDone}
              variant="ghost"
              size="sm"
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back to notes</span>
            </Button>

            <div className="flex items-center gap-2">
              {/* Save status */}
              <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
                {isSaving ? (
                  <>
                    <div className="w-3 h-3 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : note.synced ? (
                  <>
                    <Check className="w-3 h-3 text-green-600 dark:text-green-400" />
                    <span className="text-green-600 dark:text-green-400">
                      Synced
                    </span>
                  </>
                ) : (
                  <>
                    <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                    <span className="text-amber-600 dark:text-amber-400">
                      Pending sync
                    </span>
                  </>
                )}
              </div>

              {/* Done button */}
              <Button
                onClick={handleDone}
                variant="default"
                size="sm"
                className="gap-2"
              >
                <Check className="w-4 h-4" />
                <span className="hidden sm:inline">Done</span>
              </Button>

              {/* Delete button */}
              <Button
                onClick={handleDelete}
                variant="ghost"
                size="sm"
                className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Delete</span>
              </Button>
            </div>
          </div>

          {/* Title input */}
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Note title"
            className="text-2xl md:text-3xl font-bold bg-transparent border-none px-0 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/50"
            maxLength={100}
          />

          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(note.modified_at).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            <span>•</span>
            <span>
              {content.trim().split(/\s+/).filter(Boolean).length} words
            </span>
            <span>•</span>
            <span>{content.length} / 5000 characters</span>
            <span>•</span>
            <span className="md:hidden">
              {isSaving ? (
                <span className="text-primary">Saving...</span>
              ) : note.synced ? (
                <span className="text-green-600 dark:text-green-400">
                  Synced
                </span>
              ) : (
                <span className="text-amber-600 dark:text-amber-400">
                  Pending
                </span>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto ">
        <div className="p-4 md:p-8 bg-card/95 rounded-b-2xl mx-auto">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Start writing your note..."
            className="w-full h-full min-h-[calc(100vh-300px)] resize-none bg-transparent text-foreground placeholder-muted-foreground/50 focus:outline-none text-base md:text-lg leading-relaxed"
            maxLength={5000}
            autoFocus
          />
        </div>
      </div>

      {/* Bottom save indicator (mobile) */}
      <div className="md:hidden sticky bottom-0 bg-card/95 backdrop-blur-sm border-t border-border p-2 text-center">
        <p className="text-xs text-muted-foreground">{getLastSavedText()}</p>
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
