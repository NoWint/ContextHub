import { useState } from "react";
import { useAppStore } from "../lib/store";
import { CompressionLevel, ExportFormat } from "../lib/api";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";

export function ExportView() {
  const { currentProject, exportProject, exportResult, loading } = useAppStore();
  const [format, setFormat] = useState<ExportFormat>("Claude");
  const [compression, setCompression] = useState<CompressionLevel>("Standard");

  const handleExport = async () => {
    if (!currentProject) return;
    await exportProject(format, compression);
  };

  const handleCopy = async () => {
    if (exportResult) {
      await writeText(exportResult.content);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Export Context</h2>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <label className="block text-sm font-medium mb-2">Format</label>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value as ExportFormat)}
            className="w-full bg-zinc-800 rounded-md px-3 py-2 text-sm"
          >
            <option value="Claude">Claude (CLAUDE.md)</option>
            <option value="Gemini">Gemini (GEMINI.md)</option>
            <option value="Cursor">Cursor (.cursorrules)</option>
            <option value="Markdown">Universal Markdown</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Compression</label>
          <select
            value={compression}
            onChange={(e) => setCompression(e.target.value as CompressionLevel)}
            className="w-full bg-zinc-800 rounded-md px-3 py-2 text-sm"
          >
            <option value="Minimal">Minimal (~5%)</option>
            <option value="Standard">Standard (~15%)</option>
            <option value="Detailed">Detailed (~30%)</option>
          </select>
        </div>
      </div>

      <button
        onClick={handleExport}
        disabled={loading}
        className="px-6 py-2 bg-blue-600 rounded-md hover:bg-blue-500 text-sm mb-6"
      >
        {loading ? "Exporting..." : "Generate Export"}
      </button>

      {exportResult && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Preview</h3>
            <div className="flex gap-2">
              <button onClick={handleCopy} className="px-3 py-1 bg-zinc-800 rounded text-xs hover:bg-zinc-700">
                Copy to Clipboard
              </button>
            </div>
          </div>
          <pre className="bg-zinc-900 p-4 rounded-lg text-sm overflow-auto max-h-[500px] whitespace-pre-wrap">
            {exportResult.content}
          </pre>
          <p className="text-xs text-zinc-500 mt-2">
            ~{exportResult.token_count} tokens | {exportResult.format} format | {exportResult.compression} compression
          </p>
        </div>
      )}
    </div>
  );
}
