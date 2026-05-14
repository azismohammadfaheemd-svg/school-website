import PublicShell from "./components/PublicShell";
import "./globals.css";

export const metadata = {
  title: "JMD Training Institute",
  description:
    "A modern public website for JMD Training Institute.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-sky-50 text-slate-900">
        <PublicShell>{children}</PublicShell>
      </body>
    </html>
  );
}
