import type { Metadata } from "next";
import "@fontsource-variable/instrument-sans/wght.css";
import "@fontsource/dm-serif-display/latin-400.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Roamday · Nearby plans",
  description:
    "Find a nearby outing that fits your budget, the weather and the time you have.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('roamday-theme')||'light';document.documentElement.dataset.theme=t==='dark'?'dark':'light'}catch{}",
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
