import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mafia at Campus Home",
  description: "An interactive mafia & clue game for the house.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
