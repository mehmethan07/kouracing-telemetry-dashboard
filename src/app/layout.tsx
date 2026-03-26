import type { Metadata } from "next";
import { Inter, Orbitron } from "next/font/google";
import AppShell from "../components/AppShell/AppShell";
import TelemetryProvider from "../components/TelemetryProvider/TelemetryProvider";
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
          <AppShell>{children}</AppShell>
        </TelemetryProvider>
      </body>
    </html>
  );
}