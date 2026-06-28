"use client";

import React, { useEffect, useState } from "react";
import { useEmailStore, Email } from "@/lib/store/store";
import { 
  Archive, 
  Trash2, 
  Mail, 
  MailOpen, 
  Sparkles, 
  Clock, 
  User, 
  Send, 
  CornerUpLeft, 
  CornerUpRight, 
  ChevronRight, 
  ArrowRight,
  AlertCircle,
  Inbox,
  Forward,
  X
} from "lucide-react";
import canvasConfetti from "canvas-confetti";

interface EmailDetailProps {
  isEmailListCollapsed: boolean;
  onToggleEmailList: () => void;
}

export default function EmailDetail({ isEmailListCollapsed, onToggleEmailList }: EmailDetailProps) {
  const {
    activeEmailId,
    emails,
    isLoadingSummary,
    getAISummary,
    generateAIDraft,
    moveToFolder,
    toggleReadStatus,
    setIsComposeOpen,
    sendEmail,
    token,
    forwardEmail
  } = useEmailStore();

  const [aiSummary, setAiSummary] = useState<string>("");
  const [draftTone, setDraftTone] = useState<string>("professional");
  const [customPrompt, setCustomPrompt] = useState<string>("");
  const [generatedDraft, setGeneratedDraft] = useState<string>("");
  const [isDrafting, setIsDrafting] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"read" | "summary" | "reply">("read");
  const [isForwardOpen, setIsForwardOpen] = useState(false);
  const [forwardTo, setForwardTo] = useState("");
  const [forwardNote, setForwardNote] = useState("");
  const [isForwarding, setIsForwarding] = useState(false);
  const [smartSuggestions, setSmartSuggestions] = useState<Array<{label: string; prompt: string}> | null>(null);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const forwardInputRef = React.useRef<HTMLInputElement>(null);
  const [isReplyOpen, setIsReplyOpen] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [isSendingReply, setIsSendingReply] = useState(false);
  const replyInputRef = React.useRef<HTMLTextAreaElement>(null);

  // Auto-focus on Forward input when composer is toggled open
  useEffect(() => {
    if (isForwardOpen) {
      setTimeout(() => {
        forwardInputRef.current?.focus();
      }, 50);
    }
  }, [isForwardOpen]);

  // Auto-focus on Reply input when composer is toggled open
  useEffect(() => {
    if (isReplyOpen) {
      setTimeout(() => {
        replyInputRef.current?.focus();
      }, 50);
    }
  }, [isReplyOpen]);

  // Find the currently selected email
  const email = emails.find((e) => e.id === activeEmailId);

  // Reset tab and drafts when email selection changes
  useEffect(() => {
    setAiSummary("");
    setReplyBody("");
    setCustomPrompt("");
    setActiveTab("read");
    setIsForwardOpen(false);
    setIsReplyOpen(false);
    setSmartSuggestions(null);
  }, [activeEmailId]);

  if (!email) {
    return (
      <div className="flex-1 flex flex-col h-full bg-zinc-950/40 relative min-w-0 overflow-hidden">
        {isEmailListCollapsed && (
          <div className="p-4 border-b border-zinc-900 bg-zinc-950/60 flex items-center justify-between w-full">
            <button
              onClick={onToggleEmailList}
              className="p-1.5 px-3 rounded-lg border bg-indigo-500/10 border-indigo-500/20 text-indigo-400 hover:text-indigo-300 transition-all cursor-pointer flex items-center gap-2 shrink-0 animate-pulse text-xs font-bold"
              title="Expand Email Feed"
            >
              <Inbox className="w-4 h-4" />
              <span>Show Inbox Feed</span>
            </button>
          </div>
        )}
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-zinc-500 text-center select-none">
          <Mail className="w-12 h-12 text-zinc-805 mb-4 animate-bounce" />
          <h3 className="text-zinc-300 font-bold text-sm">Select a message</h3>
          <p className="text-xs text-zinc-500 mt-1 max-w-xs leading-relaxed">
            Choose an email from your feed to view attachments, read conversations, or draft AI-powered replies.
          </p>
        </div>
      </div>
    );
  }

  // Handle generating summary on demand
  const handleGenerateSummary = async () => {
    setActiveTab("summary");
    if (!aiSummary && email) {
      const summary = await getAISummary(email.id);
      setAiSummary(summary);
    }
  };

  // Generate Reply Draft using AI
  const handleGenerateDraft = async (promptOverride?: string) => {
    setIsDrafting(true);
    setActiveTab("reply");
    try {
      const promptText = promptOverride || customPrompt;
      const draft = await generateAIDraft(email.id, promptText, draftTone);
      setReplyBody(draft);
    } catch (e) {
      console.error(e);
    } finally {
      setIsDrafting(false);
    }
  };

  // Load dynamic AI-generated smart suggestions
  const handleOpenReplyTab = async () => {
    setActiveTab("reply");
    if (!smartSuggestions && email) {
      setIsLoadingSuggestions(true);
      try {
        const res = await fetch("/api/ai/smart-suggestions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ emailId: email.id })
        });
        if (res.ok) {
          const data = await res.json();
          setSmartSuggestions(data.suggestions || []);
        }
      } catch (e) {
        console.error("Failed to load suggestions:", e);
      } finally {
        setIsLoadingSuggestions(false);
      }
    }
  };

  // Forward email handler
  const handleForward = async () => {
    if (!forwardTo || !email) return;
    setIsForwarding(true);
    try {
      const success = await forwardEmail(email.id, forwardTo, forwardNote);
      if (success) {
        setIsForwardOpen(false);
        setForwardTo("");
        setForwardNote("");
        canvasConfetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.8 }
        });
      }
    } catch (e) {
      console.error("Failed to forward email:", e);
    } finally {
      setIsForwarding(false);
    }
  };

  // Send Reply handler
  const handleSendReply = async () => {
    if (!replyBody || !email) return;
    setIsSendingReply(true);
    try {
      const success = await sendEmail(
        email.accountId,
        email.fromEmail,
        email.subject.startsWith("Re:") ? email.subject : `Re: ${email.subject}`,
        replyBody
      );
      if (success) {
        setIsReplyOpen(false);
        setReplyBody("");
        canvasConfetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.8 }
        });
      }
    } catch (e) {
      console.error("Failed to send reply:", e);
    } finally {
      setIsSendingReply(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950/40 relative min-w-0 overflow-hidden">
      {/* Top Toolbar Action Buttons */}
      <div className="p-4 border-b border-zinc-900 bg-zinc-950/60 flex flex-col sm:flex-row gap-3 sm:items-center justify-between min-w-0 w-full">
        <div className="flex items-center gap-2 min-w-0">
          {isEmailListCollapsed && (
            <button
              onClick={onToggleEmailList}
              className="p-1.5 px-3 rounded-lg border bg-indigo-500/10 border-indigo-500/20 text-indigo-400 hover:text-indigo-300 transition-all cursor-pointer flex items-center gap-2 shrink-0 animate-pulse mr-2 text-xs font-bold"
              title="Expand Email Feed"
            >
              <Inbox className="w-3.5 h-3.5" />
              <span>Show Feed</span>
            </button>
          )}
          <button
            onClick={() => moveToFolder([email.id], "archived")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800/80 text-zinc-300 hover:text-white hover:bg-zinc-850 hover:border-zinc-700 transition-colors text-xs font-semibold"
          >
            <Archive className="w-3.5 h-3.5" />
            <span>Archive</span>
          </button>
          <button
            onClick={() => moveToFolder([email.id], "trash")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900/40 border border-zinc-800/80 text-zinc-400 hover:text-rose-400 hover:bg-zinc-900 hover:border-zinc-800 transition-colors text-xs font-semibold"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
          <button
            onClick={() => toggleReadStatus([email.id], !email.read)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900/40 border border-zinc-800/80 text-zinc-400 hover:text-indigo-400 hover:bg-zinc-900 hover:border-zinc-800 transition-colors text-xs font-semibold"
          >
            {email.read ? (
              <>
                <Mail className="w-3.5 h-3.5" />
                <span>Mark Unread</span>
              </>
            ) : (
              <>
                <MailOpen className="w-3.5 h-3.5" />
                <span>Mark Read</span>
              </>
            )}
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center bg-zinc-900/80 p-0.5 rounded-xl border border-zinc-800/50">
          <button
            onClick={() => setActiveTab("read")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "read"
                ? "bg-zinc-800 text-zinc-100 shadow"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Read
          </button>
          <button
            onClick={handleGenerateSummary}
            className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "summary"
                ? "bg-indigo-500/10 text-indigo-400 shadow"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span>AI Summary</span>
          </button>
          <button
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "reply"
                ? "bg-zinc-800 text-zinc-100 shadow"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
            onClick={handleOpenReplyTab}
          >
            Smart Reply
          </button>
        </div>
      </div>

      {/* Main Detail Window */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {/* Email Header */}
        <div className="border-b border-zinc-900/60 pb-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300 font-bold text-sm shadow shadow-black/20 shrink-0">
                {email.fromName.charAt(0)}
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-zinc-100 truncate">{email.fromName}</h2>
                <div className="text-xs text-zinc-500 mt-0.5 flex items-center gap-1">
                  <span>From: {email.fromEmail}</span>
                  <span className="text-zinc-700">&bull;</span>
                  <span>To: {email.toEmail}</span>
                </div>
              </div>
            </div>
            
            <div className="text-right shrink-0">
              <span className="text-xs text-zinc-500 flex items-center gap-1.5 justify-end">
                <Clock className="w-3.5 h-3.5" />
                {new Date(email.date).toLocaleString()}
              </span>
            </div>
          </div>

          <h1 className="text-xl font-bold text-zinc-50 mt-4 leading-tight">
            {email.subject}
          </h1>
        </div>

        {/* Priority grading Alert Box */}
        {email.priority === "high" && email.priorityReason && (
          <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 flex items-start gap-3 shadow shadow-amber-500/2">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">AI Triage Insight</h4>
              <p className="text-xs text-zinc-400 leading-relaxed mt-1">{email.priorityReason}</p>
            </div>
          </div>
        )}

        {activeTab === "read" && (
          <>
            {email.bodyHtml ? (
              <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm overflow-x-hidden w-full text-zinc-900">
                <iframe
                  title="Email HTML Body"
                  srcDoc={`
                    <!DOCTYPE html>
                    <html>
                      <head>
                        <meta charset="utf-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1">
                        <style>
                          * { box-sizing: border-box; }
                          html, body {
                            margin: 0;
                            padding: 0;
                            width: 100%;
                            background-color: #ffffff;
                          }
                          body {
                            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                            font-size: 14px;
                            line-height: 1.65;
                            color: #222222;
                            word-wrap: break-word;
                            overflow-wrap: break-word;
                            background-color: #ffffff;
                            padding: 4px 2px;
                          }
                          a { color: #1a0dab; text-decoration: none; font-weight: 500; }
                          a:hover { text-decoration: underline; }
                          img { max-width: 100% !important; height: auto; border-radius: 4px; margin: 8px 0; display: inline-block; }
                          p { margin: 0 0 1em 0; }
                          p:last-child { margin-bottom: 0; }
                          blockquote {
                            border-left: 3px solid #e5e7eb;
                            margin: 1em 0;
                            padding-left: 1em;
                            color: #555555;
                          }
                          ul, ol { margin: 0 0 1em 0; padding-left: 1.5em; }
                          table { max-width: 100% !important; border-collapse: collapse; }
                          td, th { padding: 6px; }
                          pre, code {
                            background-color: #f4f4f5;
                            border: 1px solid #e4e4e7;
                            border-radius: 6px;
                            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
                            font-size: 12px;
                            color: #1f2937;
                          }
                          pre { padding: 12px; overflow-x: auto; }
                          code { padding: 2px 4px; }
                          h1,h2,h3,h4 { color: #111827; margin: 0 0 0.75em 0; }
                          hr { border: 0; border-top: 1px solid #e5e7eb; margin: 1.5em 0; }
                          div[style] { max-width: 100% !important; }
                        </style>
                      </head>
                      <body>${email.bodyHtml}</body>
                    </html>
                  `}
                  sandbox="allow-popups allow-popups-to-escape-sandbox"
                  className="w-full border-0 bg-white block min-h-[420px]"
                  onLoad={(e) => {
                    try {
                      const iframe = e.currentTarget;
                      const resize = () => {
                        const body = iframe.contentDocument?.body;
                        const html = iframe.contentDocument?.documentElement;
                        if (body && html) {
                          const height = Math.max(
                            body.scrollHeight,
                            body.offsetHeight,
                            html.clientHeight,
                            html.scrollHeight,
                            html.offsetHeight
                          );
                          iframe.style.height = `${height + 24}px`;
                        }
                      };
                      resize();
                      // Try again after images load
                      setTimeout(resize, 400);
                      setTimeout(resize, 1000);
                    } catch (err) {
                      console.error("Iframe resize error:", err);
                    }
                  }}
                />
              </div>
            ) : (
              <div className="bg-zinc-900/20 border border-zinc-900/60 rounded-2xl p-6 shadow-sm overflow-x-hidden w-full">
                <div className="prose prose-invert max-w-none text-sm text-zinc-300 whitespace-pre-wrap break-words leading-relaxed w-full overflow-x-hidden">
                  {email.body}
                </div>
              </div>
            )}

            {/* Gmail-style quick action buttons at the bottom */}
            <div className="flex gap-3 pt-6 border-t border-zinc-800/60 mt-8">
              <button
                onClick={() => {
                  setIsReplyOpen(true);
                  setIsForwardOpen(false);
                }}
                className="flex items-center gap-2 px-5 py-2 border border-zinc-800/80 hover:bg-zinc-850 hover:text-zinc-200 text-zinc-400 hover:border-zinc-700 rounded-full text-xs font-semibold transition-all cursor-pointer"
              >
                <CornerUpLeft className="w-4 h-4 text-zinc-500" />
                <span>Reply</span>
              </button>
              <button
                onClick={() => {
                  setIsForwardOpen(true);
                  setIsReplyOpen(false);
                }}
                className="flex items-center gap-2 px-5 py-2 border border-zinc-800/80 hover:bg-zinc-850 hover:text-zinc-200 text-zinc-400 hover:border-zinc-700 rounded-full text-xs font-semibold transition-all cursor-pointer"
              >
                <Forward className="w-4 h-4 text-zinc-500" />
                <span>Forward</span>
              </button>
            </div>

            {/* Inline Gmail-style Forward Composer */}
            {isForwardOpen && (
              <div className="border border-teal-500/20 bg-teal-500/2 rounded-2xl p-5 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200 mt-6">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <div className="flex items-center gap-2 text-teal-400">
                    <Forward className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Forwarding Message</span>
                  </div>
                  <button 
                    onClick={() => {
                      setIsForwardOpen(false);
                      setForwardTo("");
                      setForwardNote("");
                    }} 
                    className="text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="space-y-3">
                  {/* Recipient block */}
                  <div className="flex items-center gap-3 bg-zinc-950/40 px-4 py-3 rounded-xl border border-zinc-850 focus-within:border-teal-500/30 transition-all">
                    <span className="text-xs text-zinc-500 font-bold shrink-0">To:</span>
                    <input
                      ref={forwardInputRef}
                      type="email"
                      value={forwardTo}
                      onChange={(e) => setForwardTo(e.target.value)}
                      placeholder="recipient@domain.com"
                      className="w-full bg-transparent text-xs text-zinc-200 placeholder-zinc-650 focus:outline-none"
                    />
                  </div>

                  {/* Body/Note input */}
                  <div className="bg-zinc-950/40 p-4 rounded-xl border border-zinc-850 focus-within:border-teal-500/30 transition-all">
                    <textarea
                      value={forwardNote}
                      onChange={(e) => setForwardNote(e.target.value)}
                      placeholder="Add a comment or note above the forwarded message..."
                      rows={5}
                      className="w-full bg-transparent text-xs text-zinc-200 placeholder-zinc-650 focus:outline-none resize-none leading-relaxed"
                    />
                  </div>
                </div>

                {/* Actions row */}
                <div className="flex items-center justify-between pt-1">
                  <div className="text-[10px] text-zinc-500 font-medium">
                    The original email content will be appended below.
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setIsForwardOpen(false);
                        setForwardTo("");
                        setForwardNote("");
                      }}
                      className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850 rounded-xl transition-all cursor-pointer"
                    >
                      Discard
                    </button>
                    <button
                      onClick={handleForward}
                      disabled={!forwardTo || isForwarding}
                      className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-600 disabled:bg-zinc-850 disabled:text-zinc-600 text-white text-xs font-bold shadow-md shadow-teal-500/10 transition-all cursor-pointer"
                    >
                      {isForwarding ? (
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      <span>Send</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Inline Gmail-style Reply Composer */}
            {isReplyOpen && (
              <div className="border border-indigo-500/20 bg-indigo-500/2 rounded-2xl p-5 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200 mt-6">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <div className="flex items-center gap-2 text-indigo-400">
                    <CornerUpLeft className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Reply Message</span>
                  </div>
                  <button 
                    onClick={() => {
                      setIsReplyOpen(false);
                      setReplyBody("");
                    }} 
                    className="text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="space-y-3">
                  {/* Recipient block */}
                  <div className="flex items-center gap-3 bg-zinc-950/40 px-4 py-3 rounded-xl border border-zinc-850 transition-all text-xs text-zinc-400">
                    <span className="text-zinc-500 font-bold shrink-0">To:</span>
                    <span>{email.fromName} &lt;{email.fromEmail}&gt;</span>
                  </div>

                  {/* Body input */}
                  <div className="bg-zinc-950/40 p-4 rounded-xl border border-zinc-855 focus-within:border-indigo-500/30 transition-all relative">
                    <textarea
                      ref={replyInputRef}
                      value={replyBody}
                      onChange={(e) => setReplyBody(e.target.value)}
                      placeholder={`Reply to ${email.fromName}...`}
                      rows={6}
                      className="w-full bg-transparent text-xs text-zinc-200 placeholder-zinc-650 focus:outline-none resize-none leading-relaxed"
                    />
                  </div>
                </div>

                {/* Actions row */}
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    onClick={() => {
                      setIsReplyOpen(false);
                      setReplyBody("");
                    }}
                    className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850 rounded-xl transition-all cursor-pointer"
                  >
                    Discard
                  </button>
                  <button
                    onClick={handleSendReply}
                    disabled={!replyBody || isSendingReply}
                    className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-650 disabled:bg-zinc-850 disabled:text-zinc-600 text-white text-xs font-bold shadow-md shadow-indigo-500/10 transition-all cursor-pointer"
                  >
                    {isSendingReply ? (
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>Send</span>
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === "summary" && (
          <div className="bg-zinc-900/10 border border-indigo-500/10 rounded-2xl p-6 relative overflow-hidden backdrop-blur-md shadow-sm">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl pointer-events-none" />
            
            <div className="flex items-center gap-2 mb-4 border-b border-zinc-900 pb-3">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-bold text-zinc-200">AI Thread Summary</h3>
            </div>

            {isLoadingSummary ? (
              <div className="flex flex-col items-center justify-center py-12 text-zinc-500 space-y-2">
                <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-medium">Synthesizing core action items...</span>
              </div>
            ) : (
              <div className="text-sm text-zinc-300 leading-relaxed space-y-3 whitespace-pre-line">
                {aiSummary || email.summary || "Generating summary..."}
              </div>
            )}
          </div>
        )}

        {activeTab === "reply" && (
          <div className="space-y-6">
            
            {/* Tone Selector & Custom Instructions */}
            <div className="bg-zinc-900/20 border border-zinc-900 p-5 rounded-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                <h3 className="text-sm font-bold text-zinc-200">Smart Reply Creator</h3>
                
                {/* Tone Select */}
                <select
                  value={draftTone}
                  onChange={(e) => setDraftTone(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-semibold px-2 py-1 focus:outline-none text-zinc-300"
                >
                  <option value="professional">Tone: Professional</option>
                  <option value="friendly">Tone: Friendly</option>
                  <option value="casual">Tone: Casual</option>
                  <option value="urgent">Tone: Urgent</option>
                </select>
              </div>

              {/* Action Presets */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {isLoadingSuggestions ? (
                  // Skeleton loading state
                  [1,2,3].map((i) => (
                    <div key={i} className="py-2.5 px-3 rounded-xl bg-zinc-900 border border-zinc-800/80 animate-pulse h-9" />
                  ))
                ) : (smartSuggestions || [
                  { label: "Acknowledge & Confirm", prompt: "Acknowledge receipt and confirm we will review this soon." },
                  { label: "Request More Time", prompt: "Request more time to review and schedule a meeting next week." },
                  { label: "Decline Politely", prompt: "Politely decline the request, noting a busy schedule." }
                ]).map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => handleGenerateDraft(preset.prompt)}
                    disabled={isDrafting}
                    className="py-2.5 px-3 rounded-xl bg-zinc-900 border border-zinc-800/80 hover:border-indigo-500/30 hover:bg-zinc-850 hover:text-indigo-400 text-zinc-400 transition-all text-xs font-semibold text-center leading-snug cursor-pointer disabled:opacity-50"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Custom Prompt Box */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Tell AI what you want to write..."
                  className="flex-1 px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50"
                />
                <button
                  onClick={() => handleGenerateDraft()}
                  disabled={isDrafting || !customPrompt}
                  className="px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shrink-0"
                >
                  Draft Reply
                </button>
              </div>
            </div>

            {/* Always visible Reply Composer below creator tools */}
            <div className="border border-indigo-500/20 bg-indigo-500/2 rounded-2xl p-5 space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-zinc-805 pb-3">
                <div className="flex items-center gap-2 text-indigo-400">
                  <CornerUpLeft className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Reply Draft Composer</span>
                </div>
              </div>
              
              <div className="space-y-3">
                {/* Recipient block */}
                <div className="flex items-center gap-3 bg-zinc-950/40 px-4 py-3 rounded-xl border border-zinc-850 transition-all text-xs text-zinc-400">
                  <span className="text-zinc-500 font-bold shrink-0">To:</span>
                  <span>{email.fromName} &lt;{email.fromEmail}&gt;</span>
                </div>

                {/* Body input */}
                <div className="bg-zinc-950/40 p-4 rounded-xl border border-zinc-855 focus-within:border-indigo-500/30 transition-all relative">
                  {isDrafting && (
                    <div className="absolute inset-0 bg-zinc-950/70 rounded-xl flex items-center justify-center text-zinc-400 text-xs font-medium space-x-2 z-10">
                      <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                      <span>AI is drafting your response...</span>
                    </div>
                  )}
                  <textarea
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    placeholder={`Edit the draft response here or write your own...`}
                    rows={8}
                    className="w-full bg-transparent text-xs text-zinc-200 placeholder-zinc-650 focus:outline-none resize-none leading-relaxed min-h-[160px]"
                  />
                </div>
              </div>

              {/* Actions row */}
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  onClick={() => setReplyBody("")}
                  className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850 rounded-xl transition-all cursor-pointer"
                >
                  Clear Draft
                </button>
                <button
                  onClick={handleSendReply}
                  disabled={!replyBody || isSendingReply || isDrafting}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-650 disabled:bg-zinc-850 disabled:text-zinc-600 text-white text-xs font-bold shadow-md shadow-indigo-500/10 transition-all cursor-pointer"
                >
                  {isSendingReply ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>Send</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
