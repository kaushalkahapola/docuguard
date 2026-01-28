import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AmplifyConfigProvider from "@/lib/amplify-config";
import { AuthProvider } from "@/context/AuthContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DocuGuard - Secure Document Vault",
  description: "Role-based secure document access powered by AWS",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AmplifyConfigProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </AmplifyConfigProvider>
      </body>
    </html>
  );
}
