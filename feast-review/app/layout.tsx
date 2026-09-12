import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Feast Dining Group — Reviews",
  description: "Customer review flow for Feast Dining Group restaurants.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
