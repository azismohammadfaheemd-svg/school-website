"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import PageHeader from "../components/PageHeader";

const steps = [
  "Download and review the enrollment forms.",
  "Submit the enrollment inquiry form.",
  "Wait for the enrollment office to contact your family.",
  "Confirm requirements, program selection, and orientation schedule.",
];

const initialApplication = {
  first_name: "",
  middle_name: "",
  last_name: "",
  email: "",
  phone_number: "",
  address: "",
  birth_date: "",
  gender: "",
  guardian_name: "",
  guardian_contact: "",
  selected_program: "Undecided",
  message: "",
};

function formatDeadline(deadline) {
  if (!deadline) {
    return "No deadline";
  }

  return new Date(`${deadline}T00:00:00`).toLocaleDateString();
}

function buildFullName(application) {
  return [
    application.first_name.trim(),
    application.middle_name.trim(),
    application.last_name.trim(),
  ]
    .filter(Boolean)
    .join(" ");
}

function normalizePhoneNumber(value) {
  return value.replace(/[\s\-()]/g, "");
}

export default function Enrollment() {
  const [forms, setForms] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [application, setApplication] = useState(initialApplication);
  const [isLoadingForms, setIsLoadingForms] = useState(true);
  const [isLoadingPrograms, setIsLoadingPrograms] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formsError, setFormsError] = useState("");
  const [programsError, setProgramsError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [validationErrors, setValidationErrors] = useState([]);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let isActive = true;

    async function fetchForms() {
      const { data, error } = await supabase
        .from("enrollment_forms")
        .select(
          "id, title, description, form_type, target_program, requirements, deadline, status, form_file_url, file_name, created_at"
        )
        .eq("status", "published")
        .order("created_at", { ascending: false });

      if (!isActive) {
        return;
      }

      if (error) {
        setFormsError(error.message);
        setForms([]);
      } else {
        setFormsError("");
        setForms(data || []);
      }

      setIsLoadingForms(false);
    }

    fetchForms();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    async function fetchPrograms() {
      setIsLoadingPrograms(true);
      setProgramsError("");

      const { data, error } = await supabase
        .from("programs")
        .select("id, title, status, created_at")
        .eq("status", "published")
        .order("title", { ascending: true });

      if (!isActive) {
        return;
      }

      if (error) {
        setProgramsError(error.message);
        setPrograms([]);
      } else {
        setPrograms(data || []);
      }

      setIsLoadingPrograms(false);
    }

    fetchPrograms();

    return () => {
      isActive = false;
    };
  }, []);

  function updateApplication(event) {
    const { name, value } = event.target;

    setApplication((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function validateApplication() {
    const errors = [];
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phonePattern = /^(09\d{9}|\+639\d{9})$/;

    if (!application.first_name.trim()) {
      errors.push("First name is required.");
    }

    if (!application.last_name.trim()) {
      errors.push("Last name is required.");
    }

    if (!application.email.trim()) {
      errors.push("Email is required.");
    } else if (!emailPattern.test(application.email.trim())) {
      errors.push("Enter a valid email address.");
    }

    if (!application.phone_number.trim()) {
      errors.push("Phone number is required.");
    } else if (!phonePattern.test(application.phone_number.trim())) {
      errors.push(
        "Enter a valid Philippine mobile number, such as 09171234567 or +639171234567."
      );
    }

    if (!application.selected_program.trim()) {
      errors.push("Selected program is required.");
    }

    if (
      application.guardian_contact.trim() &&
      normalizePhoneNumber(application.phone_number) ===
        normalizePhoneNumber(application.guardian_contact)
    ) {
      errors.push(
        "Guardian contact number must be different from applicant phone number."
      );
    }

    return errors;
  }

  async function submitApplication(event) {
    event.preventDefault();
    setSubmitError("");
    setValidationErrors([]);
    setSuccessMessage("");

    const errors = validateApplication();

    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    setIsSubmitting(true);

    const fullName = buildFullName(application);

    const { error } = await supabase.from("enrollment_applications").insert({
      first_name: application.first_name,
      middle_name: application.middle_name,
      last_name: application.last_name,
      full_name: fullName,
      email: application.email,
      phone_number: application.phone_number,
      address: application.address,
      selected_program: application.selected_program,
      birth_date: application.birth_date || null,
      gender: application.gender,
      guardian_name: application.guardian_name,
      guardian_contact: application.guardian_contact,
      message: application.message,
      status: "pending",
    });

    if (error) {
      setSubmitError(error.message);
    } else {
      setApplication(initialApplication);
      setSuccessMessage(
        "Your enrollment inquiry has been submitted successfully."
      );
    }

    setIsSubmitting(false);
  }

  return (
    <>
      <PageHeader
        title="Enrollment"
        description="Start the admissions process and learn what families need for a smooth transition."
      />
      <section className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-[0.85fr_1.15fr] lg:px-8">
        <div className="rounded border border-sky-100 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-sky-950">How to Apply</h2>
          <ol className="mt-5 space-y-4 text-slate-700">
            {steps.map((step, index) => (
              <li key={step} className="flex gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded bg-emerald-100 text-sm font-bold text-emerald-800">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>

          <div className="mt-8 border-t border-sky-100 pt-6">
            <h3 className="text-xl font-bold text-sky-950">
              Downloadable Forms
            </h3>

            {isLoadingForms && (
              <p className="mt-4 rounded border border-sky-100 bg-sky-50 p-4 text-slate-700">
                Loading enrollment forms...
              </p>
            )}

            {formsError && (
              <p className="mt-4 rounded border border-red-200 bg-red-50 p-4 font-semibold text-red-700">
                {formsError}
              </p>
            )}

            {!isLoadingForms && !formsError && forms.length === 0 && (
              <div className="mt-4 rounded border border-sky-100 bg-sky-50 p-5 text-slate-700">
                <p className="font-semibold text-sky-950">
                  Enrollment forms will be posted soon.
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  You may still submit an inquiry using the form on this page.
                </p>
              </div>
            )}

            {!isLoadingForms && !formsError && forms.length > 0 && (
              <div className="mt-4 space-y-3">
                {forms.map((form) => (
                  <article
                    key={form.id}
                    className="rounded border border-sky-200 bg-sky-50 p-4"
                  >
                    <h4 className="font-bold text-sky-950">{form.title}</h4>
                    <p className="mt-2 leading-7 text-slate-600">
                      {form.description}
                    </p>
                    <div className="mt-4 grid gap-2 text-sm text-slate-600">
                      <p>
                        <span className="font-bold text-sky-950">
                          Form Type:
                        </span>{" "}
                        {form.form_type}
                      </p>
                      <p>
                        <span className="font-bold text-sky-950">
                          Target Program:
                        </span>{" "}
                        {form.target_program}
                      </p>
                      <p>
                        <span className="font-bold text-sky-950">
                          Requirements:
                        </span>{" "}
                        {form.requirements}
                      </p>
                      <p>
                        <span className="font-bold text-sky-950">
                          Deadline:
                        </span>{" "}
                        {formatDeadline(form.deadline)}
                      </p>
                    </div>
                    {form.form_file_url && (
                      <div className="mt-4">
                        {form.file_name && (
                          <p className="mb-3 text-sm font-semibold text-slate-600">
                            {form.file_name}
                          </p>
                        )}
                        <a
                          href={form.form_file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex rounded bg-sky-900 px-4 py-2 font-bold text-white transition hover:bg-sky-950"
                        >
                          Download
                        </a>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="rounded border border-sky-100 bg-white p-6 shadow-sm">
          <h2 className="text-3xl font-bold text-sky-950">
            Enrollment Application Form
          </h2>
          <p className="mt-4 leading-8 text-slate-700">
            Submit your information and the enrollment office will review your
            inquiry. New submissions are saved with a Pending status.
          </p>

          {successMessage && (
            <p className="mt-5 rounded border border-emerald-200 bg-emerald-50 p-4 font-semibold text-emerald-800">
              {successMessage}
            </p>
          )}

          {submitError && (
            <p className="mt-5 rounded border border-red-200 bg-red-50 p-4 font-semibold text-red-700">
              {submitError}
            </p>
          )}

          {validationErrors.length > 0 && (
            <div className="mt-5 rounded border border-amber-200 bg-amber-50 p-4 text-amber-800">
              <p className="font-bold">Please fix the following:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {validationErrors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          <form
            onSubmit={submitApplication}
            noValidate
            className="mt-6 grid gap-4"
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <label className="grid gap-2 font-semibold text-slate-700">
                <span>First Name</span>
                <input
                  name="first_name"
                  type="text"
                  value={application.first_name}
                  onChange={updateApplication}
                  className="w-full rounded border border-slate-300 px-4 py-3 font-normal outline-none focus:border-emerald-500"
                />
              </label>
              <label className="grid gap-2 font-semibold text-slate-700">
                <span>
                  Middle Name{" "}
                  <span className="font-normal text-slate-500">
                    (optional)
                  </span>
                </span>
                <input
                  name="middle_name"
                  type="text"
                  value={application.middle_name}
                  onChange={updateApplication}
                  className="w-full rounded border border-slate-300 px-4 py-3 font-normal outline-none focus:border-emerald-500"
                />
              </label>
              <label className="grid gap-2 font-semibold text-slate-700">
                <span>Last Name</span>
                <input
                  name="last_name"
                  type="text"
                  value={application.last_name}
                  onChange={updateApplication}
                  className="w-full rounded border border-slate-300 px-4 py-3 font-normal outline-none focus:border-emerald-500"
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 font-semibold text-slate-700">
                Email
                <input
                  name="email"
                  type="email"
                  value={application.email}
                  onChange={updateApplication}
                  className="rounded border border-slate-300 px-4 py-3 font-normal outline-none focus:border-emerald-500"
                />
              </label>
              <label className="grid gap-2 font-semibold text-slate-700">
                Phone Number
                <input
                  name="phone_number"
                  type="tel"
                  value={application.phone_number}
                  onChange={updateApplication}
                  className="rounded border border-slate-300 px-4 py-3 font-normal outline-none focus:border-emerald-500"
                />
              </label>
            </div>

            <label className="grid gap-2 font-semibold text-slate-700">
              Address
              <input
                name="address"
                type="text"
                value={application.address}
                onChange={updateApplication}
                className="rounded border border-slate-300 px-4 py-3 font-normal outline-none focus:border-emerald-500"
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 font-semibold text-slate-700">
                Birth Date{" "}
                <span className="font-normal text-slate-500">(optional)</span>
                <input
                  name="birth_date"
                  type="date"
                  value={application.birth_date}
                  onChange={updateApplication}
                  className="rounded border border-slate-300 px-4 py-3 font-normal outline-none focus:border-emerald-500"
                />
              </label>
              <label className="grid gap-2 font-semibold text-slate-700">
                Gender
                <select
                  name="gender"
                  value={application.gender}
                  onChange={updateApplication}
                  className="rounded border border-slate-300 px-4 py-3 font-normal outline-none focus:border-emerald-500"
                >
                  <option value="">Select gender</option>
                  <option>Female</option>
                  <option>Male</option>
                  <option>Prefer not to say</option>
                </select>
              </label>
            </div>

            <label className="grid gap-2 font-semibold text-slate-700">
              Selected Program
              <select
                name="selected_program"
                value={application.selected_program}
                onChange={updateApplication}
                className="rounded border border-slate-300 px-4 py-3 font-normal outline-none focus:border-emerald-500"
              >
                <option value="Undecided">Undecided</option>
                {programs.map((program) => (
                  <option key={program.id} value={program.title}>
                    {program.title}
                  </option>
                ))}
              </select>
              {isLoadingPrograms && (
                <span className="text-sm font-normal text-slate-500">
                  Loading available programs...
                </span>
              )}
              {programsError && (
                <span className="text-sm font-semibold text-red-700">
                  {programsError}
                </span>
              )}
              {!isLoadingPrograms && !programsError && programs.length === 0 && (
                <span className="text-sm font-normal text-slate-500">
                  No published programs are available yet.
                </span>
              )}
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 font-semibold text-slate-700">
                Guardian Name
                <input
                  name="guardian_name"
                  type="text"
                  value={application.guardian_name}
                  onChange={updateApplication}
                  className="rounded border border-slate-300 px-4 py-3 font-normal outline-none focus:border-emerald-500"
                />
              </label>
              <label className="grid gap-2 font-semibold text-slate-700">
                Guardian Contact
                <input
                  name="guardian_contact"
                  type="tel"
                  value={application.guardian_contact}
                  onChange={updateApplication}
                  className="rounded border border-slate-300 px-4 py-3 font-normal outline-none focus:border-emerald-500"
                />
              </label>
            </div>

            <label className="grid gap-2 font-semibold text-slate-700">
              Message
              <textarea
                name="message"
                rows="5"
                value={application.message}
                onChange={updateApplication}
                className="rounded border border-slate-300 px-4 py-3 font-normal outline-none focus:border-emerald-500"
                placeholder="Tell us how we can help."
              />
            </label>

            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded bg-emerald-600 px-6 py-3 font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isSubmitting ? "Submitting..." : "Submit Inquiry"}
            </button>
          </form>
        </div>
      </section>
    </>
  );
}
