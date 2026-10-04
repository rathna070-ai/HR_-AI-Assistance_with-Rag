import { domAnimation, LazyMotion } from "framer-motion";
import { lazy, Suspense } from "react";
import { Toaster } from "react-hot-toast";
import { BrowserRouter, Route, Routes } from "react-router-dom";

// Each page is its own chunk, so a visit to one page does not download the other.
const ChatPage = lazy(() => import("@/pages/ChatPage").then((m) => ({ default: m.ChatPage })));
const IngestionPage = lazy(() => import("@/features/ingestion").then((m) => ({ default: m.IngestionPage })));

// "/" is the retrieval chat; the ingestion page keeps its own route.
export default function App() {
  return (
    // LazyMotion + m components load only the DOM animation features of Framer Motion.
    <LazyMotion features={domAnimation} strict>
      <BrowserRouter>
        <Toaster position="bottom-right" toastOptions={{ style: { background: "#1e1e28", color: "#f1f1f5" } }} />
        <Suspense fallback={<div className="h-full bg-bg-base" aria-busy="true" />}>
          <Routes>
            <Route path="/" element={<ChatPage />} />
            <Route path="/ingestion" element={<IngestionPage />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </LazyMotion>
  );
}
