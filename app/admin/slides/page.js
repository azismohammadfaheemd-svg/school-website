"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const initialForm = {
  eyebrow_text: "",
  title: "",
  subtitle: "",
  button_text: "",
  button_link: "",
  sort_order: "",
  status: "draft",
};

const acceptedImageTypes = ["image/jpeg", "image/png", "image/webp"];

const sortOptions = [
  { value: "order-asc", label: "Sort order low to high" },
  { value: "order-desc", label: "Sort order high to low" },
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "title-asc", label: "Title A-Z" },
  { value: "title-desc", label: "Title Z-A" },
  { value: "status-asc", label: "Status A-Z" },
];

function extractSlideImagePath(imageUrl) {
  if (!imageUrl) {
    return "";
  }

  const publicUrlPath = "/storage/v1/object/public/homepage-slide-images/";
  const pathStartIndex = imageUrl.indexOf(publicUrlPath);

  if (pathStartIndex === -1) {
    console.warn("Could not extract slide image file path from URL:", imageUrl);
    return "";
  }

  const encodedFilePath = imageUrl.slice(pathStartIndex + publicUrlPath.length);

  try {
    return decodeURIComponent(encodedFilePath);
  } catch (error) {
    console.warn("Failed to decode slide image file path:", error.message);
    return encodedFilePath;
  }
}

