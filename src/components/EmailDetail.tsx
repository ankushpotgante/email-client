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
  AlertCircle
} from "lucide-react";
import canvasConfetti from "canvas-confetti";

export default function EmailDetail() {
  const {
    activeEmailId,
    emails,
    isLoadingSummary,
    getAISummary,
    generateAIDraft,
    moveToFolder,
    toggleReadStatus,
    setIsComposeOpen
  } = useEmailStore();

  const [aiSummary, setAiSummary] = useState<string>("");
  const [draftTone, setDraftTone] = useState<string>("professional");
  const [customPrompt, setCustomPrompt] = useState<string>("");
  const [generatedDraft, setGeneratedDraft] = useState<string>("");
  const [isDrafting, setIsDrafting] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"read" | "summary" | "reply">("read");

  // Find the currently selected email
  const email = emails.find((e) => e.id === activeEmailId);

  // Reset tab and drafts when email selection changes
  useEffect(() => {
    setAiSummary("");
    setGeneratedDraft("");
    setCustomPrompt("");
    setActiveTab("read");
  }, [activeEmailId]);

  if (!email) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-zinc-500 bg-zinc-950/40 text-center select-none h-full">
        <Mail className="w-12 h-12 text-zinc-800 mb-4 animate-bounce" />
        <h3 className="text-zinc-300 font-bold text-sm">Select a message</h3>
        <p className="text-xs text-zinc-500 mt-1 max-w-xs leading-relaxed">
          Choose an email from your feed to view attachments, read conversations, or write Gemini draft replies.
        </p>
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

  // Generate Reply Draft using Gemini
  const handleGenerateDraft = async (promptOverride?: string) => {
    setIsDrafting(true);
    setActiveTab("reply");
    try {
      const promptText = promptOverride || customPrompt;
      const draft = await generateAIDraft(email.id, promptText, draftTone);
      setGeneratedDraft(draft);
    } catch (e) {
      console.error(e);
    } finally {
      setIsDrafting(false);
    }
  };

  // Preset reply triggers
  const replyPresets = [
    { label: "Acknowledge & Confirm", prompt: "Acknowledge receipt and confirm we will review this soon." },
    { label: "Politely Request Delay", prompt: "Request more time to review and schedule a meeting next week." },
    { label: "Decline Invitation", prompt: "Politely decline the request, noting a busy schedule." }
  ];

  // Insert generated draft into main Compose window
  const handleInsertIntoComposer = () => {
    // We will save the draft into window state or localStorage so the ComposeModal can fetch it!
    if (typeof window !== "undefined") {
      localStorage.setItem("auramail_draft_to", email.fromEmail);
      localStorage.setItem("auramail_draft_subject", `Re: ${email.subject}`);
      localStorage.setItem("auramail_draft_body", generatedDraft);
    }
    setIsComposeOpen(true);
    canvasConfetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.8 }
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950/40 relative">
      {/* Top Toolbar Action Buttons */}
      <div className="p-4 border-b border-zinc-900 bg-zinc-950/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
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
            onClick={() => setActiveTab("reply")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "reply"
                ? "bg-zinc-800 text-zinc-100 shadow"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
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
              <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">Gemini Triage Insight</h4>
              <p className="text-xs text-zinc-400 leading-relaxed mt-1">{email.priorityReason}</p>
            </div>
          </div>
        )}

        {/* Active Content Tabs */}
        {activeTab === "read" && (
          <div className="bg-zinc-900/20 border border-zinc-900/60 rounded-2xl p-6 shadow-sm">
            <div className="prose prose-invert max-w-none text-sm text-zinc-300 whitespace-pre-line leading-relaxed">
              {email.body}
            </div>
          </div>
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
                {replyPresets.map((preset) => (
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
                  placeholder="Tell Gemini what you want to write..."
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

            {/* Generated Output Preview */}
            {(isDrafting || generatedDraft) && (
              <div className="bg-zinc-900/10 border border-zinc-900 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                  <span className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Gemini Draft Output</span>
                  </span>
                  
                  {generatedDraft && !isDrafting && (
                    <button
                      onClick={handleInsertIntoComposer}
                      className="flex items-center gap-1 text-xs font-bold bg-indigo-500 hover:bg-indigo-600 text-white py-1 px-3 rounded-lg transition-colors cursor-pointer"
                    >
                      <span>Insert to Composer</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {isDrafting ? (
                  <div className="flex flex-col items-center justify-center py-12 text-zinc-500 space-y-2">
                    <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-medium">Generating email response...</span>
                  </div>
                ) : (
                  <div className="bg-zinc-950/40 p-4 border border-zinc-900 rounded-xl">
                    <pre className="text-xs text-zinc-300 font-sans whitespace-pre-wrap leading-relaxed">
                      {generatedDraft}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
