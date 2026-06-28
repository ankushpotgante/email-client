"use client";

import React, { useState } from "react";
import { useEmailStore } from "@/lib/store/store";
import AuthScreen from "@/components/AuthScreen";
import Sidebar from "@/components/Sidebar";
import EmailList from "@/components/EmailList";
import EmailDetail from "@/components/EmailDetail";
import ComposeModal from "@/components/ComposeModal";

export default function Home() {
  const { token, isAuthLoading } = useEmailStore();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isEmailListCollapsed, setIsEmailListCollapsed] = useState(false);

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
