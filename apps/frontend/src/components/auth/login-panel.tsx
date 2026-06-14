"use client";

import { Clapperboard, LogIn, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { FormEvent, useEffect, useState } from "react";

import { getCurrentSession, login } from "../../lib/api";
import { clearAuthToken } from "../../lib/session";

export function LoginPanel() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@guga-flow.local");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let ignore = false;

    getCurrentSession()
      .then((session) => {
        if (!ignore && session.authenticated) {
          router.replace(nextPath());
        } else if (!ignore) {
          clearAuthToken();
        }
      })
      .catch(() => {
        clearAuthToken();
      });

    return () => {
      ignore = true;
    };
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      await login({ email, password });
      router.push(nextPath());
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Unable to sign in");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-screen" aria-label="Sign in">
      <section className="login-shell">
        <div className="login-brand">
          <span className="login-brand-mark" aria-hidden="true">
            <Clapperboard size={22} />
          </span>
          <div>
            <div className="brand">GugaFlow</div>
            <div className="project-title">AI short-drama factory</div>
          </div>
        </div>

        <form className="login-panel" onSubmit={handleSubmit}>
          <div className="login-heading">
            <span aria-hidden="true">
              <Sparkles size={18} />
            </span>
            <h1>Sign in</h1>
          </div>
          <label>
            <span>Email</span>
            <input
              name="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label>
            <span>Password</span>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <button className="primary-action" type="submit" disabled={busy}>
            <LogIn size={16} aria-hidden="true" />
            {busy ? "Signing in" : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}

function nextPath(): string {
  if (typeof window === "undefined") {
    return "/";
  }
  const next = new URLSearchParams(window.location.search).get("next");
  return next?.startsWith("/") && !next.startsWith("//") ? next : "/";
}
