"use client";

import React, { useState } from "react";
import { Sparkles, Mail, Lock, User, ArrowRight } from "lucide-react";
import { useEmailStore } from "@/lib/store/store";

export default function AuthScreen() {
  const { login, register } = useEmailStore();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError("Please fill in all fields.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      let success = false;
      if (isLogin) {
        success = await login(username, password);
      } else {
        success = await register(username, password);
      }

      if (!success) {
        setError(isLogin ? "Invalid username or password." : "Username already exists.");
      }
    } catch (err: any) {
      setError(err?.message || "An authentication error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen w-screen bg-zinc-950 text-zinc-50 font-sans relative overflow-hidden p-4">
      {/* Background Neon Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Main Glassmorphic Card */}
      <div className="w-full max-w-md p-8 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 backdrop-blur-xl shadow-2xl relative z-10 animate-in fade-in duration-300">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-teal-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-4 animate-pulse">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-zinc-50 via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
            AuraMail
          </h1>
          <p className="text-xs text-zinc-500 mt-1 font-medium">
            AI-First Universal Email Client
          </p>
        </div>

        {/* Title */}
        <h2 className="text-lg font-bold text-zinc-200 mb-6 text-center">
          {isLogin ? "Sign in to your client" : "Create your offline account"}
        </h2>

        {/* Error Alert */}
        {error && (
          <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold leading-relaxed animate-in shake duration-200">
            {error}
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xxs uppercase tracking-wider text-zinc-500 font-bold block">
              Username
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="alex_rivers"
                className="w-full pl-10 pr-4 py-2.5 bg-zinc-950/40 border border-zinc-800 rounded-xl text-xs text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-indigo-500/50 transition-colors"
                disabled={isSubmitting}
              />
              <User className="absolute left-3.5 top-3 w-4 h-4 text-zinc-650" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xxs uppercase tracking-wider text-zinc-500 font-bold block">
              Password
            </label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-zinc-950/40 border border-zinc-800 rounded-xl text-xs text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-indigo-500/50 transition-colors"
                disabled={isSubmitting}
              />
              <Lock className="absolute left-3.5 top-3 w-4 h-4 text-zinc-650" />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 text-white font-bold text-xs shadow-md shadow-indigo-500/10 transition-all hover:scale-[1.02] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-6"
          >
            {isSubmitting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>{isLogin ? "Sign In" : "Sign Up"}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Switch Mode Toggle */}
        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError("");
            }}
            className="text-xs text-zinc-500 hover:text-indigo-400 font-semibold transition-colors cursor-pointer"
            disabled={isSubmitting}
          >
            {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
          </button>
        </div>

      </div>
    </div>
  );
}
