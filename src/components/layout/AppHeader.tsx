import {
  PartyPopper,
  Usb,
  PanelLeft,
  Settings,
  BarChart3,
  Sun,
  Moon,
  Brain,
  Palette,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useLayoutStore } from "@/stores/layoutStore";
import { useState, useEffect } from "react";
import { useThemeStore, type Accent } from "@/stores/ThemeStore";
import { useSettingsStore } from "@/stores/SettingsStore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import supabase from "@/lib/supabase";

export function AppHeader() {
  const { showFileTree, toggleFileTree, toggleChatPane } = useLayoutStore();
  const { theme, toggleTheme, accent, setAccent } = useThemeStore();
  const { logoSettings } = useSettingsStore();
  const [codexVersion, setCodexVersion] = useState<string>("");
  const [isCodexAvailable, setIsCodexAvailable] = useState<boolean>(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleLogout = async () => {
    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
    } catch (e) {
      console.error("Error signing out:", e);
    } finally {
      navigate("/login", { replace: true });
    }
  };

  useEffect(() => {
    const checkVersion = async () => {
      try {
        const version = await invoke<string>("check_codex_version");
        setCodexVersion(version);
        setIsCodexAvailable(true);
      } catch (error) {
        setCodexVersion("Not available");
        setIsCodexAvailable(false);
      }
    };

    checkVersion();
  }, []);

  return (
    <div data-tauri-drag-region className="flex justify-between px-2">
      <span className="flex gap-2 items-center">
        <Link to="/chat" className="flex hover:text-primary items-center gap-1">
          {logoSettings.useCustomLogo && logoSettings.customLogoPath ? (
            <img
              src={logoSettings.customLogoPath}
              alt="Custom Logo"
              className="h-6 w-auto object-contain"
            />
          ) : (
            <span className="flex gap-2 items-center">
              <div
                className={`w-2 h-2 rounded-full ${isCodexAvailable ? "bg-green-500" : "bg-destructive"}`}
              ></div>
              <Badge>{codexVersion}</Badge>
            </span>
          )}
          Chat
        </Link>

        {/* Welcome button to projects page */}
        <Link to="/" className="flex hover:text-primary items-center gap-1">
          <PartyPopper className="w-5 h-5" /> Projects
        </Link>

        {location.pathname === "/chat" && (
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFileTree}
            className={`h-6 w-6 ${showFileTree ? "bg-primary/20" : ""}`}
          >
            <PanelLeft className="w-3 h-3" />
          </Button>
        )}
      </span>

      <span className="flex gap-0 h-6">
        {location.pathname === "/chat" && (
          <McpDialog>
            <Button variant="ghost" className="flex gap-1 h-6">
              <Usb />
              MCP
            </Button>
          </McpDialog>
        )}

        <Link
          to="/usage"
          className="flex hover:text-primary items-center gap-1"
        >
          <BarChart3 className="w-4 h-4" /> Usage
        </Link>

        <Button variant="ghost" onClick={toggleChatPane} className="h-6 w-6">
          <Brain />
        </Button>

        <Button variant="ghost" className="h-6 w-6" onClick={toggleTheme}>
          {theme === "dark" ? <Sun /> : <Moon />}
        </Button>

        {/* Accent color selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-6 w-6">
              <Palette />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Accent Color</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={accent} onValueChange={(val) => setAccent(val as Accent)}>
              <DropdownMenuRadioItem value="pink">
                <span className="inline-flex items-center gap-2">
                  <span className="inline-block size-3 rounded-full bg-pink-500" /> Pink
                </span>
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="blue">
                <span className="inline-flex items-center gap-2">
                  <span className="inline-block size-3 rounded-full bg-blue-500" /> Blue
                </span>
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="green">
                <span className="inline-flex items-center gap-2">
                  <span className="inline-block size-3 rounded-full bg-emerald-500" /> Green
                </span>
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="purple">
                <span className="inline-flex items-center gap-2">
                  <span className="inline-block size-3 rounded-full bg-purple-500" /> Purple
                </span>
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="orange">
                <span className="inline-flex items-center gap-2">
                  <span className="inline-block size-3 rounded-full bg-orange-500" /> Orange
                </span>
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <Link
          to="/settings"
          className="flex hover:text-primary items-center gap-1"
        >
          <Settings className="w-4 h-4" />
          Settings
        </Link>

        {(import.meta.env.VITE_ENABLE_AUTH === 'true') && (
          <>
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-6 w-6 p-0 rounded-full">
                    {user.user_metadata?.avatar_url ? (
                      <img
                        src={user.user_metadata.avatar_url}
                        className="rounded-full w-6 h-6"
                        alt="User avatar"
                      />
                    ) : (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs">
                        {user.email?.charAt(0)?.toUpperCase() ?? "U"}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>Sign out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link
                to="/login"
                className="flex hover:text-primary items-center gap-1 px-2"
              >
                login
              </Link>
            )}
          </>
        )}
      </span>
    </div>
  );
}
