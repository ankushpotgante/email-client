"use client";

import React, { useEffect, useState } from "react";
import { useEmailStore } from "@/lib/store/store";
import { X, Send, Minus, Maximize2, Trash2 } from "lucide-react";

export default function ComposeModal() {
  const {
    isComposeOpen,
    accounts,
    setIsComposeOpen,
    sendEmail
  } = useEmailStore();

  const [accountId, setAccountId] = useState<string>("gmail");
  const [toEmail, setToEmail] = useState<string>("");
  const [subject, setSubject] = useState<string>("");
  const [body, setBody] = useState<string>("");
  const [isSending, setIsSending] = useState<boolean>(false);

  // Check for pre-filled draft details in localStorage when modal is opened
  useEffect(() => {
    if (isComposeOpen && typeof window !== "undefined") {
      const draftTo = localStorage.getItem("auramail_draft_to");
      const draftSubject = localStorage.getItem("auramail_draft_subject");
      const draftBody = localStorage.getItem("auramail_draft_body");

      if (draftTo) setToEmail(draftTo);
      if (draftSubject) setSubject(draftSubject);
      if (draftBody) setBody(draftBody);

      // Clean up localStorage to avoid repeating on subsequent compose opens
      localStorage.removeItem("auramail_draft_to");
      localStorage.removeItem("auramail_draft_subject");
      localStorage.removeItem("auramail_draft_body");
    }
  }, [isComposeOpen]);

  if (!isComposeOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toEmail || isSending) return;

    setIsSending(true);
    try {
      const success = await sendEmail(accountId, toEmail, subject, body);
      if (success) {
        // Clear forms
        setToEmail("");
        setSubject("");
        setBody("");
        setIsComposeOpen(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSending(false);
    }
  };

  const handleDiscard = () => {
    setToEmail("");
    setSubject("");
    setBody("");
    setIsComposeOpen(false);
  };

  return (
    <div className="fixed inset-0 sm:inset-auto sm:bottom-0 sm:right-6 z-50 w-full sm:w-[500px] h-full sm:h-[450px] bg-zinc-900 border border-zinc-800 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200">
      
      {/* Modal Header */}
      <div className="bg-zinc-950 px-4 py-3.5 flex items-center justify-between border-b border-zinc-800/80">
        <span className="text-xs font-bold text-zinc-300">New Message</span>
        
        <div className="flex items-center gap-1">
          <button
            onClick={handleDiscard}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-850 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Compose Form */}
      <form onSubmit={handleSend} className="flex-1 flex flex-col min-h-0 bg-zinc-900">
        
        {/* Account Selector (From) */}
        <div className="px-4 py-2 border-b border-zinc-800/50 flex items-center gap-3 text-xs">
          <span className="text-zinc-500 font-semibold w-12 shrink-0">From</span>
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="bg-transparent border-none text-zinc-300 focus:outline-none focus:ring-0 font-medium"
          >
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id} className="bg-zinc-900 text-zinc-300">
                {acc.name} ({acc.email})
              </option>
            ))}
          </select>
        </div>

        {/* Recipient Input (To) */}
        <div className="px-4 py-2 border-b border-zinc-800/50 flex items-center gap-3 text-xs">
          <span className="text-zinc-500 font-semibold w-12 shrink-0">To</span>
          <input
            type="email"
            value={toEmail}
            onChange={(e) => setToEmail(e.target.value)}
            required
            placeholder="recipient@domain.com"
            className="flex-1 bg-transparent border-none text-zinc-200 focus:outline-none focus:ring-0 placeholder-zinc-600"
          />
        </div>

        {/* Subject Input */}
        <div className="px-4 py-2 border-b border-zinc-800/50 flex items-center gap-3 text-xs">
          <span className="text-zinc-500 font-semibold w-12 shrink-0">Subject</span>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Enter subject line..."
            className="flex-1 bg-transparent border-none text-zinc-200 focus:outline-none focus:ring-0 placeholder-zinc-600 font-medium"
          />
        </div>

        {/* Body Textarea */}
        <div className="flex-1 p-4 overflow-y-auto">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Type your message details here..."
            className="w-full h-full bg-transparent border-none text-zinc-300 focus:outline-none focus:ring-0 resize-none text-xs leading-relaxed placeholder-zinc-700"
          />
        </div>

        {/* Footer controls */}
        <div className="bg-zinc-950/40 border-t border-zinc-800/50 p-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={isSending || !toEmail}
              className="flex items-center gap-1.5 py-2 px-4 bg-indigo-500 hover:bg-indigo-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-500/10 transition-colors cursor-pointer"
            >
              {isSending ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Message</span>
                </>
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={handleDiscard}
            title="Discard Draft"
            className="p-2 rounded-xl border border-zinc-850 hover:border-zinc-800 hover:text-rose-400 text-zinc-600 transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
