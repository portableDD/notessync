import type { Note } from "@/types/note";

export interface SearchOptions {
  query: string;
  filters?: {
    synced?: boolean;
    dateFrom?: Date;
    dateTo?: Date;
  };
}

/**
 * Full-text search across notes
 * Searches in both title and content
 */
export function searchNotes(notes: Note[], options: SearchOptions): Note[] {
  const { query, filters = {} } = options;
  const lowerQuery = query.toLowerCase();

  return notes.filter((note) => {
    // Text search
    const matchesQuery =
      note.title.toLowerCase().includes(lowerQuery) ||
      note.content.toLowerCase().includes(lowerQuery);

    if (!matchesQuery) return false;

    // Filter by sync status
    if (filters.synced !== undefined) {
      if (note.synced !== filters.synced) return false;
    }

    // Filter by date range
    const noteDate = new Date(note.modified_at);
    if (filters.dateFrom && noteDate < filters.dateFrom) return false;
    if (filters.dateTo && noteDate > filters.dateTo) return false;

    return true;
  });
}

/**
 * Get search suggestions based on note titles
 */
export function getSearchSuggestions(notes: Note[], query: string): string[] {
  if (!query) return [];

  const lowerQuery = query.toLowerCase();
  const suggestions = new Set<string>();

  notes.forEach((note) => {
    if (note.title.toLowerCase().includes(lowerQuery)) {
      suggestions.add(note.title);
    }
  });

  return Array.from(suggestions).slice(0, 5);
}

/**
 * Highlight search query in text
 */
export function highlightText(
  text: string,
  query: string
): { highlighted: boolean; parts: string[] } {
  if (!query) return { highlighted: false, parts: [text] };

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const parts: string[] = [];
  let lastIndex = 0;

  const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    parts.push(`<mark>${text.substring(match.index, regex.lastIndex)}</mark>`);
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return {
    highlighted: parts.some((p) => p.includes("<mark>")),
    parts,
  };
}

/**
 * Calculate note statistics
 */
export function getNoteStatistics(notes: Note[]) {
  const stats = {
    total: notes.length,
    synced: 0,
    pending: 0,
    totalWords: 0,
    totalCharacters: 0,
    oldestNote: null as Date | null,
    newestNote: null as Date | null,
  };

  notes.forEach((note) => {
    if (note.synced) stats.synced++;
    else stats.pending++;

    stats.totalWords += note.content.split(/\s+/).filter((w) => w).length;
    stats.totalCharacters += note.content.length;

    const noteDate = new Date(note.modified_at);
    if (!stats.oldestNote || noteDate < stats.oldestNote)
      stats.oldestNote = noteDate;
    if (!stats.newestNote || noteDate > stats.newestNote)
      stats.newestNote = noteDate;
  });

  return stats;
}
