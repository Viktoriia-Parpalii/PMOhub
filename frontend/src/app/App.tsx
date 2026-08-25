import { AppProvider } from "./store";
import { AppContent } from "./AppContent";
import { SystemAlertDialog } from "../components/ui/SystemAlertDialog";

export default function App() {
  return (
    <AppProvider>
      <SystemAlertDialog />
      <AppContent />
    </AppProvider>
  );
}
