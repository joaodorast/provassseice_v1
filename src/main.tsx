
  import { createRoot } from "react-dom/client";
  import App from "./App.tsx";
  import "./styles/globals.css";
  import { installAuthRetry } from "./utils/auth-retry";

  // Renova o token e repete a chamada quando a API responde 401 (ver utils/auth-retry.ts)
  installAuthRetry();

  // Se um arquivo de página não carregar (versão antiga em cache após um novo deploy),
  // recarrega a página uma única vez para pegar a versão atual
  window.addEventListener("vite:preloadError", (event) => {
    event.preventDefault();
    if (!sessionStorage.getItem("seice-chunk-reloaded")) {
      sessionStorage.setItem("seice-chunk-reloaded", "1");
      window.location.reload();
    }
  });

  createRoot(document.getElementById("root")!).render(<App />);
