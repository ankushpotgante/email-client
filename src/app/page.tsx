"use client";

import React from "react";
import Sidebar from "@/components/Sidebar";
import EmailList from "@/components/EmailList";
import EmailDetail from "@/components/EmailDetail";
import ComposeModal from "@/components/ComposeModal";

export default function Home() {
  return (
    <div className="flex flex-col md:flex-row h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-50 font-sans">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Mail Feed */}
      <main className="flex-1 flex flex-col md:flex-row min-w-0 overflow-hidden relative">
        {/* Email Feed Column */}
        <EmailList />

        {/* Reading Pane Column */}
        <EmailDetail />
      </main>

      {/* Floating Compose Panel */}
      <ComposeModal />
    </div>
  );
}
