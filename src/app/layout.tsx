import type { Metadata } from "next";
import { Inter, Orbitron } from "next/font/google";
import AppShell from "../components/AppShell/AppShell";
import TelemetryProvider from "../components/TelemetryProvider/TelemetryProvider";
import { NotificationProvider } from "../components/NotificationSystem/NotificationSystem";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter"
});

const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron"
});

export const metadata: Metadata = {
  title: "KOU Racing Telemetry",
  description: "Official Electrical Formula Student Team Telemetry Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${orbitron.variable}`}>
        <TelemetryProvider>
          <NotificationProvider>
            <AppShell>{children}</AppShell>
          </NotificationProvider>
        </TelemetryProvider>
      </body>
    </html>
  );
}