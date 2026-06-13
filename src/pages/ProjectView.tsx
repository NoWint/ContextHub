import { useParams, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAppStore } from "../lib/store";
import { FileTree } from "../components/FileTree";

export function ProjectView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { projects, currentProject, selectProject, files, analysis, analyzeProject, loading } = useAppStore();

  useEffect(() => {
    const project = projects.find((p) => p.id === id);
    if (project) selectProject(project);
  }, [id, projects]);

  if (!currentProject) return <div className="p-8">Project not found</div>;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">{currentProject.name}</h2>
        <div className="flex gap-3">
          <button
            onClick={() => analyzeProject(false)}
            disabled={loading}
            className="px-4 py-2 bg-zinc-800 rounded-md hover:bg-zinc-700 text-sm"
          >
            Analyze (Local)
          </button>
          <button
            onClick={() => analyzeProject(true)}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 rounded-md hover:bg-blue-500 text-sm"
          >
            Analyze (Local + LLM)
          </button>
        </div>
      </div>

      {analysis && (
        <div className="mb-6 p-4 bg-zinc-900 rounded-lg">
          <h3 className="font-semibold mb-2">Analysis v{analysis.version}</h3>
          {analysis.overview && <p className="text-sm text-zinc-300 mb-2">{analysis.overview}</p>}
          <button
            onClick={() => navigate(`/project/${id}/analysis`)}
            className="text-sm text-blue-400 hover:underline"
          >
            View full analysis
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        <div>
          <h3 className="font-semibold mb-3">Files ({files.length})</h3>
          <FileTree files={files} />
        </div>
        <div>
          <h3 className="font-semibold mb-3">Actions</h3>
          <div className="space-y-2">
            <button
              onClick={() => navigate(`/project/${id}/export`)}
              className="w-full px-4 py-3 bg-zinc-800 rounded-md hover:bg-zinc-700 text-sm text-left"
            >
              Export Context
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
