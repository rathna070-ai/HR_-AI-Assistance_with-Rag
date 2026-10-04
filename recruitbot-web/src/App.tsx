import { Toaster } from "react-hot-toast";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { IngestionPage } from "@/features/ingestion";
import { ChatPage } from "@/pages/ChatPage";

// "/" is the retrieval chat; the ingestion page keeps its own route.
export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="bottom-right" toastOptions={{ style: { background: "#1e1e28", color: "#f1f1f5" } }} />
      <Routes>
        <Route path="/" element={<ChatPage />} />
        <Route path="/ingestion" element={<IngestionPage />} />
      </Routes>
    </BrowserRouter>
  );
}
