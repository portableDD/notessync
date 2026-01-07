/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect } from "react";
import { NotesApp } from "@/components/notes-app-integrated";

export default function Home() {
  useEffect(() => {
    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("Service Worker registered:", registration);
        })
        .catch((error) => {
          console.warn(" Service Worker registration failed:", error);
        });
    }

    // Install prompt handling for PWA
    let deferredPrompt: any;
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredPrompt = e;
      console.log(" PWA install prompt available");
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", () => {});
    };
  }, []);
  
  return <NotesApp />;
}
