
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import "./styles/index.css";
  import "@fullcalendar/react/skeleton.css";
  import "@fullcalendar/react/themes/classic/theme.css";
  import "@fullcalendar/react/themes/classic/palette.css";

  createRoot(document.getElementById("root")!).render(<App />);
  