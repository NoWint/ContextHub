import { Link, useLocation } from "react-router-dom";
import { useAppStore } from "../lib/store";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  FolderOpen,
  Settings,
  LayoutDashboard,
  Box,
} from "lucide-react";

export function Sidebar() {
  const { projects, loadProjects } = useAppStore();
  const location = useLocation();

  useEffect(() => {
    loadProjects();
  }, []);

  return (
    <aside className="w-64 border-r border-border flex flex-col bg-card">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Box className="h-4.5 w-4.5 text-primary" />
          </div>
          <h1 className="text-base font-semibold tracking-tight">ContextHub</h1>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <nav className="p-2 space-y-0.5">
          <Button
            asChild
            variant={location.pathname === "/" ? "secondary" : "ghost"}
            className="w-full justify-start gap-2.5 h-9 px-3"
          >
            <Link to="/">
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Link>
          </Button>

          <div className="pt-4 pb-1 px-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Projects
            </span>
          </div>

          {projects.length === 0 && (
            <p className="px-3 py-2 text-xs text-muted-foreground">
              No projects yet
            </p>
          )}

          {projects.map((p) => (
            <Button
              key={p.id}
              asChild
              variant={location.pathname.startsWith(`/project/${p.id}`) ? "secondary" : "ghost"}
              className="w-full justify-start gap-2.5 h-8 px-3 text-sm"
            >
              <Link to={`/project/${p.id}`}>
                <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="truncate">{p.name}</span>
              </Link>
            </Button>
          ))}
        </nav>
      </ScrollArea>

      <Separator />
      <div className="p-2">
        <Button
          asChild
          variant={location.pathname === "/settings" ? "secondary" : "ghost"}
          className="w-full justify-start gap-2.5 h-9 px-3"
        >
          <Link to="/settings">
            <Settings className="h-4 w-4" />
            Settings
          </Link>
        </Button>
      </div>
    </aside>
  );
}
