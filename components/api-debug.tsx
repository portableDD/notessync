// components/api-debug.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { testApiConnection } from "@/lib/api";

export function ApiDebug() {
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [testing, setTesting] = useState(false);

  const handleTest = async () => {
    setTesting(true);
    try {
      const res = await testApiConnection();
      setResult(res);
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setTesting(false);
    }
  };

  const envVars = {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || "❌ Not set",
    key: process.env.SUPABASE_ANON_KEY
      ? `✓ Set (${process.env.SUPABASE_ANON_KEY.slice(0, 20)}...)`
      : "❌ Not set",
  };

  return (
    <div className="fixed bottom-4 right-4 bg-card border border-border rounded-lg p-4 shadow-lg max-w-md z-50">
      <h3 className="font-bold text-sm mb-2">🔧 API Debug</h3>

      <div className="text-xs space-y-2 mb-3">
        <div>
          <strong>Supabase URL:</strong>
          <div className="font-mono text-xs break-all">{envVars.url}</div>
        </div>
        <div>
          <strong>Anon Key:</strong>
          <div className="font-mono text-xs">{envVars.key}</div>
        </div>
        <div>
          <strong>Online:</strong> {navigator.onLine ? "✓ Yes" : "❌ No"}
        </div>
      </div>

      <Button
        onClick={handleTest}
        disabled={testing}
        size="sm"
        className="w-full mb-2"
      >
        {testing ? "Testing..." : "Test API Connection"}
      </Button>

      {result && (
        <div
          className={`text-xs p-2 rounded ${
            result.success
              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
              : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
          }`}
        >
          {result.success ? "✓" : "✗"} {result.message}
        </div>
      )}

      <div className="text-xs text-muted-foreground mt-2">
        Open browser console for detailed logs
      </div>
    </div>
  );
}
