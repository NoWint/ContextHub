import { FileEntry } from "../lib/api";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { File, FileCode } from "lucide-react";

interface Props {
  files: FileEntry[];
}

export function FileTree({ files }: Props) {
  return (
    <ScrollArea className="h-80 rounded-lg border bg-card">
      {files.length === 0 ? (
        <div className="flex items-center justify-center h-full p-6">
          <p className="text-sm text-muted-foreground">No files imported yet</p>
        </div>
      ) : (
        <div className="p-2">
          {files.map((f) => (
            <div
              key={f.id}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-accent/50 transition-colors group"
            >
              {f.language ? (
                <FileCode className="h-3.5 w-3.5 text-primary shrink-0" />
              ) : (
                <File className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              )}
              <span className="truncate text-sm font-mono flex-1">{f.path}</span>
              {f.language && (
                <Badge variant="secondary" className="text-[10px] h-4 px-1.5 shrink-0">
                  {f.language}
                </Badge>
              )}
              {f.is_entry && (
                <Badge className="text-[10px] h-4 px-1.5 shrink-0 bg-amber-500/15 text-amber-400 border-amber-500/25 hover:bg-amber-500/20">
                  entry
                </Badge>
              )}
            </div>
          ))}
        </div>
      )}
    </ScrollArea>
  );
}
