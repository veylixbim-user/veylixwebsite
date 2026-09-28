import type { Metadata } from "next";
import "../globals.css";
import { inter, jetbrains } from "../fonts";
import { themeScript } from "@/components/layout/theme-toggle";

export const metadata: Metadata = {
  title: { default: "Admin · VEYLIX", template: "%s · VEYLIX Admin" },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" data-theme="dark" suppressHydrationWarning className={`${inter.variable} ${jetbrains.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
