import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "@fontsource/fira-sans/400.css";
import "@fontsource/fira-sans/500.css";
import "@fontsource/fira-sans/600.css";
import "@fontsource/fira-sans/700.css";
import "@fontsource/fira-code/400.css";
import "@fontsource/fira-code/500.css";

import "./estilos.css";
import { App } from "./App";

const raiz = document.getElementById("root");
if (!raiz) throw new Error("elemento #root não encontrado");

createRoot(raiz).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
