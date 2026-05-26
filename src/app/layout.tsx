import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Arch.design — Software Architecture Principles",
  description:
    "Interactive visualizations of software architecture patterns, infrastructure concepts, cloud design, and networking fundamentals for developers.",
};

const NAV = [
  { href: "/principles", label: "Architecture" },
  { href: "/principles?category=infrastructure", label: "Infrastructure" },
  { href: "/principles?category=cloud", label: "Cloud" },
  { href: "/principles?category=networking", label: "Networking" },
  { href: "/canvas", label: "Canvas" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full bg-zinc-950 text-zinc-100" suppressHydrationWarning>
        <header className="sticky top-0 z-50 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-sm">
          <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 font-semibold text-white hover:text-zinc-200 transition-colors">
              <span className="text-violet-400 font-mono text-base">{"<"}</span>
              <span>arch.design</span>
              <span className="text-violet-400 font-mono text-base">{"/>"}</span>
            </Link>
            <nav className="hidden sm:flex items-center gap-1">
              {NAV.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="px-3 py-1.5 text-sm text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
