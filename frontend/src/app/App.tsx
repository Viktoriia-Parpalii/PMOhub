import { AppProvider } from "./store";
import { AppContent } from "./AppContent";
import { SystemAlertDialog } from "../components/ui/SystemAlertDialog";
import { ToastNotifications } from "../components/ui/ToastNotifications";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "../api/queryClient";

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <SystemAlertDialog />
        <ToastNotifications />
        <AppContent />
      </AppProvider>
    </QueryClientProvider>
  );
}
