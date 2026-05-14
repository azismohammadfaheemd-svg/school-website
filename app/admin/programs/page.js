"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const initialForm = {
  title: "",
  description: "",
  duration: "",
  qualification_level: "",
  requirements: "",
  status: "draft",
};

const acceptedImageTypes = ["image/jpeg", "image/png", "image/webp"];

const sortOptions = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "title-asc", label: "Title A-Z" },
  { value: "title-desc", label: "Title Z-A" },
  { value: "duration-asc", label: "Duration A-Z" },
  { value: "duration-desc", label: "Duration Z-A" },
];

function getDurationText(duration) {
  return String(duration || "").trim() || "Duration not specified";
}

export default function AdminProgramsPage() {
  const [formData, setFormData] = useState(initialForm);
  const [programs, setPrograms] = useState([]);
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [existingImageUrl, setExistingImageUrl] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState("newest");
  const [editingId, setEditingId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  const visiblePrograms = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filteredPrograms = programs.filter((program) => {
      const searchableText = [
        program.title,
        program.description,
        program.duration,
        program.qualification_level,
        program.requirements,
        program.status,
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(query);
    });

    return [...filteredPrograms].sort((firstProgram, secondProgram) => {
      if (sortOption === "oldest") {
        return (
          new Date(firstProgram.created_at) - new Date(secondProgram.created_at)
        );
      }

      if (sortOption === "title-asc") {
        return firstProgram.title.localeCompare(secondProgram.title);
      }

      if (sortOption === "title-desc") {
        return secondProgram.title.localeCompare(firstProgram.title);
      }

      if (sortOption === "duration-asc") {
        return (firstProgram.duration || "").localeCompare(
          secondProgram.duration || ""
        );
      }

      if (sortOption === "duration-desc") {
        return (secondProgram.duration || "").localeCompare(
          firstProgram.duration || ""
        );
      }

      return (
        new Date(secondProgram.created_at) - new Date(firstProgram.created_at)
      );
    });
  }, [programs, searchQuery, sortOption]);

  async function fetchPrograms() {
    setIsLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("programs")
      .select(
        "id, title, description, duration, qualification_level, requirements, status, image_url, created_at, updated_at"
      )
      .order("created_at", { ascending: false });

    if (error) {
      setErrorMessage(error.message);
      setPrograms([]);
    } else {
      setPrograms(data || []);
    }

    setIsLoading(false);
  }

  useEffect(() => {
    async function loadPrograms() {
      await fetchPrograms();
    }

    loadPrograms();
  }, []);

  function updateForm(event) {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function startEdit(program) {
    setEditingId(program.id);
    setErrorMessage("");
    setSelectedImageFile(null);
    setImagePreviewUrl("");
    setExistingImageUrl(program.image_url || "");
    setFormData({
      title: program.title || "",
      description: program.description || "",
      duration: program.duration || "",
      qualification_level: program.qualification_level || "",
      requirements: program.requirements || "",
      status: program.status || "draft",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setFormData(initialForm);
    setSelectedImageFile(null);
    setImagePreviewUrl("");
    setExistingImageUrl("");
    setErrorMessage("");
  }

  function handleImageChange(event) {
    const file = event.target.files?.[0];
    setErrorMessage("");

    if (!file) {
      setSelectedImageFile(null);
      setImagePreviewUrl("");
      return;
    }

    if (!acceptedImageTypes.includes(file.type)) {
      setSelectedImageFile(null);
      setImagePreviewUrl("");
      event.target.value = "";
      setErrorMessage("Only JPG, JPEG, PNG, and WEBP images are allowed.");
      return;
    }

    setSelectedImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
  }

  async function uploadProgramImage(file) {
    const fileExtension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const fileName = `${Date.now()}-${crypto.randomUUID()}.${fileExtension}`;
    const filePath = `programs/${fileName}`;

    setIsUploading(true);

    const { error } = await supabase.storage
      .from("program-images")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    setIsUploading(false);

    if (error) {
      throw new Error(error.message);
    }

    const { data } = supabase.storage
      .from("program-images")
      .getPublicUrl(filePath);

    return data.publicUrl;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    let imageUrl = editingId ? existingImageUrl || null : null;

    if (selectedImageFile) {
      try {
        imageUrl = await uploadProgramImage(selectedImageFile);
      } catch (error) {
        setErrorMessage(error.message);
        setIsSubmitting(false);
        return;
      }
    }

    const programData = {
      title: formData.title,
      description: formData.description,
      duration: formData.duration,
      qualification_level: formData.qualification_level,
      requirements: formData.requirements,
      status: formData.status,
      image_url: imageUrl,
    };

    const { error } = editingId
      ? await supabase.from("programs").update(programData).eq("id", editingId)
      : await supabase.from("programs").insert(programData);

    if (error) {
      setErrorMessage(error.message);
    } else {
      setFormData(initialForm);
      setEditingId(null);
      setSelectedImageFile(null);
      setImagePreviewUrl("");
      setExistingImageUrl("");
      if (!editingId) {
        setSearchQuery("");
        setSortOption("newest");
      }
      await fetchPrograms();
    }

    setIsSubmitting(false);
  }

  async function handleDelete(id) {
    const shouldDelete = window.confirm(
      "Are you sure you want to delete this program or course?"
    );

    if (!shouldDelete) {
      return;
    }

    setActionId(id);
    setErrorMessage("");

    const program = programs.find((item) => item.id === id);

    if (program?.image_url) {
      const publicUrlPath = "/storage/v1/object/public/program-images/";
      const pathStartIndex = program.image_url.indexOf(publicUrlPath);

      if (pathStartIndex !== -1) {
        const encodedFilePath = program.image_url.slice(
          pathStartIndex + publicUrlPath.length
        );
        let filePath = encodedFilePath;

        try {
          filePath = decodeURIComponent(encodedFilePath);
        } catch (error) {
          console.warn(
            "Failed to decode program image file path:",
            error.message
          );
        }

        if (filePath) {
          const { error: imageDeleteError } = await supabase.storage
            .from("program-images")
            .remove([filePath]);

          if (imageDeleteError) {
            console.warn(
              "Failed to delete program image from Supabase Storage:",
              imageDeleteError.message
            );
          }
        }
      } else {
        console.warn(
          "Could not extract program image file path from URL:",
          program.image_url
        );
      }
    }

    const { error } = await supabase.from("programs").delete().eq("id", id);

    if (error) {
      setErrorMessage(`Failed to delete program or course: ${error.message}`);
    } else {
      if (editingId === id) {
        cancelEdit();
      }

      await fetchPrograms();
    }

    setActionId(null);
  }

  async function togglePublished(program) {
    setActionId(program.id);
    setErrorMessage("");

    const nextStatus = program.status === "published" ? "draft" : "published";

    const { error } = await supabase
      .from("programs")
      .update({ status: nextStatus })
      .eq("id", program.id);

    if (error) {
      setErrorMessage(error.message);
    } else {
      await fetchPrograms();
    }

    setActionId(null);
  }

  return (
    <section>
      <p className="text-sm font-bold uppercase tracking-[0.18em] text-yellow-600">
        Academics
      </p>
      <h1 className="mt-3 text-4xl font-bold text-sky-950">
        Programs Management
      </h1>
      <p className="mt-4 max-w-2xl leading-7 text-slate-700">
        Create, edit, publish, unpublish, and delete school programs and
        courses.
      </p>

      {errorMessage && (
        <p className="mt-6 rounded border border-red-200 bg-red-50 p-4 font-semibold text-red-700">
          {errorMessage}
        </p>
      )}

      <div className="mt-8 grid gap-8 xl:grid-cols-[0.8fr_1.2fr]">
        <form
          onSubmit={handleSubmit}
          className="rounded border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-2xl font-bold text-sky-950">
              {editingId ? "Edit Program" : "Create Program"}
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
                placeholder="Enter program or course title"
              />
            </label>

            <label className="grid gap-2 font-semibold text-slate-700">
              Description
              <textarea
                name="description"
                required
                rows="5"
                value={formData.description}
                onChange={updateForm}
                className="w-full rounded border border-slate-300 px-4 py-3 font-normal outline-none focus:border-yellow-500"
                placeholder="Write the program description"
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 font-semibold text-slate-700">
                Duration
                <input
                  name="duration"
                  type="text"
                  value={formData.duration}
                  onChange={updateForm}
                  className="w-full rounded border border-slate-300 px-4 py-3 font-normal outline-none focus:border-yellow-500"
                  placeholder="Example: 2 Years, 6 Months, and 15 Days"
                />
              </label>

              <label className="grid gap-2 font-semibold text-slate-700">
                Qualification Level
                <input
                  name="qualification_level"
                  type="text"
                  required
                  value={formData.qualification_level}
                  onChange={updateForm}
                  className="w-full rounded border border-slate-300 px-4 py-3 font-normal outline-none focus:border-yellow-500"
                  placeholder="Example: NC II"
                />
              </label>
            </div>

            <label className="grid gap-2 font-semibold text-slate-700">
              Requirements
              <textarea
                name="requirements"
                required
                rows="5"
                value={formData.requirements}
                onChange={updateForm}
                className="w-full rounded border border-slate-300 px-4 py-3 font-normal outline-none focus:border-yellow-500"
                placeholder="List program requirements"
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

            <div className="grid gap-3">
              <label className="grid gap-2 font-semibold text-slate-700">
                Program Image
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                  onChange={handleImageChange}
                  className="w-full rounded border border-slate-300 px-4 py-3 font-normal outline-none file:mr-4 file:rounded file:border-0 file:bg-sky-950 file:px-4 file:py-2 file:font-bold file:text-white focus:border-yellow-500"
                />
              </label>

              {(imagePreviewUrl || existingImageUrl) && (
                <div>
                  <p className="mb-2 text-sm font-semibold text-slate-600">
                    {imagePreviewUrl ? "Selected image preview" : "Current image"}
                  </p>
                  <div
                    className="h-48 rounded border border-slate-200 bg-slate-100 bg-cover bg-center"
                    style={{
                      backgroundImage: `url(${imagePreviewUrl || existingImageUrl})`,
                    }}
                  />
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded bg-yellow-400 px-6 py-3 font-bold text-sky-950 transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isSubmitting || isUploading
                ? isUploading
                  ? "Uploading image..."
                  : editingId
                    ? "Updating..."
                    : "Saving..."
                : editingId
                  ? "Update Program"
                  : "Create Program"}
            </button>
          </div>
        </form>

        <div>
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-2xl font-bold text-sky-950">All Programs</h2>
            <button
              type="button"
              onClick={fetchPrograms}
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
              placeholder="Search programs..."
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
              Loading program records...
            </p>
          )}

          {!isLoading && programs.length === 0 && (
            <p className="rounded border border-slate-200 bg-white p-6 text-slate-700 shadow-sm">
              No program records found.
            </p>
          )}

          {!isLoading && programs.length > 0 && visiblePrograms.length === 0 && (
            <p className="rounded border border-slate-200 bg-white p-6 text-slate-700 shadow-sm">
              No program records match your search.
            </p>
          )}

          {!isLoading && visiblePrograms.length > 0 && (
            <div className="space-y-5">
              {visiblePrograms.map((program) => (
                <article
                  key={program.id}
                  className="rounded border border-slate-200 bg-white p-6 shadow-sm"
                >
                  {program.image_url ? (
                    <div
                      className="mb-5 h-40 rounded border border-slate-200 bg-slate-100 bg-cover bg-center"
                      style={{ backgroundImage: `url(${program.image_url})` }}
                    />
                  ) : (
                    <div className="mb-5 flex h-40 items-center justify-center rounded border border-dashed border-slate-300 bg-slate-50 text-sm font-semibold text-slate-500">
                      No image
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={`rounded px-3 py-1 text-sm font-bold ${
                        program.status === "published"
                          ? "bg-sky-100 text-sky-800"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {program.status === "published" ? "Published" : "Draft"}
                    </span>
                    <span className="rounded bg-yellow-100 px-3 py-1 text-sm font-bold text-yellow-800">
                      {program.qualification_level}
                    </span>
                    <span className="text-sm font-semibold text-slate-500">
                      {new Date(program.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="mt-4 text-2xl font-bold text-sky-950">
                    {program.title}
                  </h3>
                  <p className="mt-3 leading-7 text-slate-600">
                    {program.description}
                  </p>

                  <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
                    <p>
                      <span className="font-bold text-slate-700">
                        Duration:
                      </span>{" "}
                      {getDurationText(program.duration)}
                    </p>
                    <p>
                      <span className="font-bold text-slate-700">
                        Requirements:
                      </span>{" "}
                      {program.requirements}
                    </p>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => startEdit(program)}
                      className="rounded border border-sky-800 px-4 py-2 font-bold text-sky-950 transition hover:bg-sky-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => togglePublished(program)}
                      disabled={actionId === program.id}
                      className="rounded bg-sky-950 px-4 py-2 font-bold text-white transition hover:bg-sky-900 disabled:cursor-not-allowed disabled:bg-slate-400"
                    >
                      {actionId === program.id
                        ? program.status === "published"
                          ? "Unpublishing..."
                          : "Publishing..."
                        : program.status === "published"
                          ? "Unpublish"
                          : "Publish"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(program.id)}
                      disabled={actionId === program.id}
                      className="rounded bg-red-600 px-4 py-2 font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                    >
                      {actionId === program.id ? "Deleting..." : "Delete"}
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
