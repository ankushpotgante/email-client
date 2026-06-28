"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

export interface Account {
  id: string;
  name: string;
  type: string;
  email: string;
}

export interface Email {
  id: string;
  accountId: string;
  fromEmail: string;
  fromName: string;
  toEmail: string;
  subject: string;
  body: string;
  date: string;
  folder: string;
  labels: string[];
  read: boolean;
  priority: "high" | "medium" | "low";
  priorityReason?: string;
  summary?: string;
}

interface EmailContextType {
  accounts: Account[];
  emails: Email[];
  activeAccountId: string; // 'all' or specific accountId
  activeFolder: string; // inbox, archived, sent, trash
  activeEmailId: string | null;
  searchQuery: string;
  priorityFocus: boolean; // only show high priority
  isComposeOpen: boolean;
  isLoadingEmails: boolean;
  isLoadingSummary: boolean;
  summaryCache: Record<string, string>; // emailId -> summary text
  
  // Actions
  setActiveAccountId: (id: string) => void;
  setActiveFolder: (folder: string) => void;
  setActiveEmailId: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  setPriorityFocus: (focus: boolean) => void;
  setIsComposeOpen: (open: boolean) => void;
  
  fetchAccounts: () => Promise<void>;
  fetchEmails: () => Promise<void>;
  moveToFolder: (emailIds: string[], folder: string) => Promise<void>;
  toggleReadStatus: (emailIds: string[], read: boolean) => Promise<void>;
  sendEmail: (accountId: string, toEmail: string, subject: string, body: string) => Promise<boolean>;
  getAISummary: (emailId: string) => Promise<string>;
  triggerAITriage: (emailId: string) => Promise<void>;
  generateAIDraft: (emailId: string, prompt: string, tone: string) => Promise<string>;
  addAccount: (name: string, email: string, type: string, password?: string) => Promise<boolean>;
  syncEmails: (accountId: string) => Promise<{ success: boolean; count: number; error?: string }>;
}

const EmailContext = createContext<EmailContextType | undefined>(undefined);

const API_BASE = "/api";

