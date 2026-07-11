import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "../presentation/providers/AuthProvider";
import { OfflineProvider } from "../offline/providers/OfflineProvider";
import { SyncProvider } from "../offline/providers/SyncProvider";
import { NotificationProvider } from "../presentation/providers/NotificationProvider";
import { LoadingProvider } from "../presentation/providers/LoadingProvider";
import { QueryProvider } from "../presentation/providers/QueryProvider";
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
  title: "MateCode - Workspace de agencias digitales",
  description: "Tomate un mate. La IA hace el code.",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-[#09090B] text-zinc-100">
        <QueryProvider>
          <NotificationProvider>
            <LoadingProvider>
              <OfflineProvider>
                <SyncProvider>
                  <AuthProvider>{children}</AuthProvider>
                </SyncProvider>
              </OfflineProvider>
            </LoadingProvider>
          </NotificationProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
