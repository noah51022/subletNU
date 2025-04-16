import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "@/contexts/AppContext";
import MainLayout from "./components/MainLayout";

// Pages
import HomePage from "./pages/HomePage";
import AuthPage from "./pages/AuthPage";
import SubletDetailPage from "./pages/SubletDetailPage";
import CreateSubletPage from "./pages/CreateSubletPage";
import EditSubletPage from "./pages/EditSubletPage";
import MessagesPage from "./pages/MessagesPage";
import ProfilePage from "./pages/ProfilePage";
import NotFound from "./pages/NotFound";

// Create a client
const queryClient = new QueryClient();

const App = () => {
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AppProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <Routes>
              <Route path="/" element={<MainLayout><HomePage /></MainLayout>} />
              <Route path="/create" element={<MainLayout><CreateSubletPage /></MainLayout>} />
              <Route path="/messages" element={<MainLayout><MessagesPage /></MainLayout>} />
              <Route path="/messages/:userId" element={<MainLayout><MessagesPage /></MainLayout>} />
              <Route path="/profile" element={<MainLayout><ProfilePage /></MainLayout>} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/sublet/:subletId" element={<SubletDetailPage />} />
              <Route path="/edit/:subletId" element={<EditSubletPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </TooltipProvider>
        </AppProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
};

export default App;
