import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { GlobalThemeFab } from "@/components/GlobalThemeFab";

export const metadata: Metadata = {
  title: "IELTS Mock Test Platform",
  description: "IELTS-style mock exams for your centre",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased bg-background text-foreground">
        <Providers>
          {children}
          <GlobalThemeFab />
        </Providers>
      </body>
    </html>
  );
}
