"use client";

import React, { useState } from "react";
import { useEmailStore } from "@/lib/store/store";
import AddAccountModal from "@/components/AddAccountModal";
import { 
  Archive, 
  Send, 
  Trash2, 
  Folder, 
  Sparkles, 
  Plus, 
  ChevronDown, 
  ChevronLeft,
  ChevronRight,
  User, 
  Layers,
  Inbox,
  LogOut
} from "lucide-react";

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export default function Sidebar({ isCollapsed, onToggleCollapse }: SidebarProps) {
  const {
    accounts,
    activeAccountId,
    activeFolder,
    emails,
    priorityFocus,
    setActiveAccountId,
    setActiveFolder,
    setPriorityFocus,
    setIsComposeOpen,
    logout
  } = useEmailStore();

  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);

  // Find active account details
  const activeAccount = accounts.find((a) => a.id === activeAccountId);
  
  // Calculate email count badges
  const getBadgeCount = (folder: string) => {
    return emails.filter(e => {
      if (activeAccountId !== "all" && e.accountId !== activeAccountId) return false;
      return e.folder === folder && !e.read;
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
    <aside className={`bg-zinc-950 border-r border-zinc-900 flex flex-col h-full shrink-0 transition-all duration-300 ease-in-out ${
      isCollapsed ? "w-16" : "w-64"
    }`}>
      
      {/* Brand Header */}
      <div className={`p-4 flex items-center justify-between border-b border-zinc-900/50 ${
        isCollapsed ? "flex-col gap-2 py-5" : "gap-3 px-6 py-5"
      }`}>
        {!isCollapsed ? (
          <div className="flex items-center gap-3 overflow-hidden animate-in fade-in duration-300">
            <div className="w-8.5 h-8.5 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-teal-500 flex items-center justify-center shadow-lg shadow-indigo-500/10 shrink-0">
              <Sparkles className="w-4.5 h-4.5 text-white" />
            </div>
            <div className="truncate">
              <h1 className="text-sm font-bold text-zinc-150 leading-tight">AuraMail</h1>
              <span className="text-[10px] text-zinc-500 font-semibold">OpenAI Client</span>
            </div>
          </div>
        ) : (
          <div className="w-8.5 h-8.5 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-teal-500 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/10">
            <Sparkles className="w-4.5 h-4.5 text-white" />
          </div>
        )}
        <button
          onClick={onToggleCollapse}
          className={`p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 transition-colors cursor-pointer shrink-0 ${
            isCollapsed ? "mt-1" : ""
          }`}
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Account Switcher */}
      <div className={`px-4 mb-4 relative mt-4 ${isCollapsed ? "flex justify-center" : ""}`}>
        {!isCollapsed ? (
          <button
            onClick={() => setIsAccountDropdownOpen(!isAccountDropdownOpen)}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-zinc-900/40 hover:bg-zinc-900 border border-zinc-800/80 hover:border-zinc-850 transition-all text-left group cursor-pointer"
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="overflow-hidden">
                <div className="text-xs font-semibold text-zinc-200 truncate leading-tight">
                  {activeAccountId === "all" ? "Unified Inbox" : activeAccount?.name}
                </div>
                <div className="text-[10px] text-zinc-500 truncate leading-none mt-0.5">
                  {activeAccountId === "all" ? "All Accounts" : activeAccount?.email}
                </div>
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300 transition-colors shrink-0 ml-2" />
          </button>
        ) : (
          <button
            onClick={() => setIsAccountDropdownOpen(!isAccountDropdownOpen)}
            className={`p-2.5 rounded-xl bg-zinc-900/40 hover:bg-zinc-900 border border-zinc-805 hover:border-zinc-800 transition-all cursor-pointer relative shrink-0 ${
              isAccountDropdownOpen ? "border-indigo-500/30 bg-indigo-500/5 text-indigo-400" : "text-zinc-400"
            }`}
            title="Switch Account"
          >
            <User className="w-4 h-4 text-indigo-400" />
          </button>
        )}

        {isAccountDropdownOpen && (
          <>
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setIsAccountDropdownOpen(false)}
            />
            <div className={`absolute bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl overflow-hidden z-20 animate-in fade-in slide-in-from-top-1 duration-100 ${
              isCollapsed ? "left-12 top-0 w-56 ml-2" : "left-4 right-4 mt-2"
            }`}>
              <div className="p-1.5 border-b border-zinc-800/50 bg-zinc-950/20">
                <button
                  onClick={() => {
                    setActiveAccountId("all");
                    setIsAccountDropdownOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 p-2 rounded-lg text-xs text-left transition-colors cursor-pointer ${
                    activeAccountId === "all"
                      ? "bg-indigo-500/10 text-indigo-400 font-bold"
                      : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Unified Inbox</span>
                </button>
              </div>
              <div className="p-1.5 space-y-1 max-h-48 overflow-y-auto">
                {accounts.map((acc) => (
                  <button
                    key={acc.id}
                    onClick={() => {
                      setActiveAccountId(acc.id);
                      setIsAccountDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-2 rounded-lg text-xs text-left transition-colors cursor-pointer ${
                      activeAccountId === acc.id
                        ? "bg-indigo-500/10 text-indigo-400 font-bold"
                        : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className="w-1.5 h-1.5 rounded-full bg-zinc-650 shrink-0" />
                      <div className="truncate">
                        <div className="font-semibold text-zinc-200">{acc.name}</div>
                        <div className="text-[10px] text-zinc-500 truncate">{acc.email}</div>
                      </div>
                    </div>
                    <span className="text-[9px] uppercase tracking-wider px-1 py-0.5 rounded bg-zinc-800 text-zinc-400 font-bold shrink-0">
                      {acc.type}
                    </span>
                  </button>
                ))}
              </div>
              <div className="p-1.5 border-t border-zinc-800/50 bg-zinc-950/20 flex flex-col gap-1">
                <button
                  onClick={() => {
                    setIsAddAccountOpen(true);
                    setIsAccountDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 p-2 rounded-lg text-[10px] font-bold text-indigo-400 hover:bg-indigo-500/10 hover:text-indigo-300 transition-colors text-left cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Connect Account</span>
                </button>
                <button
                  onClick={() => {
                    logout();
                    setIsAccountDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 p-2 rounded-lg text-[10px] font-bold text-rose-450 hover:bg-rose-500/10 hover:text-rose-400 transition-colors text-left cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Compose Button */}
      <div className={`px-4 mb-6 ${isCollapsed ? "flex justify-center" : ""}`}>
        {!isCollapsed ? (
          <button
            onClick={() => setIsComposeOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 text-white font-bold text-xs shadow-md shadow-indigo-500/10 transition-all hover:scale-[1.02] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Compose</span>
          </button>
        ) : (
          <button
            onClick={() => setIsComposeOpen(true)}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 text-white shadow-md shadow-indigo-500/10 transition-all hover:scale-[1.02] cursor-pointer"
            title="Compose Email"
          >
            <Plus className="w-4.5 h-4.5" />
          </button>
        )}
      </div>

      {/* Navigation Folders */}
      <div className="px-3 mb-6 flex-1 overflow-y-auto space-y-1.5">
        {!isCollapsed && (
          <div className="text-xxs uppercase tracking-wider text-zinc-500 font-bold px-3 mb-2 animate-in fade-in duration-300">
            Mailboxes
          </div>
        )}
        {folders.map((folder) => {
          const Icon = folder.icon;
          const isActive = activeFolder === folder.id;
          return (
            <button
              key={folder.id}
              onClick={() => setActiveFolder(folder.id)}
              className={`w-full flex items-center ${
                isCollapsed ? "justify-center p-2.5" : "justify-between py-2 px-3 gap-3"
              } rounded-xl transition-all cursor-pointer ${
                isActive
                  ? "bg-indigo-500/10 text-indigo-400 font-bold border border-indigo-500/10"
                  : "text-zinc-400 hover:bg-zinc-900 border border-transparent"
              }`}
              title={isCollapsed ? folder.label : undefined}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? "text-indigo-400" : "text-zinc-500"}`} />
                {!isCollapsed && <span className="text-xs font-semibold">{folder.label}</span>}
              </div>
              {!isCollapsed && folder.badge > 0 && (
                <span className="text-[10px] bg-indigo-500/25 text-indigo-400 px-2 py-0.5 rounded-md font-bold">
                  {folder.badge}
                </span>
              )}
            </button>
          );
        })}

        {/* Labels / Categories */}
        {!isCollapsed && allLabels.length > 0 && (
          <div className="pt-6 animate-in fade-in duration-300">
            <div className="text-xxs uppercase tracking-wider text-zinc-500 font-bold px-3 mb-2">
              Recent Labels
            </div>
            {allLabels.map((lbl) => (
              <div
                key={lbl}
                className="flex items-center gap-3 py-2 px-3 rounded-xl text-zinc-400 text-xs font-semibold"
              >
                <Folder className="w-4 h-4 text-zinc-650" />
                <span>{lbl}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI Triage Switch (Bottom Bar) */}
      <div className={`p-4 border-t border-zinc-900 bg-zinc-950/80 ${isCollapsed ? "flex justify-center" : ""}`}>
        {!isCollapsed ? (
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900/30 border border-zinc-900 w-full">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${priorityFocus ? "bg-amber-400 animate-pulse shadow-md shadow-amber-400/50" : "bg-zinc-600"}`} />
              <div>
                <div className="text-xs font-bold text-zinc-200">Priority Focus</div>
                <div className="text-[10px] text-zinc-500">Smart AI Triage Only</div>
              </div>
            </div>
            <button
              onClick={() => setPriorityFocus(!priorityFocus)}
              className={`w-9 h-5 rounded-full p-0.5 transition-all shrink-0 cursor-pointer ${
                priorityFocus ? "bg-amber-500" : "bg-zinc-800"
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-all transform ${
                  priorityFocus ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setPriorityFocus(!priorityFocus)}
            className={`p-2.5 rounded-xl border transition-all cursor-pointer relative shrink-0 ${
              priorityFocus ? "bg-amber-500/10 border-amber-500/30 text-amber-400" : "bg-zinc-900/40 border-zinc-800 text-zinc-500"
            }`}
            title="Toggle Priority Focus"
          >
            <div className={`absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full ${
              priorityFocus ? "bg-amber-400 animate-pulse" : "bg-transparent"
            }`} />
            <Sparkles className="w-4.5 h-4.5" />
          </button>
        )}
      </div>

      {/* Add Account Modal */}
      <AddAccountModal 
        isOpen={isAddAccountOpen} 
        onClose={() => setIsAddAccountOpen(false)} 
      />
    </aside>
  );
}
