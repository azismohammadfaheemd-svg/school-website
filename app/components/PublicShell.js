"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import SiteBrandName, { DEFAULT_SITE_NAME } from "./SiteBrandName";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/programs", label: "Programs" },
  { href: "/news", label: "News" },
  { href: "/enrollment", label: "Enrollment" },
  { href: "/contact", label: "Contact" },
];

const defaultSettings = {
  site_name: DEFAULT_SITE_NAME,
  logo_url: "",
  contact_number: "(555) 014-2026",
  email: "office@northbridge.edu",
  address: "1200 Academy Drive\nSpringfield, ST 00000",
  facebook_url: "",
  office_hours: "",
};

const LOGO_URL_CACHE_KEY = "schoolWebsiteLogoUrl";

function getCachedLogoUrl() {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    return window.localStorage.getItem(LOGO_URL_CACHE_KEY) || "";
  } catch {
    return "";
  }
}

function cacheLogoUrl(logoUrl) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (logoUrl) {
      window.localStorage.setItem(LOGO_URL_CACHE_KEY, logoUrl);
    } else {
      window.localStorage.removeItem(LOGO_URL_CACHE_KEY);
    }
  } catch {
    // Ignore storage failures; the fetched settings still drive the UI.
  }
}

export default function PublicShell({ children }) {
  const pathname = usePathname();
  const isAdminPage = pathname.startsWith("/admin");
  const [settings, setSettings] = useState(defaultSettings);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [logoLoadFailed, setLogoLoadFailed] = useState(false);

  useEffect(() => {
    let isActive = true;

    if (isAdminPage) {
      return;
    }

    async function fetchSettings() {
      const cachedLogoUrl = getCachedLogoUrl();

      if (cachedLogoUrl) {
        setSettings((currentSettings) => ({
          ...currentSettings,
          logo_url: cachedLogoUrl,
        }));
        setLogoLoadFailed(false);
      }

      try {
        const { data, error } = await supabase
          .from("site_settings")
          .select(
            "site_name, logo_url, contact_number, email, address, facebook_url, office_hours, updated_at"
          )
          .order("updated_at", { ascending: false })
          .limit(1);

        if (!isActive || error || !data?.[0]) {
          if (isActive) {
            setSettingsLoaded(true);
          }
          return;
        }

        const nextSettings = {
          site_name: data[0].site_name || DEFAULT_SITE_NAME,
          logo_url: data[0].logo_url || "",
          contact_number:
            data[0].contact_number || defaultSettings.contact_number,
          email: data[0].email || defaultSettings.email,
          address: data[0].address || defaultSettings.address,
          facebook_url: data[0].facebook_url || "",
          office_hours: data[0].office_hours || "",
        };

        setSettings(nextSettings);
        setLogoLoadFailed(false);
        setSettingsLoaded(true);
        cacheLogoUrl(nextSettings.logo_url);
      } catch {
        if (isActive) {
          setSettingsLoaded(true);
        }
      }
    }

    fetchSettings();

    return () => {
      isActive = false;
    };
  }, [isAdminPage]);

  if (isAdminPage) {
    return children;
  }

  const addressLines = String(settings.address || defaultSettings.address)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const hasLogo = settings.logo_url && !logoLoadFailed;
  const showDefaultLogo = settingsLoaded && !hasLogo;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-sky-100 bg-white">
        <nav className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            {hasLogo ? (
              <img
                src={settings.logo_url}
                alt={`${settings.site_name} logo`}
                className="h-16 w-16 object-contain sm:h-[90px] sm:w-[90px]"
                onError={() => setLogoLoadFailed(true)}
              />
            ) : showDefaultLogo ? (
              <span className="flex h-16 w-16 items-center justify-center rounded bg-sky-100 text-xl font-bold text-emerald-700 ring-1 ring-sky-200 sm:h-[90px] sm:w-[90px] sm:text-3xl">
                GH
              </span>
            ) : (
              <span
                className="block h-16 w-16 rounded bg-slate-100 ring-1 ring-slate-200 sm:h-[90px] sm:w-[90px]"
                aria-hidden="true"
              />
            )}
            <span>
              <span className="block text-lg font-bold text-sky-950">
                <SiteBrandName
                  siteName={settings.site_name}
                  firstClassName="text-yellow-600"
                  restClassName="text-sky-950"
                />
              </span>
              <span className="block text-sm text-emerald-700">
                Learn well. Live well.
              </span>
            </span>
          </Link>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-slate-700">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="transition hover:text-emerald-700"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </nav>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="bg-sky-950 text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-10 sm:grid-cols-3 lg:px-8">
          <div>
            <div className="flex items-center gap-3">
              {hasLogo ? (
                <img
                  src={settings.logo_url}
                  alt={`${settings.site_name} logo`}
                  className="h-14 w-14 object-contain"
                  onError={() => setLogoLoadFailed(true)}
                />
              ) : showDefaultLogo ? (
                <span className="flex size-11 items-center justify-center rounded bg-sky-100 text-lg font-bold text-emerald-700 ring-1 ring-sky-800">
                  GH
                </span>
              ) : (
                <span
                  className="block size-11 rounded bg-sky-900 ring-1 ring-sky-800"
                  aria-hidden="true"
                />
              )}
              <p className="text-lg font-bold text-emerald-200">
                <SiteBrandName
                  siteName={settings.site_name}
                  firstClassName="text-yellow-300"
                  restClassName="text-emerald-200"
                />
              </p>
            </div>
            <p className="mt-3 text-sm leading-6 text-sky-100">
              Preparing senior high school students for college, careers,
              leadership, and service.
            </p>
          </div>
          <div>
            <p className="font-semibold text-emerald-200">Office</p>
            <p className="mt-3 text-sm leading-6 text-sky-100">
              {addressLines.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
              {settings.contact_number && (
                <span className="block">{settings.contact_number}</span>
              )}
              {settings.email && <span className="block">{settings.email}</span>}
              {settings.office_hours && (
                <span className="block">{settings.office_hours}</span>
              )}
            </p>
            {settings.facebook_url && (
              <Link
                href={settings.facebook_url}
                className="mt-3 inline-flex text-sm font-semibold text-emerald-200 hover:text-white"
              >
                Facebook Page
              </Link>
            )}
          </div>
          <div>
            <p className="font-semibold text-emerald-200">Quick Links</p>
            <div className="mt-3 flex flex-col gap-2 text-sm text-sky-100">
              <Link href="/programs" className="hover:text-white">
                Strands and Courses
              </Link>
              <Link href="/enrollment" className="hover:text-white">
                Enrollment
              </Link>
              <Link href="/contact" className="hover:text-white">
                Contact Us
              </Link>
            </div>
          </div>
        </div>
        <div className="border-t border-sky-900 px-6 py-4 text-center text-sm text-sky-100">
          &copy; 2026 {settings.site_name || DEFAULT_SITE_NAME}. All rights
          reserved.
        </div>
      </footer>
    </div>
  );
}
