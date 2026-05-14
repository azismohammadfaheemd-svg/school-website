"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const initialForm = {
  title: "",
  description: "",
  form_type: "",
  target_program: "",
  requirements: "",
  deadline: "",
  status: "draft",
};

const acceptedFileExtensions = [".pdf", ".doc", ".docx"];
const acceptedFileTypes = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const sortOptions = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "title-asc", label: "Title A-Z" },
  { value: "title-desc", label: "Title Z-A" },
  { value: "deadline-asc", label: "Deadline earliest" },
  { value: "deadline-desc", label: "Deadline latest" },
];

function formatDeadline(deadline) {
  if (!deadline) {
    return "No deadline";
  }

  return new Date(`${deadline}T00:00:00`).toLocaleDateString();
}

export default function AdminFormsPage() {
  const [formData, setFormData] = useState(initialForm);
  const [forms, setForms] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [existingFileUrl, setExistingFileUrl] = useState("");
  const [existingFileName, setExistingFileName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState("newest");
  const [editingId, setEditingId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const visibleForms = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filteredForms = forms.filter((form) => {
      const searchableText = [
        form.title,
        form.description,
        form.form_type,
        form.target_program,
        form.requirements,
        form.status,
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(query);
    });

    return [...filteredForms].sort((firstForm, secondForm) => {
      if (sortOption === "oldest") {
        return new Date(firstForm.created_at) - new Date(secondForm.created_at);
      }

      if (sortOption === "title-asc") {
        return firstForm.title.localeCompare(secondForm.title);
      }

      if (sortOption === "title-desc") {
        return secondForm.title.localeCompare(firstForm.title);
      }

      if (sortOption === "deadline-asc") {
        return (firstForm.deadline || "").localeCompare(
          secondForm.deadline || ""
        );
      }

      if (sortOption === "deadline-desc") {
        return (secondForm.deadline || "").localeCompare(
          firstForm.deadline || ""
        );
      }

      return new Date(secondForm.created_at) - new Date(firstForm.created_at);
    });
  }, [forms, searchQuery, sortOption]);

  async function fetchForms() {
    setIsLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("enrollment_forms")
      .select(
        "id, title, description, form_type, target_program, requirements, deadline, status, form_file_url, file_name, created_at, updated_at"
      )
      .order("created_at", { ascending: false });

    if (error) {
      setErrorMessage(error.message);
      setForms([]);
    } else {
      setForms(data || []);
    }

    setIsLoading(false);
  }

  useEffect(() => {
    async function loadForms() {
      await fetchForms();
    }

    loadForms();
  }, []);

  function updateForm(event) {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function startEdit(form) {
    setEditingId(form.id);
    setErrorMessage("");
    setSuccessMessage("");
    setSelectedFile(null);
    setExistingFileUrl(form.form_file_url || "");
    setExistingFileName(form.file_name || "");
    setFormData({
      title: form.title || "",
      description: form.description || "",
      form_type: form.form_type || "",
      target_program: form.target_program || "",
      requirements: form.requirements || "",
      deadline: form.deadline || "",
      status: form.status || "draft",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setFormData(initialForm);
    setSelectedFile(null);
    setExistingFileUrl("");
    setExistingFileName("");
    setErrorMessage("");
    setSuccessMessage("");
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0];
    setErrorMessage("");
    setSuccessMessage("");

    if (!file) {
      setSelectedFile(null);
      return;
    }

    const lowerFileName = file.name.toLowerCase();
    const hasAcceptedExtension = acceptedFileExtensions.some((extension) =>
      lowerFileName.endsWith(extension)
    );

    if (
      !hasAcceptedExtension ||
      (file.type && !acceptedFileTypes.includes(file.type))
    ) {
      setSelectedFile(null);
      event.target.value = "";
      setErrorMessage("Only PDF, DOC, and DOCX files are allowed.");
      return;
    }

    setSelectedFile(file);
  }

  async function uploadFormFile(file) {
    const filePath = `enrollment-forms/${Date.now()}-${crypto.randomUUID()}-${
      file.name
    }`;

    setIsUploading(true);

    const { error } = await supabase.storage
      .from("enrollment-form-files")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });

    setIsUploading(false);

    if (error) {
      throw new Error(error.message);
    }

    const { data } = supabase.storage
      .from("enrollment-form-files")
      .getPublicUrl(filePath);

    return data.publicUrl;
  }

  async function deleteFormFile(fileUrl) {
    if (!fileUrl) {
      return;
    }

    const publicUrlPath = "/storage/v1/object/public/enrollment-form-files/";
    const pathStartIndex = fileUrl.indexOf(publicUrlPath);

    if (pathStartIndex === -1) {
      console.warn("Could not extract enrollment form file path:", fileUrl);
      return;
    }

    const encodedFilePath = fileUrl.slice(pathStartIndex + publicUrlPath.length);
    let filePath = encodedFilePath;

    try {
      filePath = decodeURIComponent(encodedFilePath);
    } catch (error) {
      console.warn("Failed to decode enrollment form file path:", error.message);
    }

    if (!filePath) {
      return;
    }

    const { error } = await supabase.storage
      .from("enrollment-form-files")
      .remove([filePath]);

    if (error) {
      console.warn(
        "Failed to delete enrollment form file from Supabase Storage:",
        error.message
      );
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    let fileUrl = editingId ? existingFileUrl || null : null;
    let fileName = editingId ? existingFileName || null : null;

    if (selectedFile) {
      try {
        fileUrl = await uploadFormFile(selectedFile);
        fileName = selectedFile.name;
      } catch (error) {
        setErrorMessage(error.message);
        setIsSubmitting(false);
        return;
      }
    }

    const enrollmentFormData = {
      title: formData.title,
      description: formData.description,
      form_type: formData.form_type,
      target_program: formData.target_program,
      requirements: formData.requirements,
      deadline: formData.deadline || null,
      status: formData.status,
      form_file_url: fileUrl,
      file_name: fileName,
    };

    const { error } = editingId
      ? await supabase
          .from("enrollment_forms")
          .update(enrollmentFormData)
          .eq("id", editingId)
      : await supabase.from("enrollment_forms").insert(enrollmentFormData);

    if (error) {
      setErrorMessage(error.message);
    } else {
      setFormData(initialForm);
      setEditingId(null);
      setSelectedFile(null);
      setExistingFileUrl("");
      setExistingFileName("");
      if (!editingId) {
        setSearchQuery("");
        setSortOption("newest");
      }
      setSuccessMessage(
        editingId
          ? "Enrollment form updated successfully."
          : "Enrollment form created successfully."
      );
      await fetchForms();
    }

    setIsSubmitting(false);
  }

  async function handleDelete(id) {
    const shouldDelete = window.confirm(
      "Are you sure you want to delete this enrollment form?"
    );

    if (!shouldDelete) {
      return;
    }

    setActionId(id);
    setErrorMessage("");
    setSuccessMessage("");

    const form = forms.find((item) => item.id === id);

    await deleteFormFile(form?.form_file_url);

    const { error } = await supabase
      .from("enrollment_forms")
      .delete()
      .eq("id", id);

    if (error) {
      setErrorMessage(`Failed to delete enrollment form: ${error.message}`);
    } else {
      if (editingId === id) {
        cancelEdit();
      }

      setSuccessMessage("Enrollment form deleted successfully.");
      await fetchForms();
    }

    setActionId(null);
  }

  async function togglePublished(form) {
    setActionId(form.id);
    setErrorMessage("");
    setSuccessMessage("");

    const nextStatus = form.status === "published" ? "draft" : "published";

    const { error } = await supabase
      .from("enrollment_forms")
      .update({ status: nextStatus })
      .eq("id", form.id);

    if (error) {
      setErrorMessage(error.message);
    } else {
      await fetchForms();
    }

    setActionId(null);
  }

  return (
    <section>
      <p className="text-sm font-bold uppercase tracking-[0.18em] text-yellow-600">
        Enrollment
      </p>
      <h1 className="mt-3 text-4xl font-bold text-sky-950">
        Enrollment Forms
      </h1>
      <p className="mt-4 max-w-2xl leading-7 text-slate-700">
        Create, edit, publish, unpublish, and delete downloadable enrollment
        and application forms.
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

      <div className="mt-8 grid gap-8 xl:grid-cols-[0.8fr_1.2fr]">
        <form
          onSubmit={handleSubmit}
          className="rounded border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-2xl font-bold text-sky-950">
              {editingId ? "Edit Form" : "Create Form"}
            </h2>
            {editingId && (
              <button
                type="button"
                onClick={cancelEdit}
                className="rounded border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel Edit
              </button>
            )}
          </div>

          <div className="mt-6 grid gap-4">
            <label className="grid gap-2 font-semibold text-slate-700">
              Title
              <input
                name="title"
                type="text"
                required
                value={formData.title}
                onChange={updateForm}
                className="w-full rounded border border-slate-300 px-4 py-3 font-normal outline-none focus:border-yellow-500"
                placeholder="Enter form title"
              />
            </label>

            <label className="grid gap-2 font-semibold text-slate-700">
              Description
              <textarea
                name="description"
                required
                rows="4"
                value={formData.description}
                onChange={updateForm}
                className="w-full rounded border border-slate-300 px-4 py-3 font-normal outline-none focus:border-yellow-500"
                placeholder="Describe this enrollment form"
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 font-semibold text-slate-700">
                Form Type
                <input
                  name="form_type"
                  type="text"
                  required
                  value={formData.form_type}
                  onChange={updateForm}
                  className="w-full rounded border border-slate-300 px-4 py-3 font-normal outline-none focus:border-yellow-500"
                  placeholder="Example: Application Form"
                />
              </label>

              <label className="grid gap-2 font-semibold text-slate-700">
                Target Program
                <input
                  name="target_program"
                  type="text"
                  required
                  value={formData.target_program}
                  onChange={updateForm}
                  className="w-full rounded border border-slate-300 px-4 py-3 font-normal outline-none focus:border-yellow-500"
                  placeholder="Example: All Programs"
                />
              </label>
            </div>

            <label className="grid gap-2 font-semibold text-slate-700">
              Requirements
              <textarea
                name="requirements"
                required
                rows="4"
                value={formData.requirements}
                onChange={updateForm}
                className="w-full rounded border border-slate-300 px-4 py-3 font-normal outline-none focus:border-yellow-500"
                placeholder="List the required documents or steps"
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 font-semibold text-slate-700">
                Deadline
                <input
                  name="deadline"
                  type="date"
                  value={formData.deadline}
                  onChange={updateForm}
                  className="w-full rounded border border-slate-300 px-4 py-3 font-normal outline-none focus:border-yellow-500"
                />
              </label>

              <label className="grid gap-2 font-semibold text-slate-700">
                Status
                <select
                  name="status"
                  value={formData.status}
                  onChange={updateForm}
                  className="w-full rounded border border-slate-300 px-4 py-3 font-normal outline-none focus:border-yellow-500"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </label>
            </div>

            <div className="grid gap-3">
              <label className="grid gap-2 font-semibold text-slate-700">
                Form File
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={handleFileChange}
                  className="w-full rounded border border-slate-300 px-4 py-3 font-normal outline-none file:mr-4 file:rounded file:border-0 file:bg-sky-950 file:px-4 file:py-2 file:font-bold file:text-white focus:border-yellow-500"
                />
              </label>

              {(selectedFile || existingFileUrl) && (
                <p className="rounded border border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-600">
                  {selectedFile
                    ? `Selected file: ${selectedFile.name}`
                    : `Current file: ${existingFileName}`}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded bg-yellow-400 px-6 py-3 font-bold text-sky-950 transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isSubmitting || isUploading
                ? isUploading
                  ? "Uploading file..."
                  : editingId
                    ? "Updating..."
                    : "Saving..."
                : editingId
                  ? "Update Form"
                  : "Create Form"}
            </button>
          </div>
        </form>

        <div>
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-2xl font-bold text-sky-950">All Forms</h2>
            <button
              type="button"
              onClick={fetchForms}
              disabled={isLoading}
              className="rounded border border-sky-800 bg-sky-950 px-4 py-2 font-bold text-white transition hover:bg-sky-900 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isLoading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          <div className="mb-5 grid gap-3 md:grid-cols-[1fr_220px]">
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full rounded border border-slate-300 bg-white px-4 py-3 outline-none focus:border-yellow-500"
              placeholder="Search forms..."
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

          {isLoading && (
            <p className="rounded border border-slate-200 bg-white p-6 text-slate-700 shadow-sm">
              Loading enrollment forms...
            </p>
          )}

          {!isLoading && forms.length === 0 && (
            <p className="rounded border border-slate-200 bg-white p-6 text-slate-700 shadow-sm">
              No enrollment forms found.
            </p>
          )}

          {!isLoading && forms.length > 0 && visibleForms.length === 0 && (
            <p className="rounded border border-slate-200 bg-white p-6 text-slate-700 shadow-sm">
              No enrollment forms match your search.
            </p>
          )}

          {!isLoading && visibleForms.length > 0 && (
            <div className="space-y-5">
              {visibleForms.map((form) => (
                <article
                  key={form.id}
                  className="rounded border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={`rounded px-3 py-1 text-sm font-bold ${
                        form.status === "published"
                          ? "bg-sky-100 text-sky-800"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {form.status === "published" ? "Published" : "Draft"}
                    </span>
                    <span className="rounded bg-yellow-100 px-3 py-1 text-sm font-bold text-yellow-800">
                      {form.form_type}
                    </span>
                    <span className="text-sm font-semibold text-slate-500">
                      Deadline: {formatDeadline(form.deadline)}
                    </span>
                  </div>

                  <h3 className="mt-4 text-2xl font-bold text-sky-950">
                    {form.title}
                  </h3>
                  <p className="mt-3 leading-7 text-slate-600">
                    {form.description}
                  </p>

                  <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
                    <p>
                      <span className="font-bold text-slate-700">
                        Target Program:
                      </span>{" "}
                      {form.target_program}
                    </p>
                    <p>
                      <span className="font-bold text-slate-700">
                        Requirements:
                      </span>{" "}
                      {form.requirements}
                    </p>
                  </div>

                  {form.form_file_url && (
                    <p className="mt-4 rounded border border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-600">
                      File: {form.file_name || "Uploaded file"}
                    </p>
                  )}

                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => startEdit(form)}
                      className="rounded border border-sky-800 px-4 py-2 font-bold text-sky-950 transition hover:bg-sky-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => togglePublished(form)}
                      disabled={actionId === form.id}
                      className="rounded bg-sky-950 px-4 py-2 font-bold text-white transition hover:bg-sky-900 disabled:cursor-not-allowed disabled:bg-slate-400"
                    >
                      {actionId === form.id
                        ? form.status === "published"
                          ? "Unpublishing..."
                          : "Publishing..."
                        : form.status === "published"
                          ? "Unpublish"
                          : "Publish"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(form.id)}
                      disabled={actionId === form.id}
                      className="rounded bg-red-600 px-4 py-2 font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                    >
                      {actionId === form.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
