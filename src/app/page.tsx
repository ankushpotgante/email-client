"use client";

import React, { useState, useEffect } from "react";
import { useEmailStore } from "@/lib/store/store";
import AuthScreen from "@/components/AuthScreen";
import Sidebar from "@/components/Sidebar";
import EmailList from "@/components/EmailList";
import EmailDetail from "@/components/EmailDetail";
import ComposeModal from "@/components/ComposeModal";

export default function Home() {
  const { 
    token, 
    isAuthLoading, 
    activeAccountId, 
    syncEmails, 
    fetchEmails 
  } = useEmailStore();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isEmailListCollapsed, setIsEmailListCollapsed] = useState(false);

  // Active tab polling for new emails (every 2 minutes)
  useEffect(() => {
    if (!token || !activeAccountId) return;

    const performSync = async () => {
      if (document.visibilityState !== "visible") {
        console.log("Tab is hidden, skipping active tab email sync.");
        return;
      }
      console.log(`Active tab sync: Syncing account ${activeAccountId}...`);
      try {
        const res = await syncEmails(activeAccountId);
        if (res.success && res.count > 0) {
          console.log(`Active tab sync: Synced ${res.count} new emails!`);
          await fetchEmails();
        }
      } catch (err) {
        console.error("Active tab sync failed:", err);
      }
    };

    // Run sync on mount/active account change
    performSync();

    // Check periodically every 2 minutes (120,000 ms)
    const intervalId = setInterval(performSync, 120000);

    return () => clearInterval(intervalId);
  }, [token, activeAccountId, syncEmails, fetchEmails]);

  if (isAuthLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen w-screen bg-zinc-950 text-zinc-50 font-sans">
        <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mb-4" />
        <span className="text-xs font-semibold text-zinc-450 uppercase tracking-widest animate-pulse">
          Loading AuraMail...
        </span>
      </div>
    );
  }

  if (!token) {
    return <AuthScreen />;
  }

  return (
    <div className="flex flex-col md:flex-row h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-50 font-sans">
      {/* Sidebar Navigation */}
      <Sidebar 
        isCollapsed={isSidebarCollapsed} 
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
      />

      {/* Main Mail Feed */}
      <main className="flex-1 flex flex-col md:flex-row min-w-0 overflow-hidden relative">
        {/* Email Feed Column */}
        <EmailList 
          isCollapsed={isEmailListCollapsed} 
          onToggleCollapse={() => setIsEmailListCollapsed(!isEmailListCollapsed)} 
        />

        {/* Reading Pane Column */}
        <EmailDetail 
          isEmailListCollapsed={isEmailListCollapsed}
          onToggleEmailList={() => setIsEmailListCollapsed(!isEmailListCollapsed)}
        />
      </main>

      {/* Floating Compose Panel */}
      <ComposeModal />
    </div>
  );
}
