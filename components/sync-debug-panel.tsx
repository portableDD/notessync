"use client";

import { useState, useEffect, useCallback } from "react";
import { getUnsyncedNotesCount, getAllNotes } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";

const USER_ID = "emmanueltemitopedorcas20@gmail.com";

export function SyncDebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [debugInfo, setDebugInfo] = useState({
    totalNotes: 0,
    unsyncedCount: 0,
    isOnline: true,
    lastCheck: new Date().toISOString(),
    notes: [] as Array<{ id: string; title: string; synced: boolean }>,
  });

  // Use useCallback to memoize the function
  const refreshDebugInfo = useCallback(async () => {
    try {
      const notes = await getAllNotes(USER_ID);
      const unsyncedCount = await getUnsyncedNotesCount();

      setDebugInfo({
        totalNotes: notes.length,
        unsyncedCount,
        isOnline: navigator.onLine,
        lastCheck: new Date().toISOString(),
        notes: notes.map((n) => ({
          id: n.id.slice(0, 8),
          title: n.title || "Untitled",
          synced: n.synced,
        })),
      });
    } catch (error) {
      console.error("Failed to refresh debug info:", error);
    }
  }, []);

  // Separate effect with proper async handling
  useEffect(() => {
    if (!isOpen) return;

    // Initial load - use a flag to avoid calling setState during render
    let isMounted = true;

    const loadInitialData = async () => {
      if (isMounted) {
        await refreshDebugInfo();
      }
    };

    loadInitialData();

    // Set up interval
    const interval = setInterval(refreshDebugInfo, 2000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isOpen, refreshDebugInfo]);

  // Only show in development or if URL has ?debug=true
  const shouldShow =
    process.env.NODE_ENV === "development" ||
    (typeof window !== "undefined" &&
      window.location.search.includes("debug=true"));

  if (!shouldShow) return null;

  return (
    <div className="fixed bottom-20 right-4 z-50">
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variant="outline"
        size="sm"
        className="mb-2 shadow-lg"
      >
        {isOpen ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronUp className="w-4 h-4" />
        )}
        Debug
      </Button>

      {isOpen && (
        <div className="bg-card border border-border rounded-lg shadow-xl p-4 w-80 max-h-96 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">Sync Debug Info</h3>
            <Button onClick={refreshDebugInfo} variant="ghost" size="sm">
              Refresh
            </Button>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Notes:</span>
              <span className="font-mono">{debugInfo.totalNotes}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-muted-foreground">Unsynced:</span>
              <span
                className={`font-mono ${
                  debugInfo.unsyncedCount > 0
                    ? "text-amber-600"
                    : "text-green-600"
                }`}
              >
                {debugInfo.unsyncedCount}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-muted-foreground">Online Status:</span>
              <span
                className={`font-mono ${
                  debugInfo.isOnline ? "text-green-600" : "text-red-600"
                }`}
              >
                {debugInfo.isOnline ? "Online" : "Offline"}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-muted-foreground">Last Check:</span>
              <span className="font-mono text-xs">
                {new Date(debugInfo.lastCheck).toLocaleTimeString()}
              </span>
            </div>

            <div className="mt-4 pt-3 border-t border-border">
              <div className="font-semibold mb-2">Notes Status:</div>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {debugInfo.notes.map((note, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-xs p-1 bg-muted/30 rounded"
                  >
                    <span className="truncate flex-1" title={note.title}>
                      {note.title}
                    </span>
                    <span
                      className={`ml-2 px-2 py-0.5 rounded text-xs font-mono ${
                        note.synced
                          ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
                      }`}
                    >
                      {note.synced ? "✓" : "⋯"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
