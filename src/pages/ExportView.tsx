import { useState } from "react";
import { useAppStore } from "../lib/store";
import { CompressionLevel, ExportFormat } from "../lib/api";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Download,
  Copy,
  FileText,
  Loader2,
  Check,
  Hash,
  FileType,
} from "lucide-react";

export function ExportView() {
  const { currentProject, exportProject, exportResult, loadingExport } = useAppStore();
  const [format, setFormat] = useState<ExportFormat>("Claude");
  const [compression, setCompression] = useState<CompressionLevel>("Standard");
  const [copied, setCopied] = useState(false);

  const handleExport = async () => {
    if (!currentProject) return;
    await exportProject(format, compression);
  };

  const handleCopy = async () => {
    if (exportResult) {
      await writeText(exportResult.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight">Export Context</h2>
        <p className="text-muted-foreground mt-1">
          Generate and export your project context for AI tools
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Export Settings
          </CardTitle>
          <CardDescription>
            Choose the output format and compression level
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="format">Format</Label>
              <Select value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
                <SelectTrigger id="format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Claude">Claude (CLAUDE.md)</SelectItem>
                  <SelectItem value="Gemini">Gemini (GEMINI.md)</SelectItem>
                  <SelectItem value="Cursor">Cursor (.cursorrules)</SelectItem>
                  <SelectItem value="Markdown">Universal Markdown</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="compression">Compression</Label>
              <Select value={compression} onValueChange={(v) => setCompression(v as CompressionLevel)}>
                <SelectTrigger id="compression">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Minimal">Minimal (~5%)</SelectItem>
                  <SelectItem value="Standard">Standard (~15%)</SelectItem>
                  <SelectItem value="Detailed">Detailed (~30%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator className="my-6" />

          <Button onClick={handleExport} disabled={loadingExport} className="gap-1.5">
            {loadingExport ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {loadingExport ? "Exporting..." : "Generate Export"}
          </Button>
        </CardContent>
      </Card>

      {exportResult && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Preview</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="gap-1.5"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-green-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {copied ? "Copied!" : "Copy to Clipboard"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px] rounded-lg border bg-card">
              <pre className="p-4 text-sm font-mono whitespace-pre-wrap leading-relaxed text-muted-foreground">
                {exportResult.content}
              </pre>
            </ScrollArea>
            <div className="flex items-center gap-2 mt-3">
              <Badge variant="secondary" className="gap-1 text-[11px]">
                <Hash className="h-3 w-3" />
                ~{exportResult.token_count} tokens
              </Badge>
              <Badge variant="secondary" className="gap-1 text-[11px]">
                <FileType className="h-3 w-3" />
                {exportResult.format}
              </Badge>
              <Badge variant="secondary" className="text-[11px]">
                {exportResult.compression} compression
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
