import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar } from "./components/Sidebar";
import { Dashboard } from "./pages/Dashboard";
import { ProjectView } from "./pages/ProjectView";
import { AnalysisView } from "./pages/AnalysisView";
import { ExportView } from "./pages/ExportView";
import { Settings } from "./pages/Settings";

function App() {
  return (
    <TooltipProvider>
      <BrowserRouter>
        <div className="flex h-screen bg-background text-foreground">
          <Sidebar />
          <main className="flex-1 overflow-auto">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/project/:id" element={<ProjectView />} />
              <Route path="/project/:id/analysis" element={<AnalysisView />} />
              <Route path="/project/:id/export" element={<ExportView />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </TooltipProvider>
  );
}

export default App;