export const EmailProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [emails, setEmails] = useState<Email[]>([]);
  const [activeAccountId, setActiveAccountId] = useState<string>("all");
  const [activeFolder, setActiveFolder] = useState<string>("inbox");
  const [activeEmailId, setActiveEmailId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [priorityFocus, setPriorityFocus] = useState<boolean>(false);
  const [isComposeOpen, setIsComposeOpen] = useState<boolean>(false);
  const [isLoadingEmails, setIsLoadingEmails] = useState<boolean>(false);
  const [isLoadingSummary, setIsLoadingSummary] = useState<boolean>(false);
  const [summaryCache, setSummaryCache] = useState<Record<string, string>>({});

  // Fetch all accounts
  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/emails/accounts`);
      if (res.ok) {
        const data = await res.json();
        setAccounts(data);
      }
    } catch (e) {
      console.error("Failed to fetch accounts:", e);
    }
  }, []);

  // Fetch emails matching active filters
  const fetchEmails = useCallback(async () => {
    setIsLoadingEmails(true);
    try {
      const params = new URLSearchParams();
      if (activeAccountId && activeAccountId !== "all") {
        params.append("account", activeAccountId);
      }
      if (activeFolder) {
        params.append("folder", activeFolder);
      }
      if (searchQuery) {
        params.append("q", searchQuery);
      }
      
      const res = await fetch(`${API_BASE}/emails?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setEmails(data);
      }
    } catch (e) {
      console.error("Failed to fetch emails:", e);
    } finally {
      setIsLoadingEmails(false);
    }
  }, [activeAccountId, activeFolder, searchQuery]);

  // Load accounts initially
  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  // Load emails when filters change
  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  // Move emails to folder (Archive, Delete, Inbox, etc.)
  const moveToFolder = async (emailIds: string[], folder: string) => {
    try {
      const res = await fetch(`${API_BASE}/emails/folder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailIds, folder })
      });
      if (res.ok) {
        // Optimistically update local list
        setEmails((prev) => prev.filter((e) => !emailIds.includes(e.id)));
        if (activeEmailId && emailIds.includes(activeEmailId)) {
          setActiveEmailId(null);
        }
      }
    } catch (e) {
      console.error("Failed to move emails:", e);
    }
  };

  // Toggle read/unread status
  const toggleReadStatus = async (emailIds: string[], read: boolean) => {
    try {
      const res = await fetch(`${API_BASE}/emails/read?read=${read}&emailIds=${emailIds.join("&emailIds=")}`, {
        method: "POST"
      });
      if (res.ok) {
        // Update local list state
        setEmails((prev) =>
          prev.map((e) => (emailIds.includes(e.id) ? { ...e, read } : e))
        );
      }
    } catch (e) {
      console.error("Failed to update read status:", e);
    }
  };

  // Compose and send email
  const sendEmail = async (accountId: string, toEmail: string, subject: string, body: string) => {
    try {
      const res = await fetch(`${API_BASE}/emails/compose`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId, toEmail, subject, body })
      });
      if (res.ok) {
        if (activeFolder === "sent") {
          fetchEmails();
        }
        return true;
      }
      return false;
    } catch (e) {
      console.error("Failed to send email:", e);
      return false;
    }
  };

  // Fetch AI Summary of an email thread
  const getAISummary = async (emailId: string): Promise<string> => {
    if (summaryCache[emailId]) {
      return summaryCache[emailId];
    }
    
    setIsLoadingSummary(true);
    try {
      const res = await fetch(`${API_BASE}/ai/summarize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailId })
      });
      
      if (res.ok) {
        const data = await res.json();
        const summary = data.summary || "No summary generated.";
        setSummaryCache((prev) => ({ ...prev, [emailId]: summary }));
        
        // Update specific email in local list to save the state
        setEmails((prev) =>
          prev.map((e) => (e.id === emailId ? { ...e, summary } : e))
        );
        return summary;
      }
      return "Failed to compile AI summary.";
    } catch (e) {
      console.error("Failed to fetch summary:", e);
      return "Connection error while generating summary.";
    } finally {
      setIsLoadingSummary(false);
    }
  };

  // Re-run AI Triage for email
  const triggerAITriage = async (emailId: string) => {
    try {
      const res = await fetch(`${API_BASE}/ai/prioritize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailId })
      });
      if (res.ok) {
        const data = await res.json();
        // Update local list
        setEmails((prev) =>
          prev.map((e) =>
            e.id === emailId
              ? { ...e, priority: data.priority, priorityReason: data.priorityReason }
              : e
          )
        );
      }
    } catch (e) {
      console.error("Failed to run triage:", e);
    }
  };

  // Generate an AI draft response
  const generateAIDraft = async (emailId: string, prompt: string, tone: string): Promise<string> => {
    try {
      const res = await fetch(`${API_BASE}/ai/draft-reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailId, prompt, tone })
      });
      if (res.ok) {
        const data = await res.json();
        return data.body || "";
      }
      return "Failed to generate AI draft.";
    } catch (e) {
      console.error("Failed to generate draft:", e);
      return "Connection error while drafting reply.";
    }
  };

  const addAccount = async (name: string, email: string, type: string, password?: string): Promise<boolean> => {
    try {
      const id = `${type}-${name.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${Math.floor(Math.random() * 1000)}`;
      const res = await fetch(`${API_BASE}/emails/accounts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, name, type, email, password })
      });
      if (res.ok) {
        await fetchAccounts();
        setActiveAccountId(id);
        return true;
      }
      return false;
    } catch (e) {
      console.error("Failed to add account:", e);
      return false;
    }
  };

  const syncEmails = async (accountId: string): Promise<{ success: boolean; count: number; error?: string }> => {
    try {
      const res = await fetch(`${API_BASE}/emails/${accountId}/sync`, {
        method: "POST"
      });
      if (res.ok) {
        const data = await res.json();
        await fetchEmails();
        return { success: true, count: data.synced || 0 };
      } else {
        const errData = await res.json();
        return { success: false, count: 0, error: errData.detail || "Sync failed" };
      }
    } catch (e) {
      console.error("Failed to sync emails:", e);
      return { success: false, count: 0, error: "Connection error" };
    }
  };

  return (
    <EmailContext.Provider
      value={{
        accounts,
        emails,
        activeAccountId,
        activeFolder,
        activeEmailId,
        searchQuery,
        priorityFocus,
        isComposeOpen,
        isLoadingEmails,
        isLoadingSummary,
        summaryCache,
        setActiveAccountId,
        setActiveFolder,
        setActiveEmailId,
        setSearchQuery,
        setPriorityFocus,
        setIsComposeOpen,
        fetchAccounts,
        fetchEmails,
        moveToFolder,
        toggleReadStatus,
        sendEmail,
        getAISummary,
        triggerAITriage,
        generateAIDraft,
        addAccount,
        syncEmails
      }}
    >
      {children}
    </EmailContext.Provider>
  );
};

export const useEmailStore = () => {
  const context = useContext(EmailContext);
  if (context === undefined) {
    throw new Error("useEmailStore must be used within an EmailProvider");
  }
  return context;
};
