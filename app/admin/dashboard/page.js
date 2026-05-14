"use client";

import Link from "next/link";

const dashboardCards = [
  {
    title: "News Management",
    description: "Prepare announcements and school news content.",
    href: "/admin/news",
  },
  {
    title: "Enrollment Forms",
    description: "Manage downloadable PDF forms for enrollment.",
    href: "/admin/forms",
  },
  {
    title: "Programs Management",
    description: "Maintain senior high strands and course information.",
    href: "/admin/programs",
  },
  {
    title: "Homepage Slides",
    description: "Manage slideshow images shown on the homepage.",
    href: "/admin/slides",
  },
  {
    title: "Contact/Logo Settings",
    description: "Update school logo and regularly changing contact details.",
    href: "/admin/settings",
  },
  {
    title: "Enrollment Applications",
    description: "Review submitted applications and update their status.",
    href: "/admin/applications",
  },
];

export default function AdminDashboardPage() {
  return (
    <>
      <section>
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-yellow-600">
          Admin
        </p>
        <h1 className="mt-3 text-4xl font-bold text-sky-950">
          Admin Dashboard
        </h1>
        <p className="mt-4 max-w-2xl leading-7 text-slate-700">
          Welcome. Choose an area to manage regularly changing website content.
        </p>
      </section>

      <section className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {dashboardCards.map((card) => (
          <Link
            key={card.title}
            href={card.href}
            className="rounded border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-yellow-300 hover:shadow-md"
          >
            <h2 className="text-xl font-bold text-sky-950">{card.title}</h2>
            <p className="mt-3 leading-7 text-slate-600">
              {card.description}
            </p>
          </Link>
        ))}
      </section>
    </>
  );
}
