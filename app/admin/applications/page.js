"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const statusOptions = [
  "pending",
  "reviewed",
  "contacted",
  "accepted",
  "rejected",
  "enrolled",
];

const statusFilters = ["all", ...statusOptions];

const sortOptions = [
  { value: "oldest", label: "First submitted first" },
  { value: "newest", label: "Latest submitted first" },
  { value: "name-asc", label: "Name A-Z" },
  { value: "name-desc", label: "Name Z-A" },
  { value: "program-asc", label: "Program A-Z" },
  { value: "program-desc", label: "Program Z-A" },
  { value: "status-asc", label: "Status A-Z" },
];

const statusStyles = {
  pending: {
    badge: "border-amber-200 bg-amber-100 text-amber-800",
    active: "border-amber-500 bg-amber-500 text-white",
    idle: "border-amber-200 bg-white text-amber-800 hover:bg-amber-50",
  },
  reviewed: {
    badge: "border-sky-200 bg-sky-100 text-sky-800",
    active: "border-sky-600 bg-sky-600 text-white",
    idle: "border-sky-200 bg-white text-sky-800 hover:bg-sky-50",
  },
  contacted: {
    badge: "border-indigo-200 bg-indigo-100 text-indigo-800",
    active: "border-indigo-600 bg-indigo-600 text-white",
    idle: "border-indigo-200 bg-white text-indigo-800 hover:bg-indigo-50",
  },
  accepted: {
    badge: "border-emerald-200 bg-emerald-100 text-emerald-800",
    active: "border-emerald-600 bg-emerald-600 text-white",
    idle: "border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50",
  },
  rejected: {
    badge: "border-red-200 bg-red-100 text-red-800",
    active: "border-red-600 bg-red-600 text-white",
    idle: "border-red-200 bg-white text-red-800 hover:bg-red-50",
  },
  enrolled: {
    badge: "border-purple-200 bg-purple-100 text-purple-800",
    active: "border-purple-600 bg-purple-600 text-white",
    idle: "border-purple-200 bg-white text-purple-800 hover:bg-purple-50",
  },
};

