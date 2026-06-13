import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../lib/store";
import { open } from "@tauri-apps/plugin-dialog";

export function Dashboard() {
  const { createProject, ingestProject, selectProject } = useAppStore();
  const navigate = useNavigate();
  const [importing, setImporting] = useState(false);

  const handleImportFolder = async () => {
    setImporting(true);
    try {
      const selected = await open({ directory: true, multiple: false });
      if (!selected) return;
      const path = selected as string;
      const name = path.split("/").pop() || "Untitled";
      const project = await createProject(name, "local", path);
      selectProject(project);
      await ingestProject({ LocalFolder: { path } });
      navigate(`/project/${project.id}`);
    } catch (e) {
      console.error(e);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Import Project</h2>
      <div className="space-y-4">
        <button
          onClick={handleImportFolder}
          disabled={importing}
          className="w-full p-6 border-2 border-dashed border-zinc-700 rounded-lg hover:border-zinc-500 transition-colors text-left"
        >
          <div className="text-lg font-medium mb-1">Local Folder</div>
          <div className="text-sm text-zinc-400">
            {importing ? "Importing..." : "Select a local project directory"}
          </div>
        </button>
        <button
          className="w-full p-6 border-2 border-dashed border-zinc-700 rounded-lg hover:border-zinc-500 transition-colors text-left opacity-50 cursor-not-allowed"
          disabled
        >
          <div className="text-lg font-medium mb-1">GitHub Repository</div>
          <div className="text-sm text-zinc-400">Coming soon</div>
        </button>
      </div>
    </div>
  );
}
