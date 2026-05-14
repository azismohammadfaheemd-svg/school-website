import SiteBrandName from "./SiteBrandName";

export default function PageHeader({ title, description }) {
  return (
    <section className="bg-gradient-to-br from-sky-100 via-white to-emerald-100">
      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">
          <SiteBrandName
            firstClassName="text-yellow-600"
            restClassName="text-emerald-700"
          />
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-bold text-sky-950 sm:text-5xl">
          {title}
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-700">
          {description}
        </p>
      </div>
    </section>
  );
}
