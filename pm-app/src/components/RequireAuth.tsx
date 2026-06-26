import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useSession } from "@/hooks/use-session";

export function RequireAuth() {
  const { session, loading } = useSession();
  const location = useLocation();

  if (loading) {
    return (
      <div className="grid h-full place-items-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/sign-in" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
