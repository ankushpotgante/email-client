"use client";

import React, { useMemo, useState } from "react";
import { useEmailStore, Email } from "@/lib/store/store";
import { Search, Sparkles, AlertCircle, CheckCircle2, Archive, Trash2, ArrowRight, RefreshCw, ChevronLeft, Bell, Info, X } from "lucide-react";

interface EmailListProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export default function EmailList({ isCollapsed, onToggleCollapse }: EmailListProps) {
  const {
    emails,
    accounts,
    activeEmailId,
    searchQuery,
    priorityFocus,
    activeFolder,
    isLoadingEmails,
    setActiveEmailId,
    setSearchQuery,
    moveToFolder,
    toggleReadStatus,
    syncEmails,
    activeAccountId,
    hasMoreEmails,
    loadMoreEmails
  } = useEmailStore();

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [hasUnreadNotification, setHasUnreadNotification] = useState(true);

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncStatus(null);
    try {
      if (activeAccountId === "all") {
        setSyncStatus("Syncing all...");
        let totalSynced = 0;
        for (const account of accounts) {
          try {
            const res = await syncEmails(account.id);
            if (res.success) {
              totalSynced += res.count;
            }
          } catch (err) {
            console.error(`Failed to sync account ${account.id}:`, err);
          }
        }
        setSyncStatus(`Synced ${totalSynced} new!`);
        setTimeout(() => setSyncStatus(null), 4000);
      } else {
        const res = await syncEmails(activeAccountId);
        if (res.success) {
          setSyncStatus(`Synced ${res.count} new!`);
          setTimeout(() => setSyncStatus(null), 4000);
        } else {
          setSyncStatus(res.error || "Sync failed");
          setTimeout(() => setSyncStatus(null), 4000);
        }
      }
    } catch {
      setSyncStatus("Network error");
      setTimeout(() => setSyncStatus(null), 4000);
    } finally {
      setIsSyncing(false);
    }
  };

  // Filter emails by priority if priorityFocus is active
  const filteredEmails = useMemo(() => {
    return emails.filter((e) => {
      if (priorityFocus && e.priority !== "high") return false;
      return true;
    });
  }, [emails, priorityFocus]);

  // Format dates for display
  const formatEmailDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      
      // If today, show time
      if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      }
      
      // Otherwise show month day
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    } catch {
      return "just now";
    }
  };

  const handleSelectEmail = (email: Email) => {
    setActiveEmailId(email.id);
    if (!email.read) {
      toggleReadStatus([email.id], true);
    }
  };

  return (
    <aside className={`bg-zinc-950 flex flex-col h-full shrink-0 transition-all duration-300 ease-in-out ${
      isCollapsed ? "w-0 border-r-0 opacity-0 pointer-events-none" : "w-full md:w-96 border-r border-zinc-900"
    }`}>
      {/* Search Header */}
      <div className="p-4 border-b border-zinc-900 bg-zinc-950/50 flex items-center gap-2 relative">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search email, subjects..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 focus:outline-none focus:border-indigo-500/50 text-sm placeholder-zinc-500 text-zinc-200 transition-colors"
          />
        </div>
        
        {/* Notification Bell with Dropdown */}
        <div className="relative shrink-0">
          <button
            onClick={() => {
              setIsNotificationOpen(!isNotificationOpen);
              setHasUnreadNotification(false);
            }}
            className={`p-2.5 rounded-xl border transition-all cursor-pointer relative flex items-center justify-center ${
              isNotificationOpen 
                ? "bg-zinc-800 border-zinc-700 text-zinc-100" 
                : "bg-zinc-900 border-zinc-805 text-zinc-400 hover:text-zinc-200 hover:border-zinc-750"
            }`}
            title="System Alerts & Status"
          >
            <Bell className="w-4 h-4" />
            {hasUnreadNotification && (
              <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
            )}
          </button>

          {isNotificationOpen && (
            <>
              {/* Overlay Backdrop to click-away */}
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setIsNotificationOpen(false)}
              />
              <div className="absolute right-0 mt-3 w-80 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-100">
                <div className="p-3 border-b border-zinc-800 bg-zinc-950/40 flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-250 flex items-center gap-1.5 select-none">
                    <Info className="w-3.5 h-3.5 text-indigo-400" />
                    System Status
                  </span>
                  <button 
                    onClick={() => setIsNotificationOpen(false)}
                    className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="p-3 space-y-2.5 max-h-72 overflow-y-auto">
                  {/* Sync Warning Notification */}
                  <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/10 flex gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-[11px] font-bold text-amber-300">Sync Interval Warning</h4>
                      <p className="text-[10px] text-zinc-400 leading-normal mt-0.5">
                        Synchronization check runs every <strong>2 minutes</strong> to fetch new emails. This occurs only while this browser tab remains visible and active to preserve serverless API execution limits.
                      </p>
                    </div>
                  </div>
                  {/* Database Persistence Info */}
                  <div className="p-3 rounded-lg bg-zinc-950/40 border border-zinc-800/80 flex gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-[11px] font-bold text-zinc-300">Session Persistence</h4>
                      <p className="text-[10px] text-zinc-500 leading-normal mt-0.5">
                        Self-healing browser session cache is active. All connected account configurations will automatically restore across refreshes.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Feed Filter Info */}
      <div className="px-4 py-2 flex items-center justify-between border-b border-zinc-900/50 bg-zinc-950/20">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          {priorityFocus ? "Priority Focus" : activeFolder}
        </span>
        <div className="flex items-center gap-2">
          {!syncStatus && (
            <span className="text-[10px] text-zinc-500 flex items-center gap-1.5 mr-1 bg-zinc-900/60 border border-zinc-800/40 px-2 py-0.5 rounded-lg select-none" title="Active Tab Delta Polling: Synchronization occurs automatically every 2 minutes while this tab is visible.">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              <span>Syncs every 2m</span>
            </span>
          )}
          {syncStatus && (
            <span className="text-[10px] font-bold text-indigo-400 animate-pulse bg-indigo-500/10 border border-indigo-500/10 px-2 py-0.5 rounded-full">
              {syncStatus}
            </span>
          )}
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className={`p-1.5 rounded-lg border text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
              isSyncing 
                ? "bg-zinc-900 border-zinc-800" 
                : "bg-zinc-950/40 border-zinc-850 hover:border-zinc-800"
            }`}
            title="Sync Account"
          >
            <RefreshCw className={`w-3 h-3 ${isSyncing ? "animate-spin text-indigo-400" : ""}`} />
            <span className="text-[10px] font-bold">Sync</span>
          </button>
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg border bg-zinc-950/40 border-zinc-850 hover:border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer flex items-center justify-center shrink-0"
            title="Collapse Feed"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="text-xxs font-bold px-2 py-1 rounded-lg bg-zinc-900 text-zinc-400 shrink-0">
            {filteredEmails.length} messages
          </span>
        </div>
      </div>

      {/* Email Feed Items */}
      <div className="flex-1 overflow-y-auto divide-y divide-zinc-900/40">
        {isLoadingEmails ? (
          <div className="flex flex-col items-center justify-center h-48 text-zinc-500 space-y-2">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-medium">Checking your mailbox...</span>
          </div>
        ) : filteredEmails.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center h-64">
            <CheckCircle2 className="w-10 h-10 text-emerald-500/30 mb-3 animate-pulse" />
            <h3 className="text-sm font-bold text-zinc-300">Inbox Zero achieved</h3>
            <p className="text-xs text-zinc-500 mt-1 max-w-xs leading-relaxed">
              {priorityFocus 
                ? "No high-priority alerts flagged by Smart AI at the moment."
                : "You are all caught up! Keep that desk clean."}
            </p>
          </div>
        ) : (
          filteredEmails.map((email) => {
            const isSelected = activeEmailId === email.id;
            
            return (
              <div
                key={email.id}
                onClick={() => handleSelectEmail(email)}
                className={`p-4 relative transition-all cursor-pointer flex flex-col group ${
                  isSelected
                    ? "bg-indigo-500/5 border-l-2 border-indigo-500"
                    : "hover:bg-zinc-900/30 border-l-2 border-transparent"
                } ${!email.read ? "bg-zinc-900/10 font-medium" : ""}`}
              >
                {/* Meta details (Sender & Time) */}
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs truncate ${!email.read ? "text-zinc-200 font-semibold" : "text-zinc-400"}`}>
                    {email.fromName}
                  </span>
                  <span className="text-xxs text-zinc-500 shrink-0 ml-2">
                    {formatEmailDate(email.date)}
                  </span>
                </div>

                {/* Subject */}
                <h4 className={`text-sm truncate mb-1 ${
                  !email.read ? "text-zinc-100 font-bold" : "text-zinc-300"
                }`}>
                  {email.subject}
                </h4>

                {/* Snippet / One-line Summary */}
                <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed mb-2.5">
                  {email.summary 
                    ? email.summary.replace(/^- /, "") 
                    : email.body.substring(0, 80).replace(/\n/g, " ") + "..."}
                </p>

                {/* Tags and Badges */}
                <div className="flex items-center justify-between mt-auto">
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    {/* Priority Badge */}
                    {email.priority === "high" ? (
                      <span className="flex items-center gap-1 text-xxs font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                        <AlertCircle className="w-2.5 h-2.5 shrink-0" />
                        <span>High Priority</span>
                      </span>
                    ) : null}
                    
                    {/* Account Indicator */}
                    <span className="text-xxs uppercase tracking-wider bg-zinc-900 px-2 py-0.5 rounded text-zinc-500 shrink-0 font-bold">
                      {email.accountId}
                    </span>
                  </div>

                  {/* Actions on Hover */}
                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    {email.folder !== "archived" && (
                      <button
                        title="Archive"
                        onClick={(e) => {
                          e.stopPropagation();
                          moveToFolder([email.id], "archived");
                        }}
                        className="p-1 rounded bg-zinc-900 border border-zinc-800 hover:text-indigo-400 text-zinc-500 hover:border-zinc-700 transition-colors"
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {email.folder !== "trash" && (
                      <button
                        title="Delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          moveToFolder([email.id], "trash");
                        }}
                        className="p-1 rounded bg-zinc-900 border border-zinc-800 hover:text-rose-400 text-zinc-500 hover:border-zinc-700 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Load More Pagination */}
        {hasMoreEmails && !isLoadingEmails && (
          <div className="p-4 flex justify-center border-t border-zinc-900/50">
            <button
              onClick={loadMoreEmails}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-indigo-500/30 hover:text-indigo-400 text-zinc-400 text-xs font-semibold transition-all cursor-pointer"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              Load More
            </button>
          </div>
        )}
        {isLoadingEmails && emails.length > 0 && (
          <div className="p-4 flex justify-center">
            <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
    </aside>
  );
}
