import { useParams, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { useAppStore } from "../lib/store";
import { FileTree } from "../components/FileTree";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Cpu,
  Sparkles,
  FileText,
  ArrowRight,
  Download,
  BarChart3,
  Loader2,
  GitCompare,
} from "lucide-react";

export function ProjectView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { projects, currentProject, selectProject, files, analysis, analyzeProject, loadProjectData, loadingAnalysis, startWatching, stopWatching, ingestProject } = useAppStore();

  useEffect(() => {
    if (!id) return;
    if (currentProject?.id !== id) {
      const project = projects.find((p) => p.id === id);
      if (project) {
        selectProject(project);
        loadProjectData(project.id);
      }
    }
  }, [id]);

  // File watching effect
  useEffect(() => {
    if (!currentProject) return;

    startWatching(currentProject.id);

    const unlistenPromise = listen<string>("project-files-changed", (event) => {
      if (event.payload === currentProject.id) {
        ingestProject({ LocalFolder: { path: currentProject.source_path } });
      }
    });

    return () => {
      stopWatching(currentProject.id);
      unlistenPromise.then((fn) => fn());
    };
  }, [currentProject?.id]);

  if (!currentProject) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Project not found</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{currentProject.name}</h2>
          <p className="text-muted-foreground text-sm mt-0.5">
            {currentProject.source_type} &middot; {currentProject.source_path}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => analyzeProject(false)}
            disabled={loadingAnalysis}
            className="gap-1.5"
          >
            {loadingAnalysis ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Cpu className="h-3.5 w-3.5" />
            )}
            Analyze (Local)
          </Button>
          <Button
            onClick={() => analyzeProject(true)}
            disabled={loadingAnalysis}
            className="gap-1.5"
          >
            {loadingAnalysis ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            Analyze (Local + LLM)
          </Button>
        </div>
      </div>

      {analysis && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Analysis Summary
              </CardTitle>
              <Badge variant="secondary">v{analysis.version}</Badge>
            </div>
            {analysis.overview && (
              <CardDescription className="line-clamp-2">
                {analysis.overview}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/project/${id}/analysis`)}
              className="gap-1.5 -ml-2"
            >
              View full analysis
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="files" className="w-full">
        <TabsList>
          <TabsTrigger value="files" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            Files
          </TabsTrigger>
          <TabsTrigger value="actions" className="gap-1.5">
            <Download className="h-3.5 w-3.5" />
            Actions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="files">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Project Files
                <Badge variant="secondary" className="ml-2">{files.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FileTree files={files} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actions">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Export & Actions</CardTitle>
              <CardDescription>
                Export your project context for AI tools
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                onClick={() => navigate(`/project/${id}/export`)}
                className="w-full justify-start gap-2 h-11"
              >
                <Download className="h-4 w-4" />
                Export Context
                <ArrowRight className="h-3.5 w-3.5 ml-auto" />
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate(`/project/${id}/diff`)}
                className="w-full justify-start gap-2 h-11"
              >
                <GitCompare className="h-4 w-4" />
                Compare Versions
                <ArrowRight className="h-3.5 w-3.5 ml-auto" />
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
