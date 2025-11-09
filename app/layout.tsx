import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/lib/hooks/use-toast";

export const metadata: Metadata = {
  title: "Model Product Compositor",
  description:
    "Upload a mannequin and product to generate polished e-commerce imagery with automated compositing."
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-surface antialiased">
        <ToastProvider>
          <main className="min-h-screen">{children}</main>
        </ToastProvider>
      </body>
    </html>
  );
}
