"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

export interface Account {
  id: string;
  name: string;
  type: string;
  email: string;
  password?: string;
}

export interface Email {
  id: string;
  accountId: string;
  fromEmail: string;
  fromName: string;
  toEmail: string;
  subject: string;
  body: string;
  bodyHtml?: string;
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
  
  // Authentication states
  token: string | null;
  user: { id: string; username: string } | null;
  isAuthLoading: boolean;
  
  // Actions
  setActiveAccountId: (id: string) => void;
  setActiveFolder: (folder: string) => void;
  setActiveEmailId: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  setPriorityFocus: (focus: boolean) => void;
  setIsComposeOpen: (open: boolean) => void;
  
  login: (username: string, password: string) => Promise<boolean>;
  register: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  
  hasMoreEmails: boolean;
  loadMoreEmails: () => Promise<void>;
  fetchAccounts: () => Promise<void>;
  fetchEmails: () => Promise<void>;
  moveToFolder: (emailIds: string[], folder: string) => Promise<void>;
  toggleReadStatus: (emailIds: string[], read: boolean) => Promise<void>;
  sendEmail: (accountId: string, toEmail: string, subject: string, body: string) => Promise<boolean>;
  forwardEmail: (emailId: string, toEmail: string, note: string) => Promise<boolean>;
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
  const [emailPage, setEmailPage] = useState<number>(0);
  const [hasMoreEmails, setHasMoreEmails] = useState<boolean>(false);
  const PAGE_SIZE = 25;