function formatStatus(status) {
  if (!status) {
    return "Pending";
  }

  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatDate(value) {
  if (!value) {
    return "Not provided";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not provided";
  }

  return date.toLocaleDateString();
}

function formatDateTime(value) {
  if (!value) {
    return "Not provided";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not provided";
  }

  return date.toLocaleString();
}

function getValue(value) {
  return value || "Not provided";
}

function getStatusStyle(status, type) {
  return statusStyles[status || "pending"]?.[type] || statusStyles.pending[type];
}

export default function AdminApplicationsPage() {
  const [applications, setApplications] = useState([]);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [pendingStatusUpdate, setPendingStatusUpdate] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState("oldest");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const visibleApplications = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filteredApplications = applications
      .filter((application) => {
        if (statusFilter === "all") {
          return true;
        }

        return (application.status || "pending") === statusFilter;
      })
      .filter((application) => {
        const searchableText = [
          application.first_name,
          application.middle_name,
          application.last_name,
          application.full_name,
          application.email,
          application.phone_number,
          application.selected_program,
          application.status,
        ]
          .join(" ")
          .toLowerCase();

        return searchableText.includes(query);
      });

    return [...filteredApplications].sort((firstApplication, secondApplication) => {
      if (sortOption === "oldest") {
        return (
          new Date(firstApplication.created_at) -
          new Date(secondApplication.created_at)
        );
      }

      if (sortOption === "name-asc") {
        return (firstApplication.full_name || "").localeCompare(
          secondApplication.full_name || ""
        );
      }

      if (sortOption === "name-desc") {
        return (secondApplication.full_name || "").localeCompare(
          firstApplication.full_name || ""
        );
      }

      if (sortOption === "program-asc") {
        return (firstApplication.selected_program || "").localeCompare(
          secondApplication.selected_program || ""
        );
      }

      if (sortOption === "program-desc") {
        return (secondApplication.selected_program || "").localeCompare(
          firstApplication.selected_program || ""
        );
      }

      if (sortOption === "status-asc") {
        return (firstApplication.status || "").localeCompare(
          secondApplication.status || ""
        );
      }

      return (
        new Date(secondApplication.created_at) -
        new Date(firstApplication.created_at)
      );
    });
  }, [applications, searchQuery, sortOption, statusFilter]);

  const statusCounts = useMemo(() => {
    return applications.reduce(
      (counts, application) => {
        const status = application.status || "pending";

        return {
          ...counts,
          all: counts.all + 1,
          [status]: (counts[status] || 0) + 1,
        };
      },
      statusFilters.reduce(
        (counts, status) => ({
          ...counts,
          [status]: 0,
        }),
        {}
      )
    );
  }, [applications]);

  const selectedStatusApplicationCount =
    statusFilter === "all"
      ? applications.length
      : applications.filter(
          (application) => (application.status || "pending") === statusFilter
        ).length;

  async function fetchApplications() {
    setIsLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("enrollment_applications")
      .select(
        "id, first_name, middle_name, last_name, full_name, email, phone_number, address, selected_program, birth_date, gender, guardian_name, guardian_contact, message, status, created_at, updated_at"
      )
      .order("created_at", { ascending: true });

    if (error) {
      setErrorMessage(error.message);
      setApplications([]);
    } else {
      setApplications(data || []);
    }

    setIsLoading(false);
  }

  useEffect(() => {
    async function loadApplications() {
      await fetchApplications();
    }

    loadApplications();
  }, []);

  function openDetails(application) {
    setSelectedApplication(application);
    setErrorMessage("");
    setSuccessMessage("");
  }

  function closeDetails() {
    if (isUpdatingStatus) {
      return;
    }

    setSelectedApplication(null);
  }

  function requestStatusUpdate(application, status) {
    if ((application.status || "pending") === status || isUpdatingStatus) {
      return;
    }

    setPendingStatusUpdate({ application, status });
    setErrorMessage("");
    setSuccessMessage("");
  }

  function cancelStatusUpdate() {
    if (isUpdatingStatus) {
      return;
    }

    setPendingStatusUpdate(null);
  }

  async function confirmStatusUpdate() {
    if (!pendingStatusUpdate) {
      return;
    }

    const { application, status } = pendingStatusUpdate;

    setIsUpdatingStatus(true);
    setActionId(application.id);
    setErrorMessage("");
    setSuccessMessage("");

    const { error } = await supabase
      .from("enrollment_applications")
      .update({ status })
      .eq("id", application.id);

    if (error) {
      setErrorMessage(`Failed to update application status: ${error.message}`);
    } else {
      setApplications((current) =>
        current.map((currentApplication) =>
          currentApplication.id === application.id
            ? { ...currentApplication, status }
            : currentApplication
        )
      );
      setSelectedApplication((current) =>
        current?.id === application.id ? { ...current, status } : current
      );
      setPendingStatusUpdate(null);
      setSuccessMessage("Application status updated successfully.");
      await fetchApplications();
    }

    setIsUpdatingStatus(false);
    setActionId(null);
  }

  async function deleteApplication(id) {
    const shouldDelete = window.confirm(
      "Are you sure you want to delete this enrollment application?"
    );

    if (!shouldDelete) {
      return;
    }

    setActionId(id);
    setErrorMessage("");
    setSuccessMessage("");

    const { error } = await supabase
      .from("enrollment_applications")
      .delete()
      .eq("id", id);

    if (error) {
      setErrorMessage(`Failed to delete application: ${error.message}`);
    } else {
      if (selectedApplication?.id === id) {
        setSelectedApplication(null);
      }

      setSuccessMessage("Enrollment application deleted successfully.");
      await fetchApplications();
    }

    setActionId(null);
  }

  const detailRows = selectedApplication
    ? [
        ["First Name", selectedApplication.first_name],
        ["Middle Name", selectedApplication.middle_name],
        ["Last Name", selectedApplication.last_name],
        ["Full Name", selectedApplication.full_name],
        ["Email", selectedApplication.email],
        ["Phone Number", selectedApplication.phone_number],
        ["Address", selectedApplication.address],
        ["Selected Program", selectedApplication.selected_program],
        ["Birth Date", formatDate(selectedApplication.birth_date)],
        ["Gender", selectedApplication.gender],
        ["Guardian Name", selectedApplication.guardian_name],
        ["Guardian Contact", selectedApplication.guardian_contact],
        ["Message", selectedApplication.message],
        ["Status", formatStatus(selectedApplication.status)],
        ["Submitted", formatDateTime(selectedApplication.created_at)],
      ]
    : [];

  return (
    <section>
      <p className="text-sm font-bold uppercase tracking-[0.18em] text-yellow-600">
        Enrollment
      </p>
      <h1 className="mt-3 text-4xl font-bold text-sky-950">
        Enrollment Applications
      </h1>
      <p className="mt-4 max-w-2xl leading-7 text-slate-700">
        Review submitted enrollment applications, update applicant status, and
        manage application records.
      </p>

      {errorMessage && (
        <p className="mt-6 rounded border border-red-200 bg-red-50 p-4 font-semibold text-red-700">
          {errorMessage}
        </p>
      )}

      {successMessage && (
        <p className="mt-6 rounded border border-emerald-200 bg-emerald-50 p-4 font-semibold text-emerald-700">
          {successMessage}
        </p>
      )}

      <div className="mt-8">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-2xl font-bold text-sky-950">All Applications</h2>
          <button
            type="button"
            onClick={fetchApplications}
            disabled={isLoading}
            className="rounded border border-sky-800 bg-sky-950 px-4 py-2 font-bold text-white transition hover:bg-sky-900 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isLoading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div className="mb-5 grid gap-3 md:grid-cols-[1fr_240px]">
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="w-full rounded border border-slate-300 bg-white px-4 py-3 outline-none focus:border-yellow-500"
            placeholder="Search applications..."
          />
          <select
            value={sortOption}
            onChange={(event) => setSortOption(event.target.value)}
            className="w-full rounded border border-slate-300 bg-white px-4 py-3 outline-none focus:border-yellow-500"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          {statusFilters.map((status) => {
            const isActive = statusFilter === status;

            return (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`rounded border px-4 py-2 text-sm font-bold transition ${
                  isActive
                    ? "border-sky-950 bg-sky-950 text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {status === "all" ? "All" : formatStatus(status)} (
                {statusCounts[status] || 0})
              </button>
            );
          })}
        </div>

        {isLoading && (
          <p className="rounded border border-slate-200 bg-white p-6 text-slate-700 shadow-sm">
            Loading enrollment applications...
          </p>
        )}

        {!isLoading && applications.length === 0 && (
          <p className="rounded border border-slate-200 bg-white p-6 text-slate-700 shadow-sm">
            No enrollment applications found.
          </p>
        )}

        {!isLoading &&
          applications.length > 0 &&
          visibleApplications.length === 0 && (
            <p className="rounded border border-slate-200 bg-white p-6 text-slate-700 shadow-sm">
              {statusFilter !== "all" && selectedStatusApplicationCount === 0
                ? "No applications found for this status."
                : "No enrollment applications match your search."}
            </p>
          )}

        {!isLoading && visibleApplications.length > 0 && (
          <div className="space-y-5">
            {visibleApplications.map((application) => (
              <article
                key={application.id}
                className="rounded border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="rounded bg-yellow-100 px-3 py-1 text-sm font-bold text-yellow-800">
                        {application.selected_program || "No program selected"}
                      </span>
                      <span className="text-sm font-semibold text-slate-500">
                        Submitted: {formatDateTime(application.created_at)}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr_1fr]">
                      <div>
                        <p className="text-sm font-bold text-slate-500">
                          Full Name
                        </p>
                        <h3 className="mt-1 text-xl font-bold text-sky-950">
                          {getValue(application.full_name)}
                        </h3>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-500">
                          Email
                        </p>
                        <p className="mt-1 font-semibold text-slate-700">
                          {getValue(application.email)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-500">
                          Phone Number
                        </p>
                        <p className="mt-1 font-semibold text-slate-700">
                          {getValue(application.phone_number)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => openDetails(application)}
                        className="rounded border border-sky-800 px-4 py-2 font-bold text-sky-950 transition hover:bg-sky-50"
                      >
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteApplication(application.id)}
                        disabled={actionId === application.id}
                        className="rounded bg-red-600 px-4 py-2 font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                      >
                        {actionId === application.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>

                  <div className="rounded border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-bold text-slate-500">
                      Current Status
                    </p>
                    <span
                      className={`mt-2 inline-flex rounded border px-3 py-1 text-sm font-bold ${getStatusStyle(
                        application.status,
                        "badge"
                      )}`}
                    >
                      {formatStatus(application.status)}
                    </span>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      {statusOptions.map((status) => {
                        const isActive =
                          (application.status || "pending") === status;

                        return (
                          <button
                            key={status}
                            type="button"
                            onClick={() =>
                              requestStatusUpdate(application, status)
                            }
                            disabled={isActive || isUpdatingStatus}
                            className={`rounded border px-3 py-2 text-sm font-bold transition disabled:cursor-not-allowed ${
                              isActive
                                ? getStatusStyle(status, "active")
                                : getStatusStyle(status, "idle")
                            }`}
                          >
                            {formatStatus(status)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {selectedApplication && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-yellow-600">
                  Application Details
                </p>
                <h2 className="mt-2 text-2xl font-bold text-sky-950">
                  {getValue(selectedApplication.full_name)}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeDetails}
                disabled={isUpdatingStatus}
                className="rounded border border-slate-300 px-4 py-2 font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100"
              >
                Close
              </button>
            </div>

            <div className="mt-6 rounded border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-bold text-slate-500">
                Application Status
              </p>
              <span
                className={`mt-2 inline-flex rounded border px-3 py-1 text-sm font-bold ${getStatusStyle(
                  selectedApplication.status,
                  "badge"
                )}`}
              >
                {formatStatus(selectedApplication.status)}
              </span>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {detailRows.map(([label, value]) => (
                <div
                  key={label}
                  className="rounded border border-slate-200 bg-slate-50 p-4"
                >
                  <p className="text-sm font-bold text-slate-500">{label}</p>
                  <p className="mt-2 leading-7 text-slate-700">
                    {getValue(value)}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => deleteApplication(selectedApplication.id)}
                disabled={actionId === selectedApplication.id}
                className="rounded bg-red-600 px-4 py-2 font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {actionId === selectedApplication.id ? "Deleting..." : "Delete"}
              </button>
              <button
                type="button"
                onClick={closeDetails}
                disabled={isUpdatingStatus}
                className="rounded bg-sky-950 px-4 py-2 font-bold text-white transition hover:bg-sky-900 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingStatusUpdate && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-md rounded border border-slate-200 bg-white p-6 shadow-xl">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-yellow-600">
              Confirm Status Update
            </p>
            <h2 className="mt-3 text-2xl font-bold text-sky-950">
              Update Application Status
            </h2>
            <p className="mt-4 leading-7 text-slate-700">
              Are you sure you want to change this application status to{" "}
              {formatStatus(pendingStatusUpdate.status)}?
            </p>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={cancelStatusUpdate}
                disabled={isUpdatingStatus}
                className="rounded border border-slate-300 px-4 py-2 font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmStatusUpdate}
                disabled={isUpdatingStatus}
                className="rounded bg-sky-950 px-4 py-2 font-bold text-white transition hover:bg-sky-900 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {isUpdatingStatus ? "Updating..." : "Yes, Update Status"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
