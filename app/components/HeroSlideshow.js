"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const fallbackHero = {
  image_url:
    "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1800&q=80",
  title: "Welcome",
  subtitle:
    "Explore programs, enrollment updates, and campus announcements in one place.",
};

export default function HeroSlideshow() {
  const [homepageSlides, setHomepageSlides] = useState([]);
  const [isLoadingSlides, setIsLoadingSlides] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    let isActive = true;

    async function fetchHomepageSlides() {
      setIsLoadingSlides(true);

      const { data, error } = await supabase
        .from("homepage_slides")
        .select(
          "id, eyebrow_text, title, subtitle, image_url, button_text, button_link, sort_order"
        )
        .eq("status", "published")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (!isActive) {
        return;
      }

      if (error) {
        console.warn("Failed to load homepage slides:", error.message);
        setHomepageSlides([]);
      } else {
        setHomepageSlides((data || []).filter((slide) => slide.image_url));
      }

      setIsLoadingSlides(false);
    }

    fetchHomepageSlides();

    return () => {
      isActive = false;
    };
  }, []);

  const slides = useMemo(() => homepageSlides, [homepageSlides]);
  const hasPublishedSlides = slides.length > 0;

  useEffect(() => {
    if (!hasPublishedSlides) {
      return undefined;
    }

    const timer = setInterval(() => {
      setCurrentSlide((slide) => (slide + 1) % slides.length);
    }, 4000);

    return () => clearInterval(timer);
  }, [hasPublishedSlides, slides.length]);

  const goToPrevious = () => {
    setCurrentSlide((slide) => (slide - 1 + slides.length) % slides.length);
  };

  const goToNext = () => {
    setCurrentSlide((slide) => (slide + 1) % slides.length);
  };

  if (isLoadingSlides) {
    return (
      <section className="relative h-[600px] overflow-hidden bg-sky-950 text-white">
        <div className="relative z-10 mx-auto flex h-full max-w-7xl items-center px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-lg font-semibold text-sky-100">
              Loading homepage slides...
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (!hasPublishedSlides) {
    return (
      <section className="relative h-[600px] overflow-hidden bg-sky-950 text-white">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${fallbackHero.image_url})` }}
        />
        <div className="absolute inset-0 bg-sky-950/75" />

        <div className="relative z-10 mx-auto flex h-full max-w-7xl items-center px-6 lg:px-8">
          <div className="max-w-3xl">
            <h1 className="text-5xl font-bold leading-tight sm:text-6xl">
              {fallbackHero.title}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-sky-50">
              {fallbackHero.subtitle}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/enrollment"
                className="inline-flex justify-center rounded bg-emerald-600 px-6 py-3 font-bold text-white transition hover:bg-emerald-700"
              >
                Apply for Enrollment
              </Link>
              <Link
                href="/programs"
                className="inline-flex justify-center rounded border border-sky-200 bg-white/10 px-6 py-3 font-bold text-white transition hover:bg-white hover:text-sky-950"
              >
                Explore Programs
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const safeCurrentSlide = currentSlide % slides.length;
  const activeSlide = slides[safeCurrentSlide] || slides[0];

  return (
    <section className="relative h-[600px] overflow-hidden bg-sky-950 text-white">
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          className={`absolute inset-0 bg-cover bg-center transition-opacity duration-700 ${
            index === safeCurrentSlide ? "opacity-100" : "opacity-0"
          }`}
          style={{ backgroundImage: `url(${slide.image_url})` }}
          aria-hidden={index !== safeCurrentSlide}
        />
      ))}
      <div className="absolute inset-0 bg-sky-950/75" />

      <div className="relative z-10 mx-auto flex h-full max-w-7xl items-center px-6 lg:px-8">
        <div className="max-w-3xl">
          {activeSlide.eyebrow_text && (
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-200">
              {activeSlide.eyebrow_text}
            </p>
          )}
          {activeSlide.title && (
            <h1 className="mt-5 text-5xl font-bold leading-tight sm:text-6xl">
              {activeSlide.title}
            </h1>
          )}
          {activeSlide.subtitle && (
            <p className="mt-6 max-w-2xl text-lg leading-8 text-sky-50">
              {activeSlide.subtitle}
            </p>
          )}
          {activeSlide.button_text && activeSlide.button_link && (
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href={activeSlide.button_link}
                className="inline-flex justify-center rounded bg-emerald-600 px-6 py-3 font-bold text-white transition hover:bg-emerald-700"
              >
                {activeSlide.button_text}
              </Link>
            </div>
          )}
        </div>
      </div>

      {slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 z-20 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-3xl text-white transition hover:bg-white/25"
            aria-label="Previous slide"
          >
            &lsaquo;
          </button>
          <button
            type="button"
            onClick={goToNext}
            className="absolute right-4 top-1/2 z-20 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-3xl text-white transition hover:bg-white/25"
            aria-label="Next slide"
          >
            &rsaquo;
          </button>

          <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 gap-2">
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => setCurrentSlide(index)}
                className={`size-3 rounded-full transition ${
                  index === safeCurrentSlide ? "bg-emerald-300" : "bg-white/60"
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
