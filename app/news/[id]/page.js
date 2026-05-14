"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

function isPublicNews(item) {
  if (!item?.is_published) {
    return false;
  }

  if (item.expires_at && new Date(item.expires_at) <= new Date()) {
    return false;
  }

  return true;
}

function getParagraphs(content) {
  return String(content || "")
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

export default function NewsDetailPage() {
  const params = useParams();
  const [newsItem, setNewsItem] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function fetchNewsItem() {
      setIsLoading(true);
      setErrorMessage("");
      setNotFound(false);

      const { data, error } = await supabase
        .from("news")
        .select(
          "id, title, category, content, image_url, is_published, expires_at, created_at, updated_at"
        )
        .eq("id", params.id)
        .maybeSingle();

      if (!isActive) {
        return;
      }

      if (error) {
        setErrorMessage(error.message);
        setNewsItem(null);
        setIsLoading(false);
        return;
      }

      if (!data || !isPublicNews(data)) {
        setNotFound(true);
        setNewsItem(null);
      } else {
        setNewsItem(data);
      }

      setIsLoading(false);
    }

    if (params?.id) {
      fetchNewsItem();
    }

    return () => {
      isActive = false;
    };
  }, [params?.id]);

  return (
    <section className="bg-white">
      <div className="mx-auto max-w-5xl px-6 py-16 lg:px-8">
        <Link
          href="/news"
          className="inline-flex font-bold text-emerald-700 transition hover:text-emerald-800"
        >
          Back to News
        </Link>

        {isLoading && (
          <p className="mt-8 rounded border border-sky-100 bg-sky-50 p-6 text-slate-700">
            Loading news article...
          </p>
        )}

        {errorMessage && (
          <p className="mt-8 rounded border border-red-200 bg-red-50 p-6 font-semibold text-red-700">
            {errorMessage}
          </p>
        )}

        {!isLoading && !errorMessage && notFound && (
          <div className="mt-8 rounded border border-sky-100 bg-sky-50 p-8 text-center">
            <h1 className="text-3xl font-bold text-sky-950">
              News not found
            </h1>
            <p className="mt-3 leading-7 text-slate-600">
              This announcement may have been removed, unpublished, or expired.
            </p>
            <Link
              href="/news"
              className="mt-6 inline-flex rounded bg-sky-900 px-5 py-3 font-bold text-white transition hover:bg-sky-950"
            >
              View Announcements
            </Link>
          </div>
        )}

        {!isLoading && !errorMessage && newsItem && (
          <article className="mt-8">
            <div className="border-b border-sky-100 pb-8">
              <div className="flex flex-wrap items-center gap-3">
                {newsItem.category && (
                  <span className="rounded bg-yellow-100 px-3 py-1 text-sm font-bold uppercase tracking-[0.12em] text-yellow-800">
                    {newsItem.category}
                  </span>
                )}
                <span className="text-sm font-bold text-emerald-700">
                  {new Date(newsItem.created_at).toLocaleDateString()}
                </span>
              </div>

              <h1 className="mt-5 max-w-4xl text-4xl font-bold leading-tight text-sky-950 sm:text-5xl">
                {newsItem.title}
              </h1>
            </div>

            {newsItem.image_url && (
              <div
                className="mt-8 h-[280px] bg-slate-100 bg-cover bg-center sm:h-[420px]"
                style={{ backgroundImage: `url(${newsItem.image_url})` }}
              />
            )}

            <div className="mx-auto mt-10 max-w-3xl">
              <div className="border-l-4 border-yellow-400 pl-5">
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">
                  Full Story
                </p>
              </div>

              <div className="mt-8 space-y-6 text-lg leading-9 text-slate-700">
                {getParagraphs(newsItem.content).map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
