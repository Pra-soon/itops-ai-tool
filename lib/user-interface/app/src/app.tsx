import { useContext } from "react";
import {
  BrowserRouter,
  HashRouter,
  Outlet,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";
import { AppContext } from "./common/app-context";
import GlobalHeader from "./components/global-header";
import Playground from "./pages/chatbot/playground/playground";
import NotFound from "./pages/not-found";
import AddData from "./pages/admin/add-data";
import WorkspacePane from "./pages/admin/workspace";
import UserFeedbackPage from "./pages/admin/user-feedback";
import SessionPage from "./pages/chatbot/sessions/sessions"
import LlmEvaluationPage from "./pages/admin/llm-evaluation-page.tsx"; 
import DetailedEvaluationPage from "./pages/admin/detailed-evaluation-page.tsx";
import { v4 as uuidv4 } from "uuid";
import "./styles/app.scss";
import KPIsPage from "./pages/admin/kpis";


function App() {
  const appContext = useContext(AppContext);
  const Router = BrowserRouter;

  return (
    <div style={{ height: "100%" }}>
      <Router>
        <GlobalHeader />
        <div style={{ height: "56px", backgroundColor: "#000716" }}>&nbsp;</div>
        <div>
          <Routes>            
            <Route
                index
                path="/"
                element={<Navigate to={`/chatbot/playground/${uuidv4()}`} replace />}
            />            
            <Route path="/chatbot" element={<Outlet />}>
              <Route path="playground/:sessionId" element={<Playground />} />
              <Route path="sessions" element={<SessionPage />} />              
            </Route>
            <Route path="/admin" element={<Outlet />}>
             <Route path="add-data" element={<AddData />} />          
             <Route path="data" element={<WorkspacePane />} />   
             <Route path="user-feedback" element={<UserFeedbackPage />} />
             <Route path="kpis" element={<KPIsPage />} />  
             <Route path="llm-evaluation" element={<Outlet />}>
            <Route index element={<LlmEvaluationPage />} />
            <Route
              path=":evaluationId"
              element={
                <DetailedEvaluationPage
                  documentType="detailedEvaluation" 
                />
              }
            />
          </Route>                          
            </Route>
            <Route path="*" element={<Navigate to={`/chatbot/playground/${uuidv4()}`} replace />} />
          </Routes>
        </div>
      </Router>
    </div>
  );
}

export default App;
