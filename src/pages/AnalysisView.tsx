import { useAppStore } from "../lib/store";

export function AnalysisView() {
  const { analysis } = useAppStore();

  if (!analysis) return <div className="p-8">No analysis available. Run analysis first.</div>;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Analysis v{analysis.version}</h2>

      {analysis.overview && (
        <section className="mb-6">
          <h3 className="font-semibold mb-2">Overview</h3>
          <p className="text-sm text-zinc-300 bg-zinc-900 p-4 rounded-lg">{analysis.overview}</p>
        </section>
      )}

      {analysis.architecture && (
        <section className="mb-6">
          <h3 className="font-semibold mb-2">Architecture</h3>
          <pre className="text-sm text-zinc-300 bg-zinc-900 p-4 rounded-lg whitespace-pre-wrap">{analysis.architecture}</pre>
        </section>
      )}

      {analysis.decisions && (
        <section className="mb-6">
          <h3 className="font-semibold mb-2">Key Decisions</h3>
          <pre className="text-sm text-zinc-300 bg-zinc-900 p-4 rounded-lg whitespace-pre-wrap">{analysis.decisions}</pre>
        </section>
      )}

      {analysis.dependencies && (
        <section className="mb-6">
          <h3 className="font-semibold mb-2">Dependencies</h3>
          <pre className="text-sm text-zinc-300 bg-zinc-900 p-4 rounded-lg whitespace-pre-wrap">{analysis.dependencies}</pre>
        </section>
      )}
    </div>
  );
}
