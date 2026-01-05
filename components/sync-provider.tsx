"use client";

import { useSync } from "@/hook/use-sync";
import { createContext, useContext, type ReactNode } from "react";

type SyncStatus = "synced" | "syncing" | "pending" | "error";

interface SyncContextType {
  syncStatus: SyncStatus;
  lastSyncTime: Date | null;
  syncError: string | null;
  performSync: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export function SyncProvider({ children }: { children: ReactNode }) {
  const syncValue = useSync();

  return (
    <SyncContext.Provider value={syncValue}>{children}</SyncContext.Provider>
  );
}

export function useSyncContext() {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error("useSyncContext must be used within SyncProvider");
  }
  return context;
}
