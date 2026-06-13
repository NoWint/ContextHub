import { useState, useEffect } from "react";
import { useAppStore } from "../lib/store";

export function Settings() {
  const { llmConfigs, loadLlmConfigs, saveLlmConfig, deleteLlmConfig } = useAppStore();
  const [provider, setProvider] = useState("openai");
  const [apiKey, setApiKey] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [model, setModel] = useState("gpt-4o-mini");
  const [isDefault, setIsDefault] = useState(true);

  useEffect(() => {
    loadLlmConfigs();
  }, []);

  const handleSave = async () => {
    await saveLlmConfig(provider, apiKey, endpoint || null, model, isDefault);
    setApiKey("");
    setEndpoint("");
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Settings</h2>

      <section className="mb-8">
        <h3 className="font-semibold mb-4">LLM Configuration</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm mb-1">Provider</label>
            <select
              value={provider}
              onChange={(e) => {
                setProvider(e.target.value);
                if (e.target.value === "openai") setModel("gpt-4o-mini");
                else if (e.target.value === "claude") setModel("claude-sonnet-4-20250514");
                else if (e.target.value === "ollama") setModel("llama3");
              }}
              className="w-full bg-zinc-800 rounded-md px-3 py-2 text-sm"
            >
              <option value="openai">OpenAI</option>
              <option value="claude">Claude</option>
              <option value="ollama">Ollama (Local)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full bg-zinc-800 rounded-md px-3 py-2 text-sm"
              placeholder={provider === "ollama" ? "Not required for Ollama" : "sk-..."}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Custom Endpoint (optional)</label>
            <input
              type="text"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              className="w-full bg-zinc-800 rounded-md px-3 py-2 text-sm"
              placeholder="https://api.openai.com/v1/chat/completions"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Model</label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full bg-zinc-800 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="rounded"
            />
            Set as default
          </label>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 rounded-md hover:bg-blue-500 text-sm"
          >
            Save Configuration
          </button>
        </div>
      </section>

      <section>
        <h3 className="font-semibold mb-4">Saved Configurations</h3>
        {llmConfigs.length === 0 ? (
          <p className="text-sm text-zinc-500">No LLM configurations saved yet.</p>
        ) : (
          <div className="space-y-2">
            {llmConfigs.map((config) => (
              <div key={config.id} className="flex items-center justify-between bg-zinc-900 p-3 rounded-lg">
                <div>
                  <span className="font-medium text-sm">{config.provider}</span>
                  <span className="text-zinc-500 text-sm ml-2">{config.model}</span>
                  {config.is_default && <span className="text-xs text-yellow-500 ml-2">default</span>}
                </div>
                <button
                  onClick={() => deleteLlmConfig(config.id)}
                  className="text-xs text-red-400 hover:underline"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
