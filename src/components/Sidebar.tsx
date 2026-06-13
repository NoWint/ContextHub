import { Link, useLocation } from "react-router-dom";
import { useAppStore } from "../lib/store";
import { useEffect } from "react";

export function Sidebar() {
  const { projects, loadProjects } = useAppStore();
  const location = useLocation();

  useEffect(() => {
    loadProjects();
  }, []);

  return (
    <aside className="w-64 border-r border-zinc-800 flex flex-col">
      <div className="p-4 border-b border-zinc-800">
        <h1 className="text-lg font-bold">ContextHub</h1>
      </div>
      <nav className="flex-1 overflow-auto p-2">
        <Link
          to="/"
          className={`block px-3 py-2 rounded-md text-sm ${location.pathname === "/" ? "bg-zinc-800" : "hover:bg-zinc-800/50"}`}
        >
          Dashboard
        </Link>
        <div className="mt-4 mb-2 px-3 text-xs font-semibold text-zinc-500 uppercase">
          Projects
        </div>
        {projects.map((p) => (
          <Link
            key={p.id}
            to={`/project/${p.id}`}
            className={`block px-3 py-1.5 rounded-md text-sm truncate ${location.pathname.startsWith(`/project/${p.id}`) ? "bg-zinc-800" : "hover:bg-zinc-800/50"}`}
          >
            {p.name}
          </Link>
        ))}
      </nav>
      <div className="p-2 border-t border-zinc-800">
        <Link
          to="/settings"
          className={`block px-3 py-2 rounded-md text-sm ${location.pathname === "/settings" ? "bg-zinc-800" : "hover:bg-zinc-800/50"}`}
        >
          Settings
        </Link>
      </div>
    </aside>
  );
}
