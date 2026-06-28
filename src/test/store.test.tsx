import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { EmailProvider, useEmailStore } from "../lib/store/store";
import React from "react";

// Mock accounts list
const mockAccounts = [
  { id: "gmail", name: "Gmail", type: "gmail", email: "alex@gmail.com" }
];

// Mock emails list
const mockEmails = [
  { 
    id: "gm-1", 
    accountId: "gmail", 
    fromEmail: "investors@vc.com", 
    fromName: "Sarah", 
    toEmail: "alex@gmail.com", 
    subject: "Seed Term Sheet", 
    body: "Please sign.", 
    date: "2026-06-28T00:00:00Z", 
    folder: "inbox", 
    labels: [], 
    read: false, 
    priority: "high" 
  }
];

// Setup global mock for fetch API
global.fetch = vi.fn().mockImplementation((url: string) => {
  if (url.includes("/emails/accounts")) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(mockAccounts)
    } as Response);
  }
  if (url.includes("/emails?")) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(mockEmails)
    } as Response);
  }
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ success: true })
  } as Response);
});

// Helper component that consumes store values for assertions
const TestComponent = () => {
  const { 
    accounts, 
    emails, 
    activeAccountId, 
    activeFolder, 
    priorityFocus, 
    setPriorityFocus 
  } = useEmailStore();
  
  return (
    <div>
      <span data-testid="account-count">{accounts.length}</span>
      <span data-testid="email-count">{emails.length}</span>
      <span data-testid="active-account">{activeAccountId}</span>
      <span data-testid="active-folder">{activeFolder}</span>
      <span data-testid="priority-focus">{priorityFocus ? "on" : "off"}</span>
      <button data-testid="toggle-priority" onClick={() => setPriorityFocus(true)}>Toggle</button>
    </div>
  );
};

describe("React Store Context API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    if (typeof window !== "undefined") {
      localStorage.setItem("auramail_token", "mock-access-token-12345");
      localStorage.setItem("auramail_user", JSON.stringify({ id: "mock-user-id", username: "mockuser" }));
    }
  });

  it("initializes defaults and fetches API data on load", async () => {
    render(
      <EmailProvider>
        <TestComponent />
      </EmailProvider>
    );

    // Assert initial defaults
    expect(screen.getByTestId("active-account").textContent).toBe("all");
    expect(screen.getByTestId("active-folder").textContent).toBe("inbox");
    expect(screen.getByTestId("priority-focus").textContent).toBe("off");

    // Wait for accounts list mock fetch
    await waitFor(() => {
      expect(screen.getByTestId("account-count").textContent).toBe("1");
    });
    
    // Wait for emails list mock fetch
    await waitFor(() => {
      expect(screen.getByTestId("email-count").textContent).toBe("1");
    });
  });

  it("correctly triggers actions updating state filters", async () => {
    render(
      <EmailProvider>
        <TestComponent />
      </EmailProvider>
    );

    // Trigger state change using fireEvent.click
    fireEvent.click(screen.getByTestId("toggle-priority"));
    
    // Wait for state updates to reflect in DOM
    await waitFor(() => {
      expect(screen.getByTestId("priority-focus").textContent).toBe("on");
    });
  });
});
