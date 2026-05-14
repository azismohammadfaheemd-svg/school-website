"use client";

import { useEffect, useState } from "react";
import PageHeader from "../components/PageHeader";
import { supabase } from "@/lib/supabaseClient";

const defaultSettings = {
  contact_number: "(555) 014-2026",
  email: "office@northbridge.edu",
  address: "1200 Academy Drive\nSpringfield, ST 00000",
  facebook_url: "",
  office_hours: "",
};

export default function Contact() {
  const [settings, setSettings] = useState(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isActive = true;

    async function fetchSettings() {
      setIsLoading(true);
      setErrorMessage("");

      const { data, error } = await supabase
        .from("site_settings")
        .select(
          "contact_number, email, address, facebook_url, office_hours, updated_at"
        )
        .order("updated_at", { ascending: false })
        .limit(1);

      if (!isActive) {
        return;
      }

      if (error) {
        setErrorMessage(error.message);
        setIsLoading(false);
        return;
      }

      if (data?.[0]) {
        setSettings({
          contact_number:
            data[0].contact_number || defaultSettings.contact_number,
          email: data[0].email || defaultSettings.email,
          address: data[0].address || defaultSettings.address,
          facebook_url: data[0].facebook_url || "",
          office_hours: data[0].office_hours || "",
        });
      }

      setIsLoading(false);
    }

    fetchSettings();

    return () => {
      isActive = false;
    };
  }, []);

  const addressLines = String(settings.address || defaultSettings.address)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <>
      <PageHeader
        title="Contact Us"
        description="Reach our front office, enrollment team, or student support staff."
      />
      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        {isLoading && (
          <p className="rounded border border-sky-100 bg-sky-50 p-6 text-slate-700">
            Loading contact information...
          </p>
        )}

        {errorMessage && (
          <p className="rounded border border-red-200 bg-red-50 p-6 font-semibold text-red-700">
            {errorMessage}
          </p>
        )}

        {!isLoading && !errorMessage && (
          <div className="grid gap-8 lg:grid-cols-3">
            <article className="rounded border border-sky-100 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-sky-950">Main Office</h2>
              <p className="mt-4 text-slate-700">
                {settings.contact_number || "Contact number not available"}
              </p>
              <p className="mt-2 text-slate-700">
                {settings.email || "Email not available"}
              </p>
            </article>

            <article className="rounded border border-sky-100 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-sky-950">Address</h2>
              <p className="mt-4 leading-7 text-slate-700">
                {addressLines.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </p>
            </article>

            <article className="rounded border border-sky-100 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-sky-950">Office Hours</h2>
              <p className="mt-4 text-slate-700">
                {settings.office_hours || "Office hours not available"}
              </p>
              {settings.facebook_url && (
                <a
                  href={settings.facebook_url}
                  className="mt-4 inline-flex rounded bg-sky-900 px-4 py-2 font-bold text-white transition hover:bg-sky-950"
                >
                  Visit Facebook Page
                </a>
              )}
            </article>
          </div>
        )}
      </section>
    </>
  );
}
