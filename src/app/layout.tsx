import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Web3Provider } from "@/providers/Web3Provider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { SandboxProvider } from "@/contexts/SandboxContext";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tokamak DAO",
  description: "Tokamak DAO Governance Platform",
};

const themeInitScript = `
(function() {
  const storageKey = 'tokamak-dao-theme';
  const theme = localStorage.getItem(storageKey);
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = theme === 'dark' || (theme !== 'light' && systemDark);
  document.documentElement.classList.add(isDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <Web3Provider>
            <SandboxProvider>{children}</SandboxProvider>
          </Web3Provider>
        </ThemeProvider>
      </body>
    </html>
  );
}
