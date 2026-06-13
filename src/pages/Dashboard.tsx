import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../lib/store";
import { open } from "@tauri-apps/plugin-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FolderOpen, GitBranch, FileArchive, Loader2, AlertCircle, X } from "lucide-react";

export function Dashboard() {
  const { createProject, ingestProject, selectProject, error, clearError } = useAppStore();
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
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight">Import Project</h2>
        <p className="text-muted-foreground mt-1">
          Select a source to import your project context
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearError}
              className="h-6 w-6 p-0 hover:bg-transparent"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-3">
        <Card
          className="cursor-pointer transition-all hover:border-primary/50 hover:bg-accent/50 group"
          onClick={handleImportFolder}
        >
          <CardHeader className="flex flex-row items-center gap-4 space-y-0 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/15 transition-colors">
              <FolderOpen className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-base">Local Folder</CardTitle>
              <CardDescription>
                {importing ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Importing...
                  </span>
                ) : (
                  "Select a local project directory"
                )}
              </CardDescription>
            </div>
          </CardHeader>
        </Card>

        <Card className="opacity-50 cursor-not-allowed">
          <CardHeader className="flex flex-row items-center gap-4 space-y-0 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <GitBranch className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-base">GitHub Repository</CardTitle>
              <CardDescription>Coming soon</CardDescription>
            </div>
          </CardHeader>
        </Card>

        <Card className="opacity-50 cursor-not-allowed">
          <CardHeader className="flex flex-row items-center gap-4 space-y-0 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <FileArchive className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-base">Archive File</CardTitle>
              <CardDescription>Coming soon</CardDescription>
            </div>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
