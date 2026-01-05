"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ChevronDown, X } from "lucide-react";

interface SearchFiltersProps {
  onSearch: (query: string) => void;
  onFilterChange?: (filters: {
    synced?: boolean;
    dateFrom?: Date;
    dateTo?: Date;
  }) => void;
}

export function SearchFilters({
  onSearch,
  onFilterChange,
}: SearchFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [syncFilter, setSyncFilter] = useState<"all" | "synced" | "pending">(
    "all"
  );
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const handleFilterApply = () => {
    const filters: { synced?: boolean; dateFrom?: Date; dateTo?: Date } = {};

    if (syncFilter === "synced") filters.synced = true;
    if (syncFilter === "pending") filters.synced = false;
    if (dateFrom) filters.dateFrom = new Date(dateFrom);
    if (dateTo) filters.dateTo = new Date(dateTo);

    onFilterChange?.(filters);
  };

  const handleReset = () => {
    setSyncFilter("all");
    setDateFrom("");
    setDateTo("");
    onFilterChange?.({});
  };

  const hasActiveFilters = syncFilter !== "all" || dateFrom || dateTo;

  return (
    <div className="space-y-4">
      {/* Main search input */}
      <div className="relative">
        <Input
          placeholder="Search notes by title or content..."
          onChange={(e) => onSearch(e.target.value)}
          className="pr-10"
        />
      </div>

      {/* Advanced filters toggle */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
      >
        <ChevronDown
          className={`w-4 h-4 transition-transform ${
            showAdvanced ? "rotate-180" : ""
          }`}
        />
        Advanced Filters
        {hasActiveFilters && (
          <span className="bg-accent text-accent-foreground rounded-full px-2 py-0.5 text-xs">
            Active
          </span>
        )}
      </button>

      {/* Advanced filters panel */}
      {showAdvanced && (
        <Card className="p-4 space-y-4">
          {/* Sync status filter */}
          <div>
            <label className="text-sm font-medium text-foreground">
              Sync Status
            </label>
            <div className="flex gap-2 mt-2">
              {(["all", "synced", "pending"] as const).map((status) => (
                <Button
                  key={status}
                  variant={syncFilter === status ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSyncFilter(status)}
                  className="capitalize"
                >
                  {status === "all" ? "All" : status}
                </Button>
              ))}
            </div>
          </div>

          {/* Date range filter */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground">
                From Date
              </label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="mt-2"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">
                To Date
              </label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="mt-2"
              />
            </div>
          </div>

          {/* Filter actions */}
          <div className="flex gap-2 pt-2 border-t border-border">
            <Button
              onClick={handleFilterApply}
              variant="default"
              size="sm"
              className="flex-1"
            >
              Apply Filters
            </Button>
            {hasActiveFilters && (
              <Button onClick={handleReset} variant="outline" size="sm">
                <X className="w-4 h-4" />
                Reset
              </Button>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