  // Auth local states
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<{ id: string; username: string } | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);

  // Initialize and load auth state from local storage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const cachedToken = localStorage.getItem("auramail_token");
      const cachedUser = localStorage.getItem("auramail_user");
      if (cachedToken && cachedUser) {
        setToken(cachedToken);
        setUser(JSON.parse(cachedUser));
      }
      setIsAuthLoading(false);
    }
  }, []);

  // Helper to generate auth headers
  const getRequestHeaders = useCallback((extraHeaders: Record<string, string> = {}) => {
    const headers: Record<string, string> = { ...extraHeaders };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
  }, [token]);

  // Auth Operations
  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      if (res.ok) {
        const data = await res.json();
        setToken(data.access_token);
        setUser(data.user);
        localStorage.setItem("auramail_token", data.access_token);
        localStorage.setItem("auramail_user", JSON.stringify(data.user));
        return true;
      }
      return false;
    } catch (e) {
      console.error("Login failed:", e);
      return false;
    }
  };

  const register = async (username: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      if (res.ok) {
        const data = await res.json();
        setToken(data.access_token);
        setUser(data.user);
        localStorage.setItem("auramail_token", data.access_token);
        localStorage.setItem("auramail_user", JSON.stringify(data.user));
        return true;
      }
      return false;
    } catch (e) {
      console.error("Registration failed:", e);
      return false;
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setAccounts([]);
    setEmails([]);
    setActiveEmailId(null);
    setActiveAccountId("all");
    setActiveFolder("inbox");
    localStorage.removeItem("auramail_token");
    localStorage.removeItem("auramail_user");
    localStorage.removeItem("auramail_local_accounts");
  };

  // Fetch emails matching active filters
  const fetchEmails = useCallback(async () => {
    if (!token) return;
    setIsLoadingEmails(true);
    setEmailPage(0);
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
      params.append("limit", String(PAGE_SIZE));
      params.append("offset", "0");
      
      const res = await fetch(`${API_BASE}/emails?${params.toString()}`, {
        headers: getRequestHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setEmails(data);
        setHasMoreEmails(data.length === PAGE_SIZE);
      }
    } catch (e) {
      console.error("Failed to fetch emails:", e);
    } finally {
      setIsLoadingEmails(false);
    }
  }, [token, activeAccountId, activeFolder, searchQuery, getRequestHeaders]);

  // Fetch all accounts
  const fetchAccounts = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/emails/accounts`, {
        headers: getRequestHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setAccounts(data);

        // Self-healing database restoration for serverless runtimes
        if (typeof window !== "undefined") {
          const cached = localStorage.getItem("auramail_local_accounts");
          if (cached) {
            const localAccs = JSON.parse(cached);
            let healedAny = false;

            for (const acc of localAccs) {
              // If this cached account is NOT in the database accounts fetched from the backend, restore it!
              const exists = data.some((a: any) => a.email === acc.email);
              if (!exists) {
                console.log(`Self-healing: Restoring account ${acc.email} in backend...`);
                try {
                  const addRes = await fetch(`${API_BASE}/emails/accounts`, {
                    method: "POST",
                    headers: getRequestHeaders({ "Content-Type": "application/json" }),
                    body: JSON.stringify({
                      id: acc.id,
                      name: acc.name,
                      type: acc.type,
                      email: acc.email,
                      password: acc.password
                    })
                  });
                  if (addRes.ok) {
                    healedAny = true;
                    // Trigger sync in background
                    fetch(`${API_BASE}/emails/${acc.id}/sync`, {
                      method: "POST",
                      headers: getRequestHeaders()
                    }).catch(err => console.error("Self-healing background sync failed:", err));
                  }
                } catch (addErr) {
                  console.error(`Self-healing restoration failed for ${acc.email}:`, addErr);
                }
              }
            }

            if (healedAny) {
              // Refetch accounts to reflect restored accounts in UI
              const freshRes = await fetch(`${API_BASE}/emails/accounts`, {
                headers: getRequestHeaders()
              });
              if (freshRes.ok) {
                const freshData = await freshRes.json();
                setAccounts(freshData);
                // Trigger reload of emails
                fetchEmails();
              }
            }
          }
        }
      }
    } catch (e) {
      console.error("Failed to fetch accounts:", e);
    }
  }, [token, getRequestHeaders, fetchEmails]);

  // Load more emails (pagination)
  const loadMoreEmails = useCallback(async () => {
    if (!token || isLoadingEmails) return;
    const nextPage = emailPage + 1;
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
      params.append("limit", String(PAGE_SIZE));
      params.append("offset", String(nextPage * PAGE_SIZE));
      
      const res = await fetch(`${API_BASE}/emails?${params.toString()}`, {
        headers: getRequestHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setEmails(prev => [...prev, ...data]);
        setEmailPage(nextPage);
        setHasMoreEmails(data.length === PAGE_SIZE);
      }
    } catch (e) {
      console.error("Failed to load more emails:", e);
    } finally {
      setIsLoadingEmails(false);
    }
  }, [token, activeAccountId, activeFolder, searchQuery, emailPage, isLoadingEmails, getRequestHeaders]);

  // Load accounts initially
  useEffect(() => {
    if (token) {
      fetchAccounts();
    }
  }, [token, fetchAccounts]);

  // Load emails when filters change
  useEffect(() => {
    if (token) {
      fetchEmails();
    }
  }, [token, fetchEmails]);

  // Move emails to folder (Archive, Delete, Inbox, etc.)
  const moveToFolder = async (emailIds: string[], folder: string) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/emails/folder`, {
        method: "POST",
        headers: getRequestHeaders({ "Content-Type": "application/json" }),
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
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/emails/read?read=${read}&emailIds=${emailIds.join("&emailIds=")}`, {
        method: "POST",
        headers: getRequestHeaders()
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
    if (!token) return false;
    try {
      const res = await fetch(`${API_BASE}/emails/compose`, {
        method: "POST",
        headers: getRequestHeaders({ "Content-Type": "application/json" }),
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

  // Forward email
  const forwardEmail = async (emailId: string, toEmail: string, note: string) => {
    if (!token) return false;
    try {
      const res = await fetch(`${API_BASE}/emails/forward`, {
        method: "POST",
        headers: getRequestHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ emailId, toEmail, note })
      });
      if (res.ok) {
        if (activeFolder === "sent") {
          fetchEmails();
        }
        return true;
      }
      return false;
    } catch (e) {
      console.error("Failed to forward email:", e);
      return false;
    }
  };

  // Fetch AI Summary of an email thread
  const getAISummary = async (emailId: string): Promise<string> => {
    if (!token) return "";
    if (summaryCache[emailId]) {
      return summaryCache[emailId];
    }
    
    setIsLoadingSummary(true);
    try {
      const res = await fetch(`${API_BASE}/ai/summarize`, {
        method: "POST",
        headers: getRequestHeaders({ "Content-Type": "application/json" }),
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
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/ai/prioritize`, {
        method: "POST",
        headers: getRequestHeaders({ "Content-Type": "application/json" }),
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
    if (!token) return "";
    try {
      const res = await fetch(`${API_BASE}/ai/draft-reply`, {
        method: "POST",
        headers: getRequestHeaders({ "Content-Type": "application/json" }),
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
    if (!token) return false;
    try {
      const id = `${type}-${name.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${Math.floor(Math.random() * 1000)}`;
      const res = await fetch(`${API_BASE}/emails/accounts`, {
        method: "POST",
        headers: getRequestHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ id, name, type, email, password })
      });
      if (res.ok) {
        // Save to localStorage cache for self-healing session persistence
        try {
          const cached = localStorage.getItem("auramail_local_accounts");
          const localAccs = cached ? JSON.parse(cached) : [];
          // Avoid duplicate emails
          const filtered = localAccs.filter((a: any) => a.email !== email);
          filtered.push({ id, name, type, email, password });
          localStorage.setItem("auramail_local_accounts", JSON.stringify(filtered));
        } catch (err) {
          console.error("Failed to cache account locally:", err);
        }

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
    if (!token) return { success: false, count: 0, error: "Unauthorized" };
    try {
      const res = await fetch(`${API_BASE}/emails/${accountId}/sync`, {
        method: "POST",
        headers: getRequestHeaders()
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
        token,
        user,
        isAuthLoading,
        hasMoreEmails,
        setActiveAccountId,
        setActiveFolder,
        setActiveEmailId,
        setSearchQuery,
        setPriorityFocus,
        setIsComposeOpen,
        login,
        register,
        logout,
        fetchAccounts,
        fetchEmails,
        loadMoreEmails,
        moveToFolder,
        toggleReadStatus,
        sendEmail,
        forwardEmail,
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
