import { invoke } from "@tauri-apps/api/core";

export interface Project {
  id: string;
  name: string;
  source_type: string;
  source_path: string;
  created_at: string;
  updated_at: string;
}

export interface FileEntry {
  id: string;
  project_id: string;
  path: string;
  language: string | null;
  size_bytes: number | null;
  relevance_score: number | null;
  content: string | null;
  is_entry: boolean;
}

export interface Analysis {
  id: string;
  project_id: string;
  version: number;
  overview: string | null;
  architecture: string | null;
  decisions: string | null;
  dependencies: string | null;
  api_endpoints: string | null;
  created_at: string;
}

export interface ExportRecord {
  id: string;
  project_id: string;
  format: string;
  compression: string;
  content: string;
  token_count: number | null;
  created_at: string;
}

export interface LlmConfig {
  id: string;
  provider: string;
  api_key: string | null;
  endpoint: string | null;
  model: string;
  is_default: boolean;
}

export interface CompressedContext {
  content: string;
  token_count: number;
  files_included: number;
}

export type ProjectSource =
  | { LocalFolder: { path: string } }
  | { GitHubRepo: { url: string; branch: string | null } }
  | { ZipFile: { path: string } };

export type CompressionLevel = "Minimal" | "Standard" | "Detailed";

export type ExportFormat = "Claude" | "Gemini" | "Cursor" | "Markdown";

export const api = {
  project: {
    list: (): Promise<Project[]> => invoke("list_projects"),
    create: (name: string, source_type: string, source_path: string): Promise<Project> =>
      invoke("create_project", { name, sourceType: source_type, sourcePath: source_path }),
    delete: (projectId: string): Promise<void> =>
      invoke("delete_project", { projectId }),
    getFiles: (projectId: string): Promise<FileEntry[]> =>
      invoke("get_project_files", { projectId }),
    getAnalysis: (projectId: string): Promise<Analysis | null> =>
      invoke("get_project_analysis", { projectId }),
  },
  ingestion: {
    ingest: (projectId: string, source: ProjectSource): Promise<FileEntry[]> =>
      invoke("ingest_project", { projectId, source }),
  },
  analysis: {
    analyze: (projectId: string, useLlm: boolean): Promise<Analysis> =>
      invoke("analyze_project", { projectId, useLlm }),
  },
  compression: {
    compress: (projectId: string, compression: CompressionLevel): Promise<CompressedContext> =>
      invoke("compress_project", { projectId, compression }),
  },
  export: {
    exportContext: (
      projectId: string,
      projectName: string,
      format: ExportFormat,
      compression: CompressionLevel
    ): Promise<ExportRecord> =>
      invoke("export_context", { projectId, projectName, format, compression }),
  },
  settings: {
    saveLlmConfig: (
      provider: string,
      apiKey: string,
      endpoint: string | null,
      model: string,
      isDefault: boolean
    ): Promise<LlmConfig> =>
      invoke("save_llm_config", { provider, apiKey, endpoint, model, isDefault }),
    listLlmConfigs: (): Promise<LlmConfig[]> => invoke("list_llm_configs"),
    deleteLlmConfig: (configId: string): Promise<void> =>
      invoke("delete_llm_config", { configId }),
  },
};
