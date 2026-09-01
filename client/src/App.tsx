import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import ProjectDetail from "./pages/ProjectDetail";
import FileUpload from "./pages/FileUpload";
import NewTakeoff from "./pages/NewTakeoff";
import TakeoffDetail from "./pages/TakeoffDetail";
import BidReport from "./pages/BidReport";
import AdminSettings from "./pages/AdminSettings";
import Help from "./pages/Help";
import Profile from "./pages/Profile";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/dashboard"} component={Dashboard} />
      <Route path={"/admin"} component={AdminSettings} />
      <Route path={"/admin/settings"} component={AdminSettings} />
      <Route path={"/help"} component={Help} />
      <Route path={"/profile"} component={Profile} />
      <Route path={"/project/:projectId"} component={ProjectDetail} />
      <Route path={"/project/:projectId/upload"} component={FileUpload} />
      <Route path={"/project/:projectId/new-takeoff"} component={NewTakeoff} />
      <Route path={"/project/:projectId/takeoff/:takeoffId"} component={TakeoffDetail} />
      <Route path={"/project/:projectId/bid/:reportId"} component={BidReport} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
