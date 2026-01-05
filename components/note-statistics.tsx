"use client";

import type { Note } from "@/types/note";
import { getNoteStatistics } from "@/lib/search";
import { Card } from "@/components/ui/card";
import { FileText, CheckCircle2, Cloud } from "lucide-react";

interface NoteStatisticsProps {
  notes: Note[];
}

export function NoteStatistics({ notes }: NoteStatisticsProps) {
  const stats = getNoteStatistics(notes);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4">
      <Card className="p-3 flex items-center gap-3 bg-card">
        <FileText className="w-5 h-5 text-primary" />
        <div>
          <div className="text-xs text-muted-foreground">Total Notes</div>
          <div className="text-lg font-semibold text-foreground">
            {stats.total}
          </div>
        </div>
      </Card>

      <Card className="p-3 flex items-center gap-3 bg-card">
        <Cloud className="w-5 h-5 text-accent" />
        <div>
          <div className="text-xs text-muted-foreground">Synced</div>
          <div className="text-lg font-semibold text-foreground">
            {stats.synced}
          </div>
        </div>
      </Card>

      <Card className="p-3 flex items-center gap-3 bg-card">
        <CheckCircle2 className="w-5 h-5 text-secondary" />
        <div>
          <div className="text-xs text-muted-foreground">Pending</div>
          <div className="text-lg font-semibold text-foreground">
            {stats.pending}
          </div>
        </div>
      </Card>

      {/* <Card className="p-3 flex items-center gap-3 bg-card">
        <div className="w-5 h-5 text-primary" />
        <div>
          <div className="text-xs text-muted-foreground">Total Words</div>
          <div className="text-lg font-semibold text-foreground">
            {stats.totalWords}
          </div>
        </div>
      </Card> */}
    </div>
  );
}
