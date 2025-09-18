// Simplified AppHeader without Tauri dependencies
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  Menu, 
  Settings, 
  Sun, 
  Moon,
  MessageSquare,
  Palette
} from "lucide-react";
import { useLayoutStore } from "@/stores/layoutStore";
import { useThemeStore, type Accent } from "@/stores/ThemeStore";
import { useSettingsStore } from "@/stores/SettingsStore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AppHeader() {
  const { toggleFileTree } = useLayoutStore();
  const { theme, toggleTheme, accent, setAccent } = useThemeStore();
  const { logoSettings, windowTitle } = useSettingsStore();
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => location.pathname === path;

  const accents: { value: Accent; label: string; color: string }[] = [
    { value: "blue", label: "Blue", color: "bg-blue-500" },
    { value: "green", label: "Green", color: "bg-green-500" },
    { value: "purple", label: "Purple", color: "bg-purple-500" },
    { value: "orange", label: "Orange", color: "bg-orange-500" },
    { value: "pink", label: "Pink", color: "bg-pink-500" },
  ];

  return (
    <div className="bg-muted border-b px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {/* Menu Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleFileTree}
          className="text-muted-foreground"
        >
          <Menu size={16} />
        </Button>

        {/* Logo and Title */}
        <div className="flex items-center gap-2">
          {logoSettings?.useCustomLogo && logoSettings?.customLogoPath && (
            <img
              src={logoSettings.customLogoPath}
              alt="Logo"
              className="w-6 h-6 object-contain"
            />
          )}
          <span className="font-semibold text-sm">{windowTitle}</span>
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-1">
          <Button
            variant={isActive("/") || isActive("/chat") ? "secondary" : "ghost"}
            size="sm"
            onClick={() => navigate("/chat")}
            className="gap-1"
          >
            <MessageSquare size={14} />
            Chat
          </Button>

          <Button
            variant={isActive("/settings") ? "secondary" : "ghost"}
            size="sm"
            onClick={() => navigate("/settings")}
            className="gap-1"
          >
            <Settings size={14} />
            Settings
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleTheme}
          className="text-muted-foreground"
        >
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </Button>

        {/* Accent Color Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
            >
              <Palette size={16} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Accent Color</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup 
              value={accent} 
              onValueChange={(value) => setAccent(value as Accent)}
            >
              {accents.map((color) => (
                <DropdownMenuRadioItem
                  key={color.value}
                  value={color.value}
                  className="flex items-center gap-2"
                >
                  <div className={`w-3 h-3 rounded-full ${color.color}`} />
                  {color.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}