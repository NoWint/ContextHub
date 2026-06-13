import { useState, useEffect } from "react";
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
import { api } from "../lib/api";

export function Dashboard() {
  const { createProject, ingestProject, selectProject, error, clearError } = useAppStore();
  const navigate = useNavigate();
  const [importing, setImporting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    api.project.getStartupPath().then(async (path) => {
      if (path) {
        const name = path.split("/").pop() || "Untitled";
        try {
          const project = await createProject(name, "local", path);
          selectProject(project);
          await ingestProject({ LocalFolder: { path } });
          navigate(`/project/${project.id}`);
        } catch (e) {
          console.error(e);
        }
      }
    });
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length === 0) return;

    // Tauri provides file paths in the dataTransfer
    const path = (files[0] as any).path;
    if (!path) return;

    const name = path.split("/").pop() || "Untitled";
    setImporting(true);
    try {
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
    <div
      className={`p-8 max-w-2xl mx-auto h-full ${isDragging ? "bg-primary/5 ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 p-12 border-2 border-dashed border-primary rounded-2xl">
            <FolderOpen className="size-16 text-primary" />
            <p className="text-xl font-medium">Drop project folder here</p>
          </div>
        </div>
      )}

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
