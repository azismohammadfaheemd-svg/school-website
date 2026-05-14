"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import SiteBrandName, { DEFAULT_SITE_NAME } from "../components/SiteBrandName";

const adminLinks = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/news", label: "News" },
  { href: "/admin/forms", label: "Enrollment Forms" },
  { href: "/admin/programs", label: "Programs" },
  { href: "/admin/slides", label: "Homepage Slides" },
  { href: "/admin/settings", label: "Contact/Logo Settings" },
  { href: "/admin/applications", label: "Applications" },
];

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/admin/login";
  const [isCheckingSession, setIsCheckingSession] = useState(!isLoginPage);
  const [hasSession, setHasSession] = useState(isLoginPage);
  const [errorMessage, setErrorMessage] = useState("");
  const [siteName, setSiteName] = useState(DEFAULT_SITE_NAME);

  useEffect(() => {
    let isActive = true;

    if (isLoginPage) {
      return;
    }

    async function checkSession() {
      const { data, error } = await supabase.auth.getSession();

      if (!isActive) {
        return;
      }

      if (error) {
        setErrorMessage(error.message);
        setHasSession(false);
        setIsCheckingSession(false);
        return;
      }

      if (!data.session) {
        router.push("/admin/login");
        return;
      }

      setHasSession(true);
      setIsCheckingSession(false);
    }

    checkSession();

    return () => {
      isActive = false;
    };
  }, [isLoginPage, router]);

  useEffect(() => {
    let isActive = true;

    if (isLoginPage) {
      return;
    }

    async function fetchSiteName() {
      const { data, error } = await supabase
        .from("site_settings")
        .select("site_name, updated_at")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!isActive || error) {
        return;
      }

      setSiteName(data?.site_name?.trim() || DEFAULT_SITE_NAME);
    }

    fetchSiteName();

    return () => {
      isActive = false;
    };
  }, [isLoginPage]);

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    router.push("/admin/login");
  }

  if (isLoginPage) {
    return children;
  }

  if (isCheckingSession) {
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        <p className="rounded border border-slate-200 bg-white p-6 text-slate-700 shadow-sm">
          Checking admin session...
        </p>
      </main>
    );
  }

  if (!hasSession) {
    return null;
  }

  return (
    <div className="admin-shell min-h-screen bg-slate-100 lg:flex">
      <aside className="bg-sky-950 text-white lg:fixed lg:inset-y-0 lg:w-72">
        <div className="flex h-full flex-col px-6 py-6">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-yellow-300">
              <SiteBrandName
                siteName={siteName}
                firstClassName="text-yellow-300"
                restClassName="text-sky-100"
              />
            </p>
            <h1 className="mt-3 text-2xl font-bold">Admin Dashboard</h1>
          </div>

          <nav className="mt-8 grid gap-2">
            {adminLinks.map((link) => {
              const isActive = pathname === link.href;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded px-4 py-3 text-sm font-semibold transition ${
                    isActive
                      ? "bg-yellow-300 text-sky-950"
                      : "text-sky-100 hover:bg-sky-900 hover:text-white"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <button
            type="button"
            onClick={handleLogout}
            className="mt-8 rounded border border-sky-700 px-4 py-3 text-left text-sm font-bold text-yellow-300 transition hover:bg-sky-900"
          >
            Logout
          </button>

          {errorMessage && (
            <p className="mt-4 rounded border border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-700">
              {errorMessage}
            </p>
          )}
        </div>
      </aside>

      <main className="min-h-screen flex-1 lg:ml-72">
        <div className="px-6 py-8 lg:px-10">{children}</div>
      </main>
    </div>
  );
}
