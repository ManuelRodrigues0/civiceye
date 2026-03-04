import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { initAI } from "./ai/initAI";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Report from "./pages/Report";
import MapPage from "./pages/MapPage";
import AITest from "./pages/AITest";
import Resolve from "./pages/Resolve";
import "./styles/layout.css";
function App() {

useEffect(() => {
  initAI(); // warm up AI on app start
}, []);

  return (
    <BrowserRouter>
      <Routes>

        {/* Layout wrapper */}
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/report" element={<Report />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/ai-test" element={<AITest />} />
          <Route path="/resolve/:id" element={<Resolve />} />
        </Route>

      </Routes>
    </BrowserRouter>
  );
}

export default App;