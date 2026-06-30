import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Inbox, LogOut, FolderKanban, Command, Sunrise } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/hooks/use-session";
import { cn } from "@/lib/cn";

const links = [
  { to: "/", label: "Inbox", icon: Inbox, end: true },
  { to: "/p", label: "Projects", icon: FolderKanban, end: false },
  { to: "/sync", label: "Daily sync", icon: Sunrise, end: true },
];

export function AppLayout() {
  const { session } = useSession();
  const navigate = useNavigate();

  return (
    <div className="grid h-full grid-rows-[auto_1fr] md:grid-cols-[240px_1fr] md:grid-rows-1">
      <aside className="border-b border-border bg-card md:border-b-0 md:border-r">
        <div className="flex h-14 items-center gap-2 px-4 font-semibold">
          <FolderKanban className="h-5 w-5 text-primary" />
          PM App
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:px-3">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm",
                  isActive
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden px-3 py-2 text-[11px] text-muted-foreground md:block">
          <span className="inline-flex items-center gap-1 rounded border border-border px-1.5 py-0.5">
            <Command className="h-3 w-3" />K
          </span>{" "}
          to open the command bar
        </div>
        <div className="hidden border-t border-border p-3 text-xs text-muted-foreground md:block">
          <div className="truncate">{session?.user.email}</div>
          <button
            type="button"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate("/sign-in", { replace: true });
            }}
            className="mt-2 flex items-center gap-2 text-foreground hover:text-primary"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      </aside>
      <main className="overflow-y-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
