import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { api, Analysis } from "../lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, GitCompare } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function VersionDiff() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [history, setHistory] = useState<Analysis[]>([]);
  const [leftVersion, setLeftVersion] = useState<number | null>(null);
  const [rightVersion, setRightVersion] = useState<number | null>(null);

  useEffect(() => {
    if (!id) return;
    api.project.getAnalysisHistory(id).then(setHistory).catch(console.error);
  }, [id]);

  useEffect(() => {
    if (history.length >= 2) {
      setLeftVersion(history[1].version);
      setRightVersion(history[0].version);
    }
  }, [history]);

  const leftAnalysis = history.find(a => a.version === leftVersion);
  const rightAnalysis = history.find(a => a.version === rightVersion);

  if (history.length < 2) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <p className="text-muted-foreground">Need at least 2 analysis versions to compare.</p>
      </div>
    );
  }

  const DiffSection = ({ title, left, right }: { title: string; left: string | null; right: string | null }) => {
    if (!left && !right) return null;
    const leftLines = (left || "").split("\n");
    const rightLines = (right || "").split("\n");

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <ScrollArea className="h-48">
              <pre className="text-xs whitespace-pre-wrap">
                {leftLines.map((line, i) => (
                  <div key={i} className={rightLines[i] !== line ? "bg-red-500/10 text-red-400 px-1 rounded" : "px-1"}>
                    {line}
                  </div>
                ))}
              </pre>
            </ScrollArea>
            <ScrollArea className="h-48">
              <pre className="text-xs whitespace-pre-wrap">
                {rightLines.map((line, i) => (
                  <div key={i} className={leftLines[i] !== line ? "bg-green-500/10 text-green-400 px-1 rounded" : "px-1"}>
                    {line}
                  </div>
                ))}
              </pre>
            </ScrollArea>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="size-4" />
        </Button>
        <h2 className="text-2xl font-bold">Version Comparison</h2>
        <GitCompare className="size-5 text-muted-foreground" />
      </div>

      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">From:</span>
          <Select value={leftVersion?.toString()} onValueChange={(v) => setLeftVersion(Number(v))}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              {history.map(a => (
                <SelectItem key={a.id} value={a.version.toString()}>
                  v{a.version}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <span className="text-muted-foreground">→</span>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">To:</span>
          <Select value={rightVersion?.toString()} onValueChange={(v) => setRightVersion(Number(v))}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              {history.map(a => (
                <SelectItem key={a.id} value={a.version.toString()}>
                  v{a.version}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <DiffSection title="Overview" left={leftAnalysis?.overview ?? null} right={rightAnalysis?.overview ?? null} />
        <DiffSection title="Architecture" left={leftAnalysis?.architecture ?? null} right={rightAnalysis?.architecture ?? null} />
        <DiffSection title="Decisions" left={leftAnalysis?.decisions ?? null} right={rightAnalysis?.decisions ?? null} />
        <DiffSection title="Dependencies" left={leftAnalysis?.dependencies ?? null} right={rightAnalysis?.dependencies ?? null} />
      </div>
    </div>
  );
}
