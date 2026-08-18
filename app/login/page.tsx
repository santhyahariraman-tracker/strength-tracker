"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    if (mode === "sign-in") {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      setLoading(false);
      if (error) {
        setError(error.message);
        return;
      }
      router.push("/");
      router.refresh();
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      setLoading(false);
      if (error) {
        setError(error.message);
        return;
      }
      setMessage("Check your email to confirm your account, then sign in.");
      setMode("sign-in");
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center px-5 bg-bg min-h-screen">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-4xl">🏋️</span>
          <h1 className="text-2xl font-bold mt-3">Strength Tracker</h1>
          <p className="text-sm text-text-muted mt-1">
            {mode === "sign-in" ? "Sign in to your account" : "Create an account"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border rounded-xl px-4 py-3 text-sm"
          />
          <input
            type="password"
            required
            minLength={6}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border rounded-xl px-4 py-3 text-sm"
          />

          {error && <p className="text-sm text-danger">{error}</p>}
          {message && <p className="text-sm text-emerald-400">{message}</p>}

          <button
            type="submit"
            disabled={loading}
            className="bg-gradient-to-r from-accent-purple to-accent-purple-2 text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-50 mt-1"
          >
            {loading
              ? "Please wait…"
              : mode === "sign-in"
              ? "Sign in"
              : "Sign up"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setError(null);
            setMessage(null);
            setMode(mode === "sign-in" ? "sign-up" : "sign-in");
          }}
          className="mt-5 text-sm text-text-muted underline block mx-auto"
        >
          {mode === "sign-in"
            ? "Need an account? Sign up"
            : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
