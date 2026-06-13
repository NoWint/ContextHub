import { useAppStore } from "../lib/store";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Eye,
  Layers,
  Lightbulb,
  Package,
} from "lucide-react";

export function AnalysisView() {
  const { analysis } = useAppStore();

  if (!analysis) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">No analysis available. Run analysis first.</p>
      </div>
    );
  }

  const sections = [
    {
      key: "overview",
      icon: Eye,
      title: "Overview",
      content: analysis.overview,
    },
    {
      key: "architecture",
      icon: Layers,
      title: "Architecture",
      content: analysis.architecture,
    },
    {
      key: "decisions",
      icon: Lightbulb,
      title: "Key Decisions",
      content: analysis.decisions,
    },
    {
      key: "dependencies",
      icon: Package,
      title: "Dependencies",
      content: analysis.dependencies,
    },
  ];

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <h2 className="text-2xl font-bold tracking-tight">Analysis</h2>
        <Badge variant="secondary">v{analysis.version}</Badge>
      </div>

      <div className="space-y-4">
        {sections.map((section) =>
          section.content ? (
            <Card key={section.key}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
                    <section.icon className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <CardTitle className="text-base">{section.title}</CardTitle>
                </div>
              </CardHeader>
              <Separator className="mx-6" />
              <CardContent className="pt-4">
                <ScrollArea className="max-h-64">
                  <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">
                    {section.content}
                  </pre>
                </ScrollArea>
              </CardContent>
            </Card>
          ) : null
        )}
      </div>
    </div>
  );
}
