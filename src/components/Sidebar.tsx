"use client";

import React, { useState } from "react";
import { useEmailStore } from "@/lib/store/store";
import { 
  Mail, 
  Archive, 
  Send, 
  Trash2, 
  Folder, 
  Sparkles, 
  Plus, 
  ChevronDown, 
  User, 
  Lock,
  Layers,
  Inbox
} from "lucide-react";

export default function Sidebar() {
  const {
    accounts,
    activeAccountId,
    activeFolder,
    emails,
    priorityFocus,
    setActiveAccountId,
    setActiveFolder,
    setPriorityFocus,
    setIsComposeOpen
  } = useEmailStore();

  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);

  // Find active account details
  const activeAccount = accounts.find((a) => a.id === activeAccountId);
  
  // Calculate email count badges
  const getBadgeCount = (folder: string) => {
    return emails.filter(e => {
      // match account filter
      if (activeAccountId !== "all" && e.accountId !== activeAccountId) return false;
      // match folder
      if (e.folder !== folder) return false;
      // count unread for inbox
      if (folder === "inbox") return !e.read;
      return false; // no badges for other folders
    }).length;
  };

  const inboxUnread = getBadgeCount("inbox");

  const folders = [
    { id: "inbox", label: "Inbox", icon: Inbox, badge: inboxUnread },
    { id: "archived", label: "Archive", icon: Archive, badge: 0 },
    { id: "sent", label: "Sent", icon: Send, badge: 0 },
    { id: "trash", label: "Trash", icon: Trash2, badge: 0 }
  ];

  // Unique labels list in matching emails
  const allLabels = Array.from(
    new Set(emails.flatMap((e) => e.labels || []))
  ).slice(0, 5); // display first 5

  return (
    <aside className="w-full md:w-64 bg-zinc-950 border-r border-zinc-900 flex flex-col h-full shrink-0">
      {/* Brand Logo */}
      <div className="p-6 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-teal-500 flex items-center justify-center shadow-lg shadow-indigo-500/10">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold bg-gradient-to-r from-zinc-50 via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
            AuraMail
          </h1>
          <span className="text-xs text-zinc-500 font-medium">Gemini AI Client</span>
        </div>
      </div>

      {/* Account Switcher */}
      <div className="px-4 mb-4 relative">
        <button
          onClick={() => setIsAccountDropdownOpen(!isAccountDropdownOpen)}
          className="w-full flex items-center justify-between p-3 rounded-xl bg-zinc-900/40 hover:bg-zinc-900 border border-zinc-800/80 hover:border-zinc-800 transition-all text-left group"
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="overflow-hidden">
              <div className="text-sm font-semibold text-zinc-200 truncate leading-tight">
                {activeAccountId === "all" ? "Unified Inbox" : activeAccount?.name}
              </div>
              <div className="text-xs text-zinc-500 truncate leading-none mt-0.5">
                {activeAccountId === "all" ? "All Accounts" : activeAccount?.email}
              </div>
            </div>
          </div>
          <ChevronDown className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300 transition-colors shrink-0 ml-2" />
        </button>

        {isAccountDropdownOpen && (
          <>
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setIsAccountDropdownOpen(false)}
            />
            <div className="absolute left-4 right-4 mt-2 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl overflow-hidden z-20 animate-in fade-in slide-in-from-top-1 duration-100">
              <div className="p-1.5 border-b border-zinc-800/50 bg-zinc-950/20">
                <button
                  onClick={() => {
                    setActiveAccountId("all");
                    setIsAccountDropdownOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-sm text-left transition-colors ${
                    activeAccountId === "all"
                      ? "bg-indigo-500/10 text-indigo-400 font-medium"
                      : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  <span>Unified Inbox</span>
                </button>
              </div>
              <div className="p-1.5 space-y-1">
                {accounts.map((acc) => (
                  <button
                    key={acc.id}
                    onClick={() => {
                      setActiveAccountId(acc.id);
                      setIsAccountDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-2.5 rounded-lg text-sm text-left transition-colors ${
                      activeAccountId === acc.id
                        ? "bg-indigo-500/10 text-indigo-400 font-medium"
                        : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
                    }`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-2 h-2 rounded-full bg-zinc-600 shrink-0" />
                      <div className="truncate">
                        <div className="font-medium text-zinc-200">{acc.name}</div>
                        <div className="text-xxs text-zinc-500 truncate">{acc.email}</div>
                      </div>
                    </div>
                    <span className="text-xxs uppercase tracking-wider px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-bold">
                      {acc.type}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Compose Button */}
      <div className="px-4 mb-6">
        <button
          onClick={() => setIsComposeOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 text-white font-semibold text-sm shadow-md shadow-indigo-500/10 transition-all hover:scale-[1.02] cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Compose</span>
        </button>
      </div>

      {/* Navigation Folders */}
      <div className="px-3 mb-6 flex-1 overflow-y-auto space-y-1.5">
        <div className="text-xxs uppercase tracking-wider text-zinc-500 font-bold px-3 mb-2">
          Mailboxes
        </div>
        {folders.map((folder) => {
          const Icon = folder.icon;
          const isActive = activeFolder === folder.id;
          return (
            <button
              key={folder.id}
              onClick={() => setActiveFolder(folder.id)}
              className={`w-full flex items-center justify-between py-2.5 px-3 rounded-xl transition-all ${
                isActive
                  ? "bg-indigo-500/10 text-indigo-400 font-semibold"
                  : "text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? "text-indigo-400" : "text-zinc-500"}`} />
                <span className="text-sm">{folder.label}</span>
              </div>
              {folder.badge > 0 && (
                <span className="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full font-bold">
                  {folder.badge}
                </span>
              )}
            </button>
          );
        })}

        {/* Labels / Categories */}
        {allLabels.length > 0 && (
          <div className="pt-6">
            <div className="text-xxs uppercase tracking-wider text-zinc-500 font-bold px-3 mb-2">
              Recent Labels
            </div>
            {allLabels.map((lbl) => (
              <div
                key={lbl}
                className="flex items-center gap-3 py-2 px-3 rounded-xl text-zinc-400 text-sm"
              >
                <Folder className="w-4 h-4 text-zinc-600" />
                <span>{lbl}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI Triage Switch (Bottom Bar) */}
      <div className="p-4 border-t border-zinc-900 bg-zinc-950/80">
        <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/30 border border-zinc-900">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${priorityFocus ? "bg-amber-400 animate-pulse shadow-md shadow-amber-400/50" : "bg-zinc-600"}`} />
            <div>
              <div className="text-xs font-semibold text-zinc-200">Priority Focus</div>
              <div className="text-xxs text-zinc-500">Gemini Triage Only</div>
            </div>
          </div>
          <button
            onClick={() => setPriorityFocus(!priorityFocus)}
            className={`w-10 h-6 rounded-full p-0.5 transition-all ${
              priorityFocus ? "bg-amber-500" : "bg-zinc-800"
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-all transform ${
                priorityFocus ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>
    </aside>
  );
}
