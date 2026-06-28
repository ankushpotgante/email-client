"use client";

import React, { useState } from "react";
import { useEmailStore } from "@/lib/store/store";
import { X, Plus, Mail, ShieldAlert, Key } from "lucide-react";

interface AddAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddAccountModal({ isOpen, onClose }: AddAccountModalProps) {
  const { addAccount } = useEmailStore();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [type, setType] = useState("gmail");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || isSubmitting) return;
    
    setIsSubmitting(true);
    setError("");

    try {
      const success = await addAccount(name, email, type);
      if (success) {
        // Reset and close
        setName("");
        setEmail("");
        setType("gmail");
        setPassword("");
        onClose();
      } else {
        setError("Failed to add account. Make sure account ID is unique.");
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Dark Overlay */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden z-10 animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-zinc-950 px-6 py-4 flex items-center justify-between border-b border-zinc-800/80">
          <h2 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
            <Mail className="w-4 h-4 text-indigo-400" />
            <span>Connect New Account</span>
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-all cursor-pointer"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-start gap-2">
              <ShieldAlert className="w-4.5 h-4.5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Account Type Selector */}
          <div className="space-y-1.5">
            <label className="text-xxs uppercase tracking-wider text-zinc-500 font-bold">
              Account Provider
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "gmail", label: "Gmail" },
                { id: "office365", label: "Office 365" },
                { id: "imap", label: "IMAP (Yahoo/AOL)" }
              ].map((prov) => (
                <button
                  key={prov.id}
                  type="button"
                  onClick={() => setType(prov.id)}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    type === prov.id
                      ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/30"
                      : "bg-zinc-950/40 text-zinc-400 border-zinc-850 hover:border-zinc-800"
                  }`}
                >
                  {prov.label}
                </button>
              ))}
            </div>
          </div>

          {/* Account Name */}
          <div className="space-y-1.5">
            <label className="text-xxs uppercase tracking-wider text-zinc-500 font-bold block">
              Account Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Work Outlook, Personal Gmail"
              className="w-full px-4 py-2.5 bg-zinc-950/40 border border-zinc-800 rounded-xl text-xs text-zinc-200 placeholder-zinc-650 focus:outline-none focus:border-indigo-500/50 transition-colors"
            />
          </div>

          {/* Email Address */}
          <div className="space-y-1.5">
            <label className="text-xxs uppercase tracking-wider text-zinc-500 font-bold block">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="username@domain.com"
              className="w-full px-4 py-2.5 bg-zinc-950/40 border border-zinc-800 rounded-xl text-xs text-zinc-200 placeholder-zinc-650 focus:outline-none focus:border-indigo-500/50 transition-colors"
            />
          </div>

          {/* Password (App Password advice) */}
          <div className="space-y-1.5">
            <label className="text-xxs uppercase tracking-wider text-zinc-500 font-bold block">
              App Password
            </label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••••••"
                className="w-full pl-4 pr-10 py-2.5 bg-zinc-950/40 border border-zinc-800 rounded-xl text-xs text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-indigo-500/50 transition-colors"
              />
              <Key className="absolute right-3.5 top-3 w-4 h-4 text-zinc-600 pointer-events-none" />
            </div>
            <p className="text-[10px] text-zinc-500 leading-normal">
              For security, AuraMail runs locally. Connect Gmail or Office 365 using an **App Password** generated from your provider's security portal.
            </p>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !name || !email}
              className="w-full flex items-center justify-center gap-1.5 py-3 px-4 bg-indigo-500 hover:bg-indigo-600 disabled:bg-zinc-850 disabled:text-zinc-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-500/10 transition-colors cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Connect Account</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
