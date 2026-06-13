import { FileEntry } from "../lib/api";

interface Props {
  files: FileEntry[];
}

export function FileTree({ files }: Props) {
  return (
    <div className="bg-zinc-900 rounded-lg p-3 max-h-96 overflow-auto">
      {files.length === 0 ? (
        <p className="text-sm text-zinc-500">No files imported yet</p>
      ) : (
        <ul className="space-y-0.5 text-sm font-mono">
          {files.map((f) => (
            <li key={f.id} className="flex items-center gap-2 px-2 py-0.5 hover:bg-zinc-800 rounded">
              <span className="text-zinc-500">{f.language || "?"}</span>
              <span className="truncate">{f.path}</span>
              {f.is_entry && <span className="text-xs text-yellow-500">entry</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
