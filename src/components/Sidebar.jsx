import { NavLink, Link, useNavigate } from "react-router-dom";
import { LayoutDashboard, Ticket, Phone, BookOpen, Zap, ChevronLeft } from "lucide-react";
import { supabase } from "../lib/supabase";

const links = [
  { to: "/helpdesk/dashboard",    label: "Dashboard",      icon: LayoutDashboard },
  { to: "/helpdesk/tickets",      label: "Tickets",         icon: Ticket },
  { to: "/helpdesk/call-monitor", label: "Call Monitor",    icon: Phone },
  { to: "/helpdesk/kb",           label: "Knowledge Base",  icon: BookOpen },
  { to: "/helpdesk/incidents",    label: "Incidents",        icon: Zap },
];

export default function Sidebar() {
  const navigate = useNavigate();
  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate("/helpdesk/login", { replace: true });
  }

  return (
    <aside className="w-60 min-h-screen bg-sidebar flex flex-col border-r border-border">
      <div className="px-6 py-5 border-b border-border">
        <span className="text-lg font-semibold text-primary">Voice Agent Helpdesk</span>
        <Link
          to="/"
          className="mt-2 flex items-center gap-1.5 text-xs text-secondary hover:text-primary transition-colors"
        >
          <ChevronLeft size={13} />
          Back to Portal
        </Link>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-accent text-white"
                  : "text-secondary hover:bg-border hover:text-primary"
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="px-3 py-4 border-t border-border">
        <button
          onClick={handleSignOut}
          className="w-full text-left px-3 py-2 text-sm text-secondary hover:text-primary rounded-lg hover:bg-border transition-colors"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
