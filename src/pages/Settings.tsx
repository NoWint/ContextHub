import { useState, useEffect } from "react";
import { useAppStore } from "../lib/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Key,
  Save,
  Trash2,
  AlertCircle,
  Cpu,
  Star,
} from "lucide-react";

export function Settings() {
  const { llmConfigs, loadLlmConfigs, saveLlmConfig, deleteLlmConfig, error } = useAppStore();
  const [provider, setProvider] = useState("openai");
  const [apiKey, setApiKey] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [model, setModel] = useState("gpt-4o-mini");
  const [isDefault, setIsDefault] = useState(true);

  useEffect(() => {
    loadLlmConfigs();
  }, []);

  const handleProviderChange = (value: string) => {
    setProvider(value);
    if (value === "openai") setModel("gpt-4o-mini");
    else if (value === "claude") setModel("claude-sonnet-4-20250514");
    else if (value === "ollama") setModel("llama3");
  };

  const handleSave = async () => {
    await saveLlmConfig(provider, apiKey, endpoint || null, model, isDefault);
    setApiKey("");
    setEndpoint("");
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground mt-1">
          Configure LLM providers and application preferences
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Key className="h-4 w-4 text-primary" />
            LLM Configuration
          </CardTitle>
          <CardDescription>
            Add an LLM provider to enable AI-powered analysis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="provider">Provider</Label>
            <Select value={provider} onValueChange={handleProviderChange}>
              <SelectTrigger id="provider">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="claude">Claude</SelectItem>
                <SelectItem value="ollama">Ollama (Local)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key</Label>
            <Input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={provider === "ollama" ? "Not required for Ollama" : "sk-..."}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="endpoint">Custom Endpoint (optional)</Label>
            <Input
              id="endpoint"
              type="text"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              placeholder="https://api.openai.com/v1/chat/completions"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <Input
              id="model"
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
            />
          </div>

          <label className="flex items-center gap-2.5 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="rounded border-input"
            />
            Set as default provider
          </label>

          <Button onClick={handleSave} className="gap-1.5">
            <Save className="h-4 w-4" />
            Save Configuration
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Cpu className="h-4 w-4 text-primary" />
            Saved Configurations
          </CardTitle>
          <CardDescription>
            Your configured LLM providers
          </CardDescription>
        </CardHeader>
        <CardContent>
          {llmConfigs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No LLM configurations saved yet.
            </p>
          ) : (
            <div className="space-y-2">
              {llmConfigs.map((config) => (
                <div
                  key={config.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Badge variant="secondary" className="text-[11px]">
                      {config.provider}
                    </Badge>
                    <span className="text-sm text-muted-foreground">{config.model}</span>
                    {config.is_default && (
                      <Badge className="text-[10px] h-4 px-1.5 bg-amber-500/15 text-amber-400 border-amber-500/25 hover:bg-amber-500/20 gap-1">
                        <Star className="h-2.5 w-2.5" />
                        default
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteLlmConfig(config.id)}
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
