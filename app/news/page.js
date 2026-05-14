"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import PageHeader from "../components/PageHeader";

function getExcerpt(content) {
  const cleanContent = String(content || "").trim();

  if (cleanContent.length <= 120) {
    return cleanContent;
  }

  return `${cleanContent.slice(0, 117).trim()}...`;
}

export default function News() {
  const [news, setNews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function fetchNews() {
      setIsLoading(true);
      setErrorMessage("");
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from("news")
        .select(
          "id, title, category, content, image_url, is_published, expires_at, created_at"
        )
        .eq("is_published", true)
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .order("created_at", { ascending: false });

      if (error) {
        setErrorMessage(error.message);
        setNews([]);
      } else {
        setNews(data || []);
      }

      setIsLoading(false);
    }

    fetchNews();
  }, []);

  return (
    <>
      <PageHeader
        title="News and Announcements"
        description="Read the latest public announcements and school updates."
      />
      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        {isLoading && (
          <p className="rounded border border-sky-100 bg-white p-6 text-slate-700 shadow-sm">
            Loading announcements...
          </p>
        )}

        {errorMessage && (
          <p className="rounded border border-red-200 bg-red-50 p-6 font-semibold text-red-700">
            {errorMessage}
          </p>
        )}

        {!isLoading && !errorMessage && news.length === 0 && (
          <div className="rounded border border-sky-100 bg-white p-8 text-center shadow-sm">
            <h2 className="text-2xl font-bold text-sky-950">
              No announcements available yet.
            </h2>
            <p className="mt-3 text-slate-600">
              Please check back soon for school updates and announcements.
            </p>
          </div>
        )}

        {!isLoading && !errorMessage && news.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {news.map((item) => (
              <Link
                key={item.id}
                href={`/news/${item.id}`}
                className="group flex h-full min-h-[520px] flex-col overflow-hidden rounded border border-sky-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                {item.image_url ? (
                  <div
                    className="h-56 shrink-0 bg-slate-100 bg-cover bg-center transition duration-500 group-hover:scale-105"
                    style={{ backgroundImage: `url(${item.image_url})` }}
                  />
                ) : (
                  <div className="flex h-56 shrink-0 items-center justify-center bg-gradient-to-br from-sky-100 via-white to-emerald-100 px-6 text-center">
                    <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">
                      Announcement
                    </p>
                  </div>
                )}
                <div className="flex flex-1 flex-col p-6">
                  <div className="flex flex-wrap items-center gap-3">
                    {item.category && (
                      <p className="rounded bg-emerald-100 px-3 py-1 text-sm font-bold text-emerald-800">
                        {item.category}
                      </p>
                    )}
                    <p className="text-sm font-semibold text-slate-500">
                      {new Date(item.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <h2
                    className="mt-4 text-2xl font-bold leading-tight text-sky-950"
                    style={{
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {item.title}
                  </h2>
                  <p
                    className="mt-3 leading-7 text-slate-600"
                    style={{
                      display: "-webkit-box",
                      WebkitLineClamp: 4,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {getExcerpt(item.content)}
                  </p>
                  <span className="mt-auto pt-6 font-bold text-emerald-700 transition group-hover:text-emerald-800">
                    Read full story
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
