
  import { createRoot } from "react-dom/client";
  import App from "./App.tsx";
  import "./styles/globals.css";
  import { installAuthRetry } from "./utils/auth-retry";

  // Renova o token e repete a chamada quando a API responde 401 (ver utils/auth-retry.ts)
  installAuthRetry();

  createRoot(document.getElementById("root")!).render(<App />);
