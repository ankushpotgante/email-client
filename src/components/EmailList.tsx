"use client";

import React, { useMemo } from "react";
import { useEmailStore, Email } from "@/lib/store/store";
import { Search, Sparkles, AlertCircle, CheckCircle2, Archive, Trash2, ArrowRight } from "lucide-react";

export default function EmailList() {
  const {
    emails,
    activeEmailId,
    searchQuery,
    priorityFocus,
    activeFolder,
    isLoadingEmails,
    setActiveEmailId,
    setSearchQuery,
    moveToFolder,
    toggleReadStatus
  } = useEmailStore();

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
    <div className="w-full md:w-96 flex flex-col h-full bg-zinc-950 border-r border-zinc-900 shrink-0">
      {/* Search Header */}
      <div className="p-4 border-b border-zinc-900 bg-zinc-950/50">
        <div className="relative">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search email, subjects..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 focus:outline-none focus:border-indigo-500/50 text-sm placeholder-zinc-500 text-zinc-200 transition-colors"
          />
        </div>
      </div>

      {/* Feed Filter Info */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-zinc-900/50 bg-zinc-950/20">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          {priorityFocus ? "Priority Focus" : activeFolder}
        </span>
        <span className="text-xxs font-bold px-2 py-0.5 rounded-full bg-zinc-900 text-zinc-400">
          {filteredEmails.length} messages
        </span>
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
                ? "No high-priority alerts flagged by Gemini at the moment."
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
      </div>
    </div>
  );
}
