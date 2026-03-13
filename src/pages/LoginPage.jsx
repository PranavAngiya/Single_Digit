import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

const DEMO_ACCOUNTS = [
  {
    label: "Admin",
    description: "Dashboard, tickets, KB, call monitor",
    email: "admin@helpdesk.local",
    password: "Admin1234!",
    color: "#5a6acf",
    bg: "#5a6acf18",
  },
  {
    label: "Customer",
    description: "AI voice call portal",
    email: "customer@helpdesk.local",
    password: "Customer1234!",
    color: "#16a34a",
    bg: "#22c55e18",
  },
];

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [quickLoading, setQuickLoading] = useState(null);
  const navigate = useNavigate();

  async function signIn(emailVal, passwordVal) {
    setError(null);
    const { data, error: err } = await supabase.auth.signInWithPassword({
      email: emailVal,
      password: passwordVal,
    });
    if (err) { setError(err.message); return; }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    if (profile?.role === "admin") navigate("/helpdesk/dashboard");
    else navigate("/helpdesk/call");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    await signIn(email, password);
    setLoading(false);
  }

  async function handleQuickSign(account) {
    setQuickLoading(account.label);
    await signIn(account.email, account.password);
    setQuickLoading(null);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-sidebar">
      <div className="bg-white rounded-xl shadow-sm border border-border p-8 w-full max-w-sm space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-primary">Helpdesk Login</h1>
          <Link
            to="/"
            className="flex items-center gap-1 text-xs text-secondary hover:text-primary transition-colors"
          >
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            Portal
          </Link>
        </div>

        {/* Quick sign-in */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-secondary uppercase tracking-wide">Quick Sign-in</p>
          <div className="grid grid-cols-2 gap-2">
            {DEMO_ACCOUNTS.map(account => (
              <button
                key={account.label}
                onClick={() => handleQuickSign(account)}
                disabled={!!quickLoading || loading}
                className="flex flex-col items-start p-3 rounded-xl border-2 transition-all disabled:opacity-50 hover:opacity-90"
                style={{ borderColor: account.color, background: account.bg }}
              >
                <span className="text-sm font-semibold" style={{ color: account.color }}>
                  {quickLoading === account.label ? "Signing in…" : account.label}
                </span>
                <span className="text-xs text-secondary mt-0.5 text-left leading-tight">
                  {account.description}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-secondary">or sign in manually</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Manual form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full border border-border rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full border border-border rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading || !!quickLoading}
            className="w-full bg-accent text-white rounded-lg py-2 text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
