import PageHeader from "../components/PageHeader";

export default function About() {
  return (
    <>
      <PageHeader
        title="About Our School"
        description="A focused, welcoming learning community for every learner."
      />
      <section className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-2 lg:px-8">
        <div>
          <h2 className="text-3xl font-bold text-sky-950">Our Mission</h2>
          <p className="mt-4 leading-8 text-slate-700">
            We prepare students to think critically, communicate clearly, and
            contribute responsibly. Our teachers combine high expectations with
            practical support so every student can build a strong next step.
          </p>
        </div>
        <div className="rounded border border-sky-100 bg-white p-6 shadow-sm">
          <h3 className="text-xl font-bold text-sky-950">Core Values</h3>
          <ul className="mt-4 space-y-3 text-slate-700">
            <li>Excellence in learning and character</li>
            <li>Respect for every student and family</li>
            <li>Service to the wider community</li>
            <li>Preparation for college, careers, and life</li>
          </ul>
        </div>
      </section>
    </>
  );
}
