import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
import "./index.css";
import { ThemeProvider } from "@/components/theme-provider";
import { UserProvider } from "@/components/user-provider";
import { router } from "@/router";

// The server answers API calls with 401 once the session expires; send the
// user back to the login page instead of rendering broken data.
const originalFetch = window.fetch.bind(window);
window.fetch = async (input, init) => {
  const res = await originalFetch(input, init);
  const url = input instanceof Request ? input.url : String(input);
  const { pathname } = new URL(url, window.location.href);
  if (
    res.status === 401 &&
    pathname.startsWith("/api/") &&
    !pathname.startsWith("/api/auth/") &&
    window.location.pathname !== "/login"
  ) {
    window.location.assign("/login");
  }
  return res;
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <UserProvider>
        <RouterProvider router={router} />
      </UserProvider>
    </ThemeProvider>
  </StrictMode>
);
