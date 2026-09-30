import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prep Manager",
  description: "Visual preparation evidence for every prepared unit.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