export default function AdminSlidesPage() {
  const [formData, setFormData] = useState(initialForm);
  const [slides, setSlides] = useState([]);
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [existingImageUrl, setExistingImageUrl] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState("order-asc");
  const [editingId, setEditingId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const visibleSlides = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filteredSlides = slides.filter((slide) => {
      const searchableText = [
        slide.eyebrow_text,
        slide.title,
        slide.subtitle,
        slide.button_text,
        slide.button_link,
        slide.sort_order,
        slide.status,
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(query);
    });

    return [...filteredSlides].sort((firstSlide, secondSlide) => {
      if (sortOption === "order-desc") {
        const orderDifference =
          (secondSlide.sort_order || 0) - (firstSlide.sort_order || 0);

        if (orderDifference !== 0) {
          return orderDifference;
        }

        return new Date(firstSlide.created_at) - new Date(secondSlide.created_at);
      }

      if (sortOption === "newest") {
        return new Date(secondSlide.created_at) - new Date(firstSlide.created_at);
      }

      if (sortOption === "oldest") {
        return new Date(firstSlide.created_at) - new Date(secondSlide.created_at);
      }

      if (sortOption === "title-asc") {
        return (firstSlide.title || "").localeCompare(secondSlide.title || "");
      }

      if (sortOption === "title-desc") {
        return (secondSlide.title || "").localeCompare(firstSlide.title || "");
      }

      if (sortOption === "status-asc") {
        return (firstSlide.status || "").localeCompare(secondSlide.status || "");
      }

      const orderDifference =
        (firstSlide.sort_order || 0) - (secondSlide.sort_order || 0);

      if (orderDifference !== 0) {
        return orderDifference;
      }

      return new Date(firstSlide.created_at) - new Date(secondSlide.created_at);
    });
  }, [slides, searchQuery, sortOption]);

  async function fetchSlides() {
    setIsLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("homepage_slides")
      .select(
        "id, eyebrow_text, title, subtitle, image_url, button_text, button_link, sort_order, status, created_at, updated_at"
      )
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      setErrorMessage(error.message);
      setSlides([]);
    } else {
      setSlides(data || []);
    }

    setIsLoading(false);
  }

  useEffect(() => {
    async function loadSlides() {
      await fetchSlides();
    }

    loadSlides();
  }, []);

  function updateForm(event) {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function startEdit(slide) {
    setEditingId(slide.id);
    setErrorMessage("");
    setSuccessMessage("");
    setSelectedImageFile(null);
    setImagePreviewUrl("");
    setExistingImageUrl(slide.image_url || "");
    setFormData({
      eyebrow_text: slide.eyebrow_text || "",
      title: slide.title || "",
      subtitle: slide.subtitle || "",
      button_text: slide.button_text || "",
      button_link: slide.button_link || "",
      sort_order: String(slide.sort_order ?? ""),
      status: slide.status || "draft",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setFormData(initialForm);
    setSelectedImageFile(null);
    setImagePreviewUrl("");
    setExistingImageUrl("");
    setErrorMessage("");
    setSuccessMessage("");
  }

  function handleImageChange(event) {
    const file = event.target.files?.[0];
    setErrorMessage("");
    setSuccessMessage("");

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

  async function uploadSlideImage(file) {
    const fileExtension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const fileName = `${Date.now()}-${crypto.randomUUID()}.${fileExtension}`;
    const filePath = `homepage-slides/${fileName}`;

    setIsUploading(true);

    const { error } = await supabase.storage
      .from("homepage-slide-images")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    setIsUploading(false);

    if (error) {
      throw new Error(error.message);
    }

    const { data } = supabase.storage
      .from("homepage-slide-images")
      .getPublicUrl(filePath);

    return data.publicUrl;
  }

  async function getNextSortOrder() {
    const { data, error } = await supabase
      .from("homepage_slides")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1);

    if (error) {
      throw new Error(error.message);
    }

    const highestSortOrder = Number(data?.[0]?.sort_order || 0);
    return highestSortOrder + 1;
  }

  async function deleteSlideImage(imageUrl) {
    const filePath = extractSlideImagePath(imageUrl);

    if (!filePath) {
      return;
    }

    const { error } = await supabase.storage
      .from("homepage-slide-images")
      .remove([filePath]);

    if (error) {
      console.warn(
        "Failed to delete homepage slide image from Supabase Storage:",
        error.message
      );
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    let imageUrl = editingId ? existingImageUrl || "" : "";

    if (!selectedImageFile && !imageUrl) {
      setErrorMessage("A slide image is required.");
      setIsSubmitting(false);
      return;
    }

    if (selectedImageFile) {
      try {
        imageUrl = await uploadSlideImage(selectedImageFile);
      } catch (error) {
        setErrorMessage(error.message);
        setIsSubmitting(false);
        return;
      }
    }

    const trimmedSortOrder = String(formData.sort_order).trim();
    let sortOrder = null;

    if (trimmedSortOrder) {
      sortOrder = Number(trimmedSortOrder);

      if (!Number.isInteger(sortOrder) || sortOrder <= 0) {
        setErrorMessage("Sort order must be a positive number.");
        setIsSubmitting(false);
        return;
      }
    } else if (editingId) {
      const existingSlide = slides.find((slide) => slide.id === editingId);
      sortOrder = Number(existingSlide?.sort_order || 1);
    } else {
      try {
        sortOrder = await getNextSortOrder();
      } catch (error) {
        setErrorMessage(error.message);
        setIsSubmitting(false);
        return;
      }
    }

    const slideData = {
      eyebrow_text: formData.eyebrow_text,
      title: formData.title,
      subtitle: formData.subtitle,
      image_url: imageUrl,
      button_text: formData.button_text,
      button_link: formData.button_link,
      sort_order: sortOrder,
      status: formData.status,
    };

    const { error } = editingId
      ? await supabase
          .from("homepage_slides")
          .update(slideData)
          .eq("id", editingId)
      : await supabase.from("homepage_slides").insert(slideData);

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
        setSortOption("order-asc");
      }
      setSuccessMessage(
        editingId
          ? "Homepage slide updated successfully."
          : "Homepage slide created successfully."
      );
      await fetchSlides();
    }

    setIsSubmitting(false);
  }

  async function handleDelete(id) {
    const shouldDelete = window.confirm(
      "Are you sure you want to delete this homepage slide?"
    );

    if (!shouldDelete) {
      return;
    }

    setActionId(id);
    setErrorMessage("");
    setSuccessMessage("");

    const slide = slides.find((item) => item.id === id);

    await deleteSlideImage(slide?.image_url);

    const { error } = await supabase
      .from("homepage_slides")
      .delete()
      .eq("id", id);

    if (error) {
      setErrorMessage(`Failed to delete homepage slide: ${error.message}`);
    } else {
      if (editingId === id) {
        cancelEdit();
      }

      setSuccessMessage("Homepage slide deleted successfully.");
      await fetchSlides();
    }

    setActionId(null);
  }

  async function togglePublished(slide) {
    setActionId(slide.id);
    setErrorMessage("");
    setSuccessMessage("");

    const nextStatus = slide.status === "published" ? "draft" : "published";

    const { error } = await supabase
      .from("homepage_slides")
      .update({ status: nextStatus })
      .eq("id", slide.id);

    if (error) {
      setErrorMessage(error.message);
    } else {
      setSuccessMessage(
        nextStatus === "published"
          ? "Homepage slide published successfully."
          : "Homepage slide unpublished successfully."
      );
      await fetchSlides();
    }

    setActionId(null);
  }

  return (
    <section>
      <p className="text-sm font-bold uppercase tracking-[0.18em] text-yellow-600">
        Homepage
      </p>
      <h1 className="mt-3 text-4xl font-bold text-sky-950">
        Homepage Slides
      </h1>
      <p className="mt-4 max-w-2xl leading-7 text-slate-700">
        Create, edit, publish, unpublish, and delete homepage banner slides.
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
              {editingId ? "Edit Slide" : "Create Slide"}
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
              Eyebrow Text
              <input
                name="eyebrow_text"
                type="text"
                value={formData.eyebrow_text}
                onChange={updateForm}
                className="w-full rounded border border-slate-300 px-4 py-3 font-normal outline-none focus:border-yellow-500"
                placeholder="Example: Senior High School"
              />
            </label>

            <label className="grid gap-2 font-semibold text-slate-700">
              Title
              <input
                name="title"
                type="text"
                value={formData.title}
                onChange={updateForm}
                className="w-full rounded border border-slate-300 px-4 py-3 font-normal outline-none focus:border-yellow-500"
                placeholder="Enter slide title"
              />
            </label>

            <label className="grid gap-2 font-semibold text-slate-700">
              Subtitle
              <textarea
                name="subtitle"
                rows="4"
                value={formData.subtitle}
                onChange={updateForm}
                className="w-full rounded border border-slate-300 px-4 py-3 font-normal outline-none focus:border-yellow-500"
                placeholder="Enter slide subtitle"
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 font-semibold text-slate-700">
                Button Text
                <input
                  name="button_text"
                  type="text"
                  value={formData.button_text}
                  onChange={updateForm}
                  className="w-full rounded border border-slate-300 px-4 py-3 font-normal outline-none focus:border-yellow-500"
                  placeholder="Example: Apply Now"
                />
              </label>

              <label className="grid gap-2 font-semibold text-slate-700">
                Button Link
                <input
                  name="button_link"
                  type="text"
                  value={formData.button_link}
                  onChange={updateForm}
                  className="w-full rounded border border-slate-300 px-4 py-3 font-normal outline-none focus:border-yellow-500"
                  placeholder="Example: /enrollment"
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <label
                  htmlFor="sort_order"
                  className="font-semibold text-slate-700"
                >
                  Sort Order (optional)
                </label>
                <input
                  id="sort_order"
                  name="sort_order"
                  type="number"
                  min="1"
                  value={formData.sort_order}
                  onChange={updateForm}
                  className="w-full rounded border border-slate-300 px-4 py-3 font-normal outline-none focus:border-yellow-500"
                />
                <span className="text-sm font-normal text-slate-500">
                  Leave blank to place this slide at the end.
                </span>
              </div>

              <div className="grid gap-2">
                <label htmlFor="status" className="font-semibold text-slate-700">
                  Status
                </label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={updateForm}
                  className="w-full rounded border border-slate-300 px-4 py-3 font-normal outline-none focus:border-yellow-500"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </div>
            </div>

            <div className="grid gap-3">
              <label className="grid gap-2 font-semibold text-slate-700">
                Slide Image
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
                  ? "Update Slide"
                  : "Create Slide"}
            </button>
          </div>
        </form>

        <div>
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-2xl font-bold text-sky-950">All Slides</h2>
            <button
              type="button"
              onClick={fetchSlides}
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
              placeholder="Search slides..."
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
              Loading homepage slides...
            </p>
          )}

          {!isLoading && slides.length === 0 && (
            <p className="rounded border border-slate-200 bg-white p-6 text-slate-700 shadow-sm">
              No homepage slides found.
            </p>
          )}

          {!isLoading && slides.length > 0 && visibleSlides.length === 0 && (
            <p className="rounded border border-slate-200 bg-white p-6 text-slate-700 shadow-sm">
              No homepage slides match your search.
            </p>
          )}

          {!isLoading && visibleSlides.length > 0 && (
            <div className="space-y-5">
              {visibleSlides.map((slide) => (
                <article
                  key={slide.id}
                  className="rounded border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div
                    className="mb-5 h-44 rounded border border-slate-200 bg-slate-100 bg-cover bg-center"
                    style={{ backgroundImage: `url(${slide.image_url})` }}
                  />

                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={`rounded px-3 py-1 text-sm font-bold ${
                        slide.status === "published"
                          ? "bg-sky-100 text-sky-800"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {slide.status === "published" ? "Published" : "Draft"}
                    </span>
                    <span className="rounded bg-yellow-100 px-3 py-1 text-sm font-bold text-yellow-800">
                      Sort Order: {slide.sort_order ?? 0}
                    </span>
                    <span className="text-sm font-semibold text-slate-500">
                      {new Date(slide.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="mt-4 text-2xl font-bold text-sky-950">
                    {slide.title || "Untitled slide"}
                  </h3>
                  {slide.eyebrow_text && (
                    <p className="mt-2 text-sm font-bold uppercase tracking-[0.18em] text-yellow-600">
                      {slide.eyebrow_text}
                    </p>
                  )}
                  {slide.subtitle && (
                    <p className="mt-3 leading-7 text-slate-600">
                      {slide.subtitle}
                    </p>
                  )}

                  {(slide.button_text || slide.button_link) && (
                    <div className="mt-4 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                      <p>
                        <span className="font-bold text-slate-700">
                          Button Text:
                        </span>{" "}
                        {slide.button_text || "Not set"}
                      </p>
                      <p>
                        <span className="font-bold text-slate-700">
                          Button Link:
                        </span>{" "}
                        {slide.button_link || "Not set"}
                      </p>
                    </div>
                  )}

                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => startEdit(slide)}
                      className="rounded border border-sky-800 px-4 py-2 font-bold text-sky-950 transition hover:bg-sky-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => togglePublished(slide)}
                      disabled={actionId === slide.id}
                      className="rounded bg-sky-950 px-4 py-2 font-bold text-white transition hover:bg-sky-900 disabled:cursor-not-allowed disabled:bg-slate-400"
                    >
                      {actionId === slide.id
                        ? slide.status === "published"
                          ? "Unpublishing..."
                          : "Publishing..."
                        : slide.status === "published"
                          ? "Unpublish"
                          : "Publish"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(slide.id)}
                      disabled={actionId === slide.id}
                      className="rounded bg-red-600 px-4 py-2 font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                    >
                      {actionId === slide.id ? "Deleting..." : "Delete"}
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
