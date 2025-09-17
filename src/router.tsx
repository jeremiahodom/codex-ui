import { createHashRouter } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import ChatPage from "@/pages/chat";
import SettingsPage from "./pages/settings";
import { useEffect } from "react";
import { useLayoutStore } from "./stores/layoutStore";

function Root() {
  const { lastRoute } = useLayoutStore();

  useEffect(() => {
    if (lastRoute && lastRoute !== "/") {
      window.location.hash = lastRoute;
    }
  }, []);
  return <Layout />;
}

export const router = createHashRouter([
  {
    path: "/",
    element: <Root />,
    children: [
      {
        index: true,
        element: <ChatPage />,
      },
      {
        path: "chat",
        element: <ChatPage />,
      },
      {
        path: "settings",
        element: <SettingsPage />,
      },
    ],
  },
]);
