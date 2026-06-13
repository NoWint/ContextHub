import { create } from "zustand";
import {
  api,
  type Project,
  type FileEntry,
  type Analysis,
  type ExportRecord,
  type LlmConfig,
  type CompressedContext,
  type CompressionLevel,
  type ExportFormat,
  type ProjectSource,
} from "./api";

interface AppState {
  projects: Project[];
  currentProject: Project | null;
  files: FileEntry[];
  analysis: Analysis | null;
  compressedContext: CompressedContext | null;
  exportResult: ExportRecord | null;
  llmConfigs: LlmConfig[];
  loadingProjects: boolean;
  loadingAnalysis: boolean;
  loadingCompression: boolean;
  loadingExport: boolean;
  loadingIngestion: boolean;
  error: string | null;

  loadProjects: () => Promise<void>;
  selectProject: (project: Project) => void;
  createProject: (name: string, sourceType: string, sourcePath: string) => Promise<Project>;
  deleteProject: (projectId: string) => Promise<void>;
  ingestProject: (source: ProjectSource) => Promise<void>;
  analyzeProject: (useLlm: boolean) => Promise<void>;
  compressProject: (level: CompressionLevel) => Promise<void>;
  exportProject: (format: ExportFormat, compression: CompressionLevel) => Promise<void>;
  loadLlmConfigs: () => Promise<void>;
  saveLlmConfig: (
    provider: string,
    apiKey: string,
    endpoint: string | null,
    model: string,
    isDefault: boolean
  ) => Promise<void>;
  deleteLlmConfig: (configId: string) => Promise<void>;
  loadProjectData: (projectId: string) => Promise<void>;
  clearError: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  projects: [],
  currentProject: null,
  files: [],
  analysis: null,
  compressedContext: null,
  exportResult: null,
  llmConfigs: [],
  loadingProjects: false,
  loadingAnalysis: false,
  loadingCompression: false,
  loadingExport: false,
  loadingIngestion: false,
  error: null,

  loadProjects: async () => {
    set({ loadingProjects: true, error: null });
    try {
      const projects = await api.project.list();
      set({ projects, loadingProjects: false });
    } catch (e) {
      set({ error: String(e), loadingProjects: false });
    }
  },

  selectProject: (project) =>
    set({
      currentProject: project,
      files: [],
      analysis: null,
      compressedContext: null,
      exportResult: null,
    }),

  createProject: async (name, sourceType, sourcePath) => {
    set({ loadingProjects: true, error: null });
    try {
      const project = await api.project.create(name, sourceType, sourcePath);
      set((s) => ({ projects: [project, ...s.projects], loadingProjects: false }));
      return project;
    } catch (e) {
      set({ error: String(e), loadingProjects: false });
      throw e;
    }
  },

  deleteProject: async (projectId) => {
    try {
      await api.project.delete(projectId);
      set((s) => ({
        projects: s.projects.filter((p) => p.id !== projectId),
        currentProject: s.currentProject?.id === projectId ? null : s.currentProject,
      }));
    } catch (e) {
      set({ error: String(e) });
    }
  },

  ingestProject: async (source) => {
    const { currentProject } = get();
    if (!currentProject) return;
    set({ loadingIngestion: true, error: null });
    try {
      const files = await api.ingestion.ingest(currentProject.id, source);
      set({ files, loadingIngestion: false });
    } catch (e) {
      set({ error: String(e), loadingIngestion: false });
    }
  },

  analyzeProject: async (useLlm) => {
    const { currentProject } = get();
    if (!currentProject) return;
    set({ loadingAnalysis: true, error: null });
    try {
      const analysis = await api.analysis.analyze(currentProject.id, useLlm);
      set({ analysis, loadingAnalysis: false });
    } catch (e) {
      set({ error: String(e), loadingAnalysis: false });
    }
  },

  compressProject: async (level) => {
    const { currentProject } = get();
    if (!currentProject) return;
    set({ loadingCompression: true, error: null });
    try {
      const compressedContext = await api.compression.compress(currentProject.id, level);
      set({ compressedContext, loadingCompression: false });
    } catch (e) {
      set({ error: String(e), loadingCompression: false });
    }
  },

  exportProject: async (format, compression) => {
    const { currentProject } = get();
    if (!currentProject) return;
    set({ loadingExport: true, error: null });
    try {
      const exportResult = await api.export.exportContext(
        currentProject.id,
        currentProject.name,
        format,
        compression
      );
      set({ exportResult, loadingExport: false });
    } catch (e) {
      set({ error: String(e), loadingExport: false });
    }
  },

  loadLlmConfigs: async () => {
    try {
      const llmConfigs = await api.settings.listLlmConfigs();
      set({ llmConfigs });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  saveLlmConfig: async (provider, apiKey, endpoint, model, isDefault) => {
    try {
      const config = await api.settings.saveLlmConfig(provider, apiKey, endpoint, model, isDefault);
      set((s) => ({ llmConfigs: [...s.llmConfigs, config] }));
    } catch (e) {
      set({ error: String(e) });
    }
  },

  deleteLlmConfig: async (configId) => {
    try {
      await api.settings.deleteLlmConfig(configId);
      set((s) => ({ llmConfigs: s.llmConfigs.filter((c) => c.id !== configId) }));
    } catch (e) {
      set({ error: String(e) });
    }
  },

  loadProjectData: async (projectId) => {
    set({ loadingProjects: true, error: null });
    try {
      const [files, analysis] = await Promise.all([
        api.project.getFiles(projectId),
        api.project.getAnalysis(projectId),
      ]);
      set({ files, analysis, loadingProjects: false });
    } catch (e) {
      set({ error: String(e), loadingProjects: false });
    }
  },

  clearError: () => set({ error: null }),
}));
