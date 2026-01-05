"use client";

import { useState, useCallback, useMemo } from "react";
import type { Note } from "@/types/note";
import { searchNotes } from "@/lib/search";

export function useSearch(notes: Note[]) {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<{
    synced?: boolean;
    dateFrom?: Date;
    dateTo?: Date;
  }>({});

  const results = useMemo(() => {
    return searchNotes(notes, {
      query,
      filters,
    });
  }, [notes, query, filters]);

  const handleSearch = useCallback((newQuery: string) => {
    setQuery(newQuery);
  }, []);

  const handleFilterChange = useCallback(
    (newFilters: { synced?: boolean; dateFrom?: Date; dateTo?: Date }) => {
      setFilters(newFilters);
    },
    []
  );

  return {
    query,
    filters,
    results,
    handleSearch,
    handleFilterChange,
  };
}
