import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SettingsStore {
  excludeFolders: string[];
  addExcludeFolder: (folder: string) => void;
  removeExcludeFolder: (folder: string) => void;
  setExcludeFolders: (folders: string[]) => void;
  activeSection: string;
  setActiveSection: (section: string) => void;
  logoSettings: {
    useCustomLogo: boolean;
    customLogoPath: string;
  };
  setUseCustomLogo: (use: boolean) => void;
  setCustomLogoPath: (path: string) => void;
  windowTitle: string;
  setWindowTitle: (title: string) => void;
}

const DEFAULT_EXCLUDE_FOLDERS = [
  ".git",
  "node_modules",
  ".venv",
  "__pycache__",
  ".next",
  ".nuxt",
  "dist",
  "build",
  ".DS_Store",
  "target",
  ".cargo",
];


export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, _get) => ({
      excludeFolders: DEFAULT_EXCLUDE_FOLDERS,
      activeSection: "provider",
      logoSettings: {
        useCustomLogo: false,
        customLogoPath: "",
      },
      windowTitle: "Codexia",
      addExcludeFolder: (folder: string) =>
        set((state) => ({
          excludeFolders: [...state.excludeFolders, folder],
        })),
      removeExcludeFolder: (folder: string) =>
        set((state) => ({
          excludeFolders: state.excludeFolders.filter((f) => f !== folder),
        })),
      setExcludeFolders: (folders: string[]) =>
        set({ excludeFolders: folders }),
      setActiveSection: (section: string) =>
        set({ activeSection: section }),
      setUseCustomLogo: (use: boolean) =>
        set((state) => ({
          logoSettings: { ...state.logoSettings, useCustomLogo: use },
        })),
      setCustomLogoPath: (path: string) =>
        set((state) => ({
          logoSettings: { ...state.logoSettings, customLogoPath: path },
        })),
      setWindowTitle: (title: string) => {
        set({ windowTitle: title });
        // Window title setting not available in web version
        if (typeof document !== 'undefined') {
          document.title = title;
        }
      },
    }),
    {
      name: "settings-storage",
    },
  ),
);
