"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import HeroSlideshow from "./components/HeroSlideshow";
import { supabase } from "@/lib/supabaseClient";
import SiteBrandName from "./components/SiteBrandName";

function getProgramSummary(description) {
  const cleanDescription = String(description || "").trim();

  if (cleanDescription.length <= 120) {
    return cleanDescription;
  }

  return `${cleanDescription.slice(0, 117).trim()}...`;
}

function getAnnouncementExcerpt(content) {
  const cleanContent = String(content || "").trim();

  if (cleanContent.length <= 120) {
    return cleanContent;
  }

  return `${cleanContent.slice(0, 117).trim()}...`;
}

function getAnnouncementGroups(items) {
  const groups = [];

  for (let index = 0; index < items.length; index += 4) {
    groups.push(items.slice(index, index + 4));
  }

  return groups;
}

export default function Home() {
  const [announcements, setAnnouncements] = useState([]);
  const [programPreviews, setProgramPreviews] = useState([]);
  const [activeAnnouncementGroup, setActiveAnnouncementGroup] = useState(0);
  const [isLoadingAnnouncements, setIsLoadingAnnouncements] = useState(true);
  const [isLoadingPrograms, setIsLoadingPrograms] = useState(true);
  const [announcementError, setAnnouncementError] = useState("");
  const [programError, setProgramError] = useState("");

  useEffect(() => {
    async function fetchAnnouncements() {
      setIsLoadingAnnouncements(true);
      setAnnouncementError("");
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from("news")
        .select("id, title, category, content, image_url, expires_at, created_at")
        .eq("is_published", true)
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) {
        setAnnouncementError(error.message);
        setAnnouncements([]);
      } else {
        setAnnouncements(data || []);
        setActiveAnnouncementGroup(0);
      }

      setIsLoadingAnnouncements(false);
    }

    fetchAnnouncements();
  }, []);

  useEffect(() => {
    let isActive = true;

    async function fetchProgramPreviews() {
      setIsLoadingPrograms(true);
      setProgramError("");

      const { data, error } = await supabase
        .from("programs")
        .select(
          "id, title, description, duration, qualification_level, image_url, status, created_at"
        )
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(5);

      if (!isActive) {
        return;
      }

      if (error) {
        setProgramError(error.message);
        setProgramPreviews([]);
      } else {
        setProgramPreviews(data || []);
      }

      setIsLoadingPrograms(false);
    }

    fetchProgramPreviews();

    return () => {
      isActive = false;
    };
  }, []);

  const announcementGroups = getAnnouncementGroups(announcements);
  const activeAnnouncements = announcementGroups[activeAnnouncementGroup] || [];

  function showPreviousAnnouncementGroup() {
    setActiveAnnouncementGroup((currentGroup) =>
      currentGroup === 0 ? announcementGroups.length - 1 : currentGroup - 1
    );
  }

  function showNextAnnouncementGroup() {
    setActiveAnnouncementGroup((currentGroup) =>
      currentGroup === announcementGroups.length - 1 ? 0 : currentGroup + 1
    );
  }

  return (
    <>
      <HeroSlideshow />

      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-bold text-emerald-700">Programs Preview</p>
            <h2 className="mt-2 text-3xl font-bold text-sky-950">
              Choose a strand with direction.
            </h2>
          </div>
          <Link href="/programs" className="font-bold text-emerald-700">
            View all programs
          </Link>
        </div>

        {isLoadingPrograms && (
          <p className="mt-8 rounded border border-sky-100 bg-sky-50 p-6 text-slate-700">
            Loading programs...
          </p>
        )}

        {programError && (
          <p className="mt-8 rounded border border-red-200 bg-red-50 p-6 font-semibold text-red-700">
            {programError}
          </p>
        )}

        {!isLoadingPrograms && !programError && programPreviews.length === 0 && (
          <p className="mt-8 rounded border border-sky-100 bg-sky-50 p-6 text-slate-700">
            No published programs available yet.
          </p>
        )}

        {!isLoadingPrograms && !programError && programPreviews.length > 0 && (
          <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {programPreviews.map((program, index) => (
              <article
                key={program.id}
                className={`group overflow-hidden rounded border border-sky-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg ${
                  index === 0 ? "md:translate-y-4" : ""
                } ${index === 1 ? "md:-translate-y-2" : ""}`}
              >
                {program.image_url ? (
                  <div
                    className="h-44 bg-slate-100 bg-cover bg-center"
                    style={{ backgroundImage: `url(${program.image_url})` }}
                  />
                ) : (
                  <div className="flex h-44 items-center justify-center bg-gradient-to-br from-sky-100 via-white to-emerald-100 px-6 text-center">
                    <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">
                      Program
                    </p>
                  </div>
                )}
                <div className="p-5">
                  <div className="flex flex-wrap gap-2">
                    {program.qualification_level && (
                      <span className="rounded bg-yellow-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-yellow-800">
                        {program.qualification_level}
                      </span>
                    )}
                    {program.duration && (
                      <span className="rounded bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                        {program.duration}
                      </span>
                    )}
                  </div>
                  <h3 className="mt-4 text-xl font-bold text-sky-950">
                    {program.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {getProgramSummary(program.description)}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mb-8">
            <p className="font-bold text-emerald-700">Latest Announcements</p>
            <h2 className="mt-2 text-3xl font-bold text-sky-950">
              Campus updates for students and families.
            </h2>
          </div>

          {isLoadingAnnouncements && (
            <p className="mt-8 rounded border border-sky-100 bg-sky-50 p-6 text-slate-700">
              Loading announcements...
            </p>
          )}

          {announcementError && (
            <p className="mt-8 rounded border border-red-200 bg-red-50 p-6 font-semibold text-red-700">
              {announcementError}
            </p>
          )}

          {!isLoadingAnnouncements &&
            !announcementError &&
            announcements.length === 0 && (
              <p className="mt-8 rounded border border-sky-100 bg-sky-50 p-6 text-slate-700">
                No announcements available yet.
              </p>
            )}

          {!isLoadingAnnouncements &&
            !announcementError &&
            announcements.length > 0 && (
              <div>
                <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
                  {activeAnnouncements[0] && (
                    <Link
                      href={`/news/${activeAnnouncements[0].id}`}
                      className="group relative flex min-h-[430px] overflow-hidden bg-sky-950 text-white shadow-sm"
                    >
                      {activeAnnouncements[0].image_url ? (
                        <div
                          className="absolute inset-0 bg-cover bg-center transition duration-500 group-hover:scale-105"
                          style={{
                            backgroundImage: `url(${activeAnnouncements[0].image_url})`,
                          }}
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-sky-900 via-emerald-800 to-yellow-500" />
                      )}
                      <div className="absolute inset-0 bg-sky-950/55" />
                      <div className="relative z-10 mt-auto p-6 sm:p-8">
                        <div className="flex flex-wrap items-center gap-3">
                          {activeAnnouncements[0].category && (
                            <span className="rounded bg-yellow-400 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-sky-950">
                              {activeAnnouncements[0].category}
                            </span>
                          )}
                          <span className="text-sm font-semibold text-sky-100">
                            {new Date(
                              activeAnnouncements[0].created_at
                            ).toLocaleDateString()}
                          </span>
                        </div>
                        <h3 className="mt-4 max-w-2xl text-3xl font-bold leading-tight sm:text-4xl">
                          {activeAnnouncements[0].title}
                        </h3>
                        {activeAnnouncements[0].content && (
                          <p className="mt-4 max-w-xl leading-7 text-sky-50">
                            {getAnnouncementExcerpt(
                              activeAnnouncements[0].content
                            )}
                          </p>
                        )}
                      </div>
                    </Link>
                  )}

                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-2">
                    {activeAnnouncements.slice(1, 3).map((announcement, index) => (
                      <Link
                        key={announcement.id}
                        href={`/news/${announcement.id}`}
                        className="group relative flex min-h-[205px] overflow-hidden bg-emerald-800 text-white shadow-sm"
                      >
                        {announcement.image_url ? (
                          <div
                            className="absolute inset-0 bg-cover bg-center transition duration-500 group-hover:scale-105"
                            style={{
                              backgroundImage: `url(${announcement.image_url})`,
                            }}
                          />
                        ) : (
                          <div
                            className={`absolute inset-0 ${
                              index === 0
                                ? "bg-gradient-to-br from-emerald-700 to-sky-900"
                                : "bg-gradient-to-br from-yellow-500 to-sky-900"
                            }`}
                          />
                        )}
                        <div
                          className={`absolute inset-0 ${
                            index === 0 ? "bg-emerald-950/55" : "bg-sky-950/55"
                          }`}
                        />
                        <div className="relative z-10 mt-auto p-5">
                          <div className="flex flex-wrap items-center gap-2">
                            {announcement.category && (
                              <span className="rounded bg-white/90 px-2.5 py-1 text-xs font-bold uppercase tracking-[0.1em] text-sky-950">
                                {announcement.category}
                              </span>
                            )}
                            <span className="text-xs font-semibold text-sky-100">
                              {new Date(
                                announcement.created_at
                              ).toLocaleDateString()}
                            </span>
                          </div>
                          <h3 className="mt-3 text-xl font-bold leading-tight">
                            {announcement.title}
                          </h3>
                        </div>
                      </Link>
                    ))}

                    {activeAnnouncements[3] && (
                      <Link
                        href={`/news/${activeAnnouncements[3].id}`}
                        className="group relative flex min-h-[205px] overflow-hidden bg-sky-950 text-white shadow-sm sm:col-span-2"
                      >
                        {activeAnnouncements[3].image_url ? (
                          <div
                            className="absolute inset-0 bg-cover bg-center transition duration-500 group-hover:scale-105"
                            style={{
                              backgroundImage: `url(${activeAnnouncements[3].image_url})`,
                            }}
                          />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-r from-sky-900 via-emerald-800 to-yellow-500" />
                        )}
                        <div className="absolute inset-0 bg-sky-950/50" />
                        <div className="relative z-10 mt-auto p-5">
                          <div className="flex flex-wrap items-center gap-2">
                            {activeAnnouncements[3].category && (
                              <span className="rounded bg-yellow-400 px-2.5 py-1 text-xs font-bold uppercase tracking-[0.1em] text-sky-950">
                                {activeAnnouncements[3].category}
                              </span>
                            )}
                            <span className="text-xs font-semibold text-sky-100">
                              {new Date(
                                activeAnnouncements[3].created_at
                              ).toLocaleDateString()}
                            </span>
                          </div>
                          <h3 className="mt-3 text-2xl font-bold leading-tight">
                            {activeAnnouncements[3].title}
                          </h3>
                          {activeAnnouncements[3].content && (
                            <p className="mt-2 max-w-2xl text-sm leading-6 text-sky-50">
                              {getAnnouncementExcerpt(
                                activeAnnouncements[3].content
                              )}
                            </p>
                          )}
                        </div>
                      </Link>
                    )}
                  </div>
                </div>

                {announcementGroups.length > 1 && (
                  <div className="mt-8 flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={showPreviousAnnouncementGroup}
                      className="flex size-10 items-center justify-center rounded-full border border-sky-200 bg-white font-bold text-sky-950 transition hover:bg-sky-50"
                      aria-label="Previous announcement group"
                    >
                      {"<"}
                    </button>
                    {announcementGroups.map((group, index) => (
                      <button
                        key={group[0]?.id || index}
                        type="button"
                        onClick={() => setActiveAnnouncementGroup(index)}
                        className={`h-2.5 rounded-full transition ${
                          index === activeAnnouncementGroup
                            ? "w-8 bg-yellow-400"
                            : "w-2.5 bg-slate-300 hover:bg-slate-400"
                        }`}
                        aria-label={`Show announcement group ${index + 1}`}
                      />
                    ))}
                    <button
                      type="button"
                      onClick={showNextAnnouncementGroup}
                      className="flex size-10 items-center justify-center rounded-full border border-sky-200 bg-white font-bold text-sky-950 transition hover:bg-sky-50"
                      aria-label="Next announcement group"
                    >
                      {">"}
                    </button>
                  </div>
                )}
              </div>
            )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="rounded border border-emerald-200 bg-emerald-50 p-8 md:flex md:items-center md:justify-between">
          <div>
            <h2 className="text-3xl font-bold text-sky-950">
              Ready to join{" "}
              <SiteBrandName
                firstClassName="text-yellow-600"
                restClassName="text-sky-950"
              />
              ?
            </h2>
            <p className="mt-3 max-w-2xl leading-7 text-slate-700">
              Review the requirements, download the forms, and send an inquiry
              to the enrollment office.
            </p>
          </div>
          <Link
            href="/enrollment"
            className="mt-6 inline-flex rounded bg-sky-900 px-6 py-3 font-bold text-white transition hover:bg-sky-950 md:mt-0"
          >
            Start Enrollment
          </Link>
        </div>
      </section>
    </>
  );
}
