import type { Metadata, Viewport } from "next";
import "@/app/globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { TopBar } from "@/components/nav/top-bar";

export const metadata: Metadata = {
  title: "React 2026 Ecosystem Course",
  description:
    "Master the modern React 2026 ecosystem — 39 Codecademy-style interactive exercises.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1220" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <TopBar />
          <main data-testid="app-main">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
