"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import PageHeader from "../components/PageHeader";

function getDurationText(duration) {
  return String(duration || "").trim();
}

export default function Programs() {
  const [programs, setPrograms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function fetchPrograms() {
      setIsLoading(true);
      setErrorMessage("");

      const { data, error } = await supabase
        .from("programs")
        .select(
          "id, title, description, duration, qualification_level, requirements, status, image_url, created_at"
        )
        .eq("status", "published")
        .order("created_at", { ascending: false });

      if (error) {
        setErrorMessage(error.message);
        setPrograms([]);
      } else {
        setPrograms(data || []);
      }

      setIsLoading(false);
    }

    fetchPrograms();
  }, []);

  return (
    <>
      <PageHeader
        title="Strands and Courses"
        description="Students choose a senior high school strand that matches their strengths, interests, and next step after graduation."
      />
      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        {isLoading && (
          <p className="rounded border border-sky-100 bg-white p-6 text-slate-700 shadow-sm">
            Loading programs and courses...
          </p>
        )}

        {errorMessage && (
          <p className="rounded border border-red-200 bg-red-50 p-6 font-semibold text-red-700">
            {errorMessage}
          </p>
        )}

        {!isLoading && !errorMessage && programs.length === 0 && (
          <div className="rounded border border-sky-100 bg-white p-8 text-center shadow-sm">
            <h2 className="text-2xl font-bold text-sky-950">
              No programs available yet.
            </h2>
            <p className="mt-3 text-slate-600">
              Please check back soon for updated course offerings.
            </p>
          </div>
        )}

        {!isLoading && !errorMessage && programs.length > 0 && (
          <div className="grid gap-6 md:grid-cols-3">
            {programs.map((program) => (
              <article
                key={program.id || program.title}
                className="overflow-hidden rounded border border-sky-100 bg-white shadow-sm"
              >
                {program.image_url && (
                  <div
                    className="h-48 bg-slate-100 bg-cover bg-center"
                    style={{ backgroundImage: `url(${program.image_url})` }}
                  />
                )}
                {!program.image_url && (
                  <div className="flex h-48 items-center justify-center bg-gradient-to-br from-sky-100 via-white to-emerald-100 px-6 text-center">
                    <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">
                      Program
                    </p>
                  </div>
                )}
                <div className="p-6">
                  <div className="flex flex-wrap items-center gap-3">
                    {program.qualification_level && (
                      <p className="rounded bg-emerald-100 px-3 py-1 text-sm font-bold text-emerald-800">
                        {program.qualification_level}
                      </p>
                    )}
                    {getDurationText(program.duration) && (
                      <p className="text-sm font-semibold text-slate-500">
                        {getDurationText(program.duration)}
                      </p>
                    )}
                  </div>
                  <h2 className="mt-4 text-2xl font-bold text-sky-950">
                    {program.title}
                  </h2>
                  <p className="mt-3 leading-7 text-slate-600">
                    {program.description}
                  </p>
                  {program.requirements && (
                    <div className="mt-5 border-t border-sky-100 pt-4">
                      <p className="text-sm font-bold uppercase tracking-[0.14em] text-yellow-600">
                        Requirements
                      </p>
                      <p className="mt-2 leading-7 text-slate-600">
                        {program.requirements}
                      </p>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
