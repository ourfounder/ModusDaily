import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "./ming/ming.css";
import "./skins.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ModusDaily",
  description:
    "Daily command surface — pomodoro timer, kanban, briefing. By Jim Benson.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`h-full antialiased ${inter.variable}`}>
      <head>
        {/* Prevent flash of wrong skin on load */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem("modusdaily.skin");if(s)document.addEventListener("DOMContentLoaded",function(){document.body.setAttribute("data-skin",s)})}catch(e){}})()`,
          }}
        />
      </head>
      <body className="ming-root min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
