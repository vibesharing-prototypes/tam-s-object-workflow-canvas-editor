import { Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { HomePage } from "@/pages/HomePage";
import { FindingsListPage } from "@/pages/FindingsListPage";
import { FindingDetailPage } from "@/pages/FindingDetailPage";
import { WorkflowPage } from "@/pages/WorkflowPage";
import { WorkflowVersionsPage } from "@/pages/WorkflowVersionsPage";
import { WorkflowVersionDetailPage } from "@/pages/WorkflowVersionDetailPage";

export function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/findings" element={<FindingsListPage />} />
        <Route
          path="/findings/workflow/versions/:version"
          element={<WorkflowVersionDetailPage />}
        />
        <Route
          path="/findings/workflow/versions"
          element={<WorkflowVersionsPage />}
        />
        <Route path="/findings/workflow" element={<WorkflowPage />} />
        <Route path="/findings/:id" element={<FindingDetailPage />} />
      </Routes>
    </AppShell>
  );
}
