import { Inter, JetBrains_Mono } from "next/font/google";

export const inter = Inter({ subsets: ["latin"], variable: "--font-inter-sans", display: "swap" });
// IBM Plex Sans Arabic is self-hosted (public/fonts, @font-face in globals.css) so it can be
// preloaded on Arabic pages only — English pages never download it.
export const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono", display: "swap", preload: false });
