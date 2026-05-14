"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const initialForm = {
  title: "",
  category: "Announcement",
  content: "",
  image_url: "",
  is_published: false,
  expires_at: "",
};

const categories = ["Announcement", "Enrollment", "Event", "Achievement"];
const acceptedImageTypes = ["image/jpeg", "image/png", "image/webp"];

const sortOptions = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "title-asc", label: "Title A-Z" },
  { value: "title-desc", label: "Title Z-A" },
];

function isExpired(item) {
  return Boolean(item.expires_at && new Date(item.expires_at) <= new Date());
}

function formatDateTimeLocal(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 16);
}

function formatDisplayDateTime(value) {
  if (!value) {
    return "No expiration";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Invalid expiration date";
  }

  return date.toLocaleString();
}

export default function AdminNewsPage() {
  const router = useRouter();
  const [formData, setFormData] = useState(initialForm);
  const [newsItems, setNewsItems] = useState([]);
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [existingImageUrl, setExistingImageUrl] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [archivedSearchQuery, setArchivedSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState("newest");
  const [editingId, setEditingId] = useState(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false);
  const [deleteAllConfirmation, setDeleteAllConfirmation] = useState("");
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const activeNews = useMemo(
    () => newsItems.filter((item) => !isExpired(item)),
    [newsItems]
  );

  const endedNews = useMemo(
    () =>
      newsItems
        .filter((item) => isExpired(item))
        .sort((firstItem, secondItem) => {
          return new Date(secondItem.expires_at) - new Date(firstItem.expires_at);
        }),
    [newsItems]
  );

  const visibleNews = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filteredNews = activeNews.filter((item) => {
      const status = item.is_published ? "published" : "draft";
      const searchableText = [
        item.title,
        item.category,
        item.content,
        status,
        formatDisplayDateTime(item.expires_at),
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(query);
    });

    return [...filteredNews].sort((firstItem, secondItem) => {
      if (sortOption === "oldest") {
        return new Date(firstItem.created_at) - new Date(secondItem.created_at);
      }

      if (sortOption === "title-asc") {
        return firstItem.title.localeCompare(secondItem.title);
      }

      if (sortOption === "title-desc") {
        return secondItem.title.localeCompare(firstItem.title);
      }

      return new Date(secondItem.created_at) - new Date(firstItem.created_at);
    });
  }, [activeNews, searchQuery, sortOption]);

  const visibleEndedNews = useMemo(() => {
    const query = archivedSearchQuery.trim().toLowerCase();

    if (!query) {
      return endedNews;
    }

    return endedNews.filter((item) => {
      const status = item.is_published ? "published" : "draft";
      const searchableText = [item.title, item.category, item.content, status]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(query);
    });
  }, [archivedSearchQuery, endedNews]);

  async function fetchNews() {
    setIsLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("news")
      .select(
        "id, title, category, content, image_url, is_published, expires_at, created_at"
      )
      .order("created_at", { ascending: false });

    if (error) {
      setErrorMessage(error.message);
      setNewsItems([]);
    } else {
      setNewsItems(data || []);
    }

    setIsLoading(false);
  }

  useEffect(() => {
    let isActive = true;

    async function loadPage() {
      const { data, error } = await supabase.auth.getSession();

      if (!isActive) {
        return;
      }

      if (error) {
        setErrorMessage(error.message);
        setIsCheckingSession(false);
        setIsLoading(false);
        return;
      }

      if (!data.session) {
        router.push("/admin/login");
        return;
      }

      setIsCheckingSession(false);
      await fetchNews();
    }

    loadPage();

    return () => {
      isActive = false;
    };
  }, [router]);

  function updateForm(event) {
    const { name, value, checked, type } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function startEdit(item) {
    setEditingId(item.id);
    setErrorMessage("");
    setSuccessMessage("");
    setSelectedImageFile(null);
    setImagePreviewUrl("");
    setExistingImageUrl(item.image_url || "");
    setFormData({
      title: item.title || "",
      category: item.category || "Announcement",
      content: item.content || "",
      image_url: item.image_url || "",
      is_published: Boolean(item.is_published),
      expires_at: formatDateTimeLocal(item.expires_at),
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

  async function uploadNewsImage(file) {
    const fileExtension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const fileName = `${Date.now()}-${crypto.randomUUID()}.${fileExtension}`;
    const filePath = `news/${fileName}`;

    setIsUploading(true);

    const { error } = await supabase.storage
      .from("news-images")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    setIsUploading(false);

    if (error) {
      throw new Error(error.message);
    }

    const { data } = supabase.storage
      .from("news-images")
      .getPublicUrl(filePath);

    return data.publicUrl;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    let imageUrl = editingId ? existingImageUrl || null : null;

    if (selectedImageFile) {
      try {
        imageUrl = await uploadNewsImage(selectedImageFile);
      } catch (error) {
        setErrorMessage(error.message);
        setIsSubmitting(false);
        return;
      }
    }

    const newsData = {
      title: formData.title,
      category: formData.category,
      content: formData.content,
      image_url: imageUrl,
      is_published: formData.is_published,
      expires_at: formData.expires_at
        ? new Date(formData.expires_at).toISOString()
        : null,
    };

    const { error } = editingId
      ? await supabase.from("news").update(newsData).eq("id", editingId)
      : await supabase.from("news").insert(newsData);

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
      await fetchNews();
    }

    setIsSubmitting(false);
  }

  async function deleteNewsImage(imageUrl) {
    if (!imageUrl) {
      return;
    }

    const publicUrlPath = "/storage/v1/object/public/news-images/";
    const pathStartIndex = imageUrl.indexOf(publicUrlPath);

    if (pathStartIndex === -1) {
      console.warn("Could not extract news image file path from URL:", imageUrl);
      return;
    }

    const encodedFilePath = imageUrl.slice(pathStartIndex + publicUrlPath.length);
    let filePath = encodedFilePath;

    try {
      filePath = decodeURIComponent(encodedFilePath);
    } catch (error) {
      console.warn("Failed to decode news image file path:", error.message);
    }

    if (!filePath) {
      return;
    }

    const { error } = await supabase.storage
      .from("news-images")
      .remove([filePath]);

    if (error) {
      console.warn(
        "Failed to delete news image from Supabase Storage:",
        error.message
      );
    }
  }

  async function handleDelete(id) {
    const shouldDelete = window.confirm(
      "Are you sure you want to delete this news item?"
    );

    if (!shouldDelete) {
      return;
    }

    setActionId(id);
    setErrorMessage("");
    setSuccessMessage("");

    const newsItem = newsItems.find((item) => item.id === id);

    await deleteNewsImage(newsItem?.image_url);

    const { error } = await supabase.from("news").delete().eq("id", id);

    if (error) {
      setErrorMessage(`Failed to delete news item: ${error.message}`);
    } else {
      if (editingId === id) {
        cancelEdit();
      }

      await fetchNews();
    }

    setActionId(null);
  }

  function openDeleteAllModal() {
    setErrorMessage("");
    setSuccessMessage("");
    setDeleteAllConfirmation("");
    setIsDeleteAllModalOpen(true);
  }

  function closeDeleteAllModal() {
    if (isDeletingAll) {
      return;
    }

    setDeleteAllConfirmation("");
    setIsDeleteAllModalOpen(false);
  }

  async function handleDeleteAllArchivedNews() {
    if (deleteAllConfirmation !== "DELETE" || endedNews.length === 0) {
      return;
    }

    setIsDeletingAll(true);
    setActionId("delete-all-archived");
    setErrorMessage("");
    setSuccessMessage("");

    const archivedNews = endedNews;
    const archivedNewsIds = archivedNews.map((item) => item.id);

    await Promise.all(
      archivedNews.map((item) => deleteNewsImage(item.image_url))
    );

    const { error } = await supabase
      .from("news")
      .delete()
      .in("id", archivedNewsIds);

    if (error) {
      setErrorMessage(
        `Failed to delete all archived news: ${error.message}`
      );
    } else {
      setArchivedSearchQuery("");
      setDeleteAllConfirmation("");
      setIsDeleteAllModalOpen(false);
      setSuccessMessage("All archived news has been permanently deleted.");
      await fetchNews();
    }

    setIsDeletingAll(false);
    setActionId(null);
  }

  function restoreEndedNews(item) {
    startEdit({ ...item, is_published: true });
  }

  async function togglePublished(item) {
    setActionId(item.id);
    setErrorMessage("");
    setSuccessMessage("");

    const { error } = await supabase
      .from("news")
      .update({ is_published: !item.is_published })
      .eq("id", item.id);

    if (error) {
      setErrorMessage(error.message);
    } else {
      await fetchNews();
    }

    setActionId(null);
  }

  return (
    <section>
      <p className="text-sm font-bold uppercase tracking-[0.18em] text-yellow-600">
        Content
      </p>
      <h1 className="mt-3 text-4xl font-bold text-sky-950">
        News Management
      </h1>
      <p className="mt-4 max-w-2xl leading-7 text-slate-700">
        Create, edit, publish, unpublish, and delete school announcements.
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
              {editingId ? "Edit News" : "Create News"}
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
                placeholder="Enter news title"
              />
            </label>

            <label className="grid gap-2 font-semibold text-slate-700">
              Category
              <select
                name="category"
                value={formData.category}
                onChange={updateForm}
                className="w-full rounded border border-slate-300 px-4 py-3 font-normal outline-none focus:border-yellow-500"
              >
                {categories.map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 font-semibold text-slate-700">
              Content
              <textarea
                name="content"
                required
                rows="7"
                value={formData.content}
                onChange={updateForm}
                className="w-full rounded border border-slate-300 px-4 py-3 font-normal outline-none focus:border-yellow-500"
                placeholder="Write the announcement content"
              />
            </label>

            <div className="grid gap-3">
              <label className="grid gap-2 font-semibold text-slate-700">
                News Image
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

            <label className="grid gap-2 font-semibold text-slate-700">
              Expiration Date and Time
              <input
                name="expires_at"
                type="datetime-local"
                value={formData.expires_at}
                onChange={updateForm}
                className="w-full rounded border border-slate-300 px-4 py-3 font-normal outline-none focus:border-yellow-500"
              />
            </label>

            <label className="flex items-center gap-3 font-semibold text-slate-700">
              <input
                name="is_published"
                type="checkbox"
                checked={formData.is_published}
                onChange={updateForm}
                className="size-5 accent-yellow-500"
              />
              Published
            </label>

            <button
              type="submit"
              disabled={isSubmitting || isCheckingSession}
              className="rounded bg-yellow-400 px-6 py-3 font-bold text-sky-950 transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isSubmitting || isUploading
                  ? isUploading
                    ? "Uploading image..."
                    : editingId
                      ? "Updating..."
                      : "Saving..."
                  : editingId
                    ? "Update News"
                    : "Create News"}
            </button>
          </div>
        </form>

        <div>
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-2xl font-bold text-sky-950">Active News</h2>
            <button
              type="button"
              onClick={fetchNews}
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
              placeholder="Search news..."
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

          {(isCheckingSession || isLoading) && (
            <p className="rounded border border-slate-200 bg-white p-6 text-slate-700 shadow-sm">
              Loading news records...
            </p>
          )}

          {!isCheckingSession && !isLoading && activeNews.length === 0 && (
            <p className="rounded border border-slate-200 bg-white p-6 text-slate-700 shadow-sm">
              No active news records found.
            </p>
          )}

          {!isCheckingSession &&
            !isLoading &&
            activeNews.length > 0 &&
            visibleNews.length === 0 && (
              <p className="rounded border border-slate-200 bg-white p-6 text-slate-700 shadow-sm">
                No active news records match your search.
              </p>
            )}

          {!isCheckingSession && !isLoading && visibleNews.length > 0 && (
            <div className="space-y-5">
              {visibleNews.map((item) => (
                <article
                  key={item.id}
                  className="rounded border border-slate-200 bg-white p-6 shadow-sm"
                >
                  {item.image_url ? (
                    <div
                      className="mb-5 h-40 rounded border border-slate-200 bg-slate-100 bg-cover bg-center"
                      style={{ backgroundImage: `url(${item.image_url})` }}
                    />
                  ) : (
                    <div className="mb-5 flex h-40 items-center justify-center rounded border border-dashed border-slate-300 bg-slate-50 text-sm font-semibold text-slate-500">
                      No image
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded bg-yellow-100 px-3 py-1 text-sm font-bold text-yellow-800">
                      {item.category}
                    </span>
                    <span
                      className={`rounded px-3 py-1 text-sm font-bold ${
                        item.is_published
                          ? "bg-sky-100 text-sky-800"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {item.is_published ? "Published" : "Draft"}
                    </span>
                    <span className="text-sm font-semibold text-slate-500">
                      {new Date(item.created_at).toLocaleDateString()}
                    </span>
                    <span className="text-sm font-semibold text-slate-500">
                      Ends: {formatDisplayDateTime(item.expires_at)}
                    </span>
                  </div>

                  <h3 className="mt-4 text-2xl font-bold text-sky-950">
                    {item.title}
                  </h3>
                  <p className="mt-3 leading-7 text-slate-600">
                    {item.content}
                  </p>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => startEdit(item)}
                      className="rounded border border-sky-800 px-4 py-2 font-bold text-sky-950 transition hover:bg-sky-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => togglePublished(item)}
                      disabled={actionId === item.id}
                      className="rounded bg-sky-950 px-4 py-2 font-bold text-white transition hover:bg-sky-900 disabled:cursor-not-allowed disabled:bg-slate-400"
                    >
                      {actionId === item.id
                        ? item.is_published
                          ? "Unpublishing..."
                          : "Publishing..."
                        : item.is_published
                          ? "Unpublish"
                          : "Publish"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      disabled={actionId === item.id}
                      className="rounded bg-red-600 px-4 py-2 font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                    >
                      {actionId === item.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}

          <section className="mt-10">
            <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-yellow-600">
                  Archive
                </p>
                <h2 className="mt-2 text-2xl font-bold text-sky-950">
                  Ended News
                </h2>
              </div>
              <button
                type="button"
                onClick={openDeleteAllModal}
                disabled={endedNews.length === 0 || isLoading || isDeletingAll}
                className="rounded bg-red-600 px-4 py-2 font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {isDeletingAll ? "Deleting..." : "Delete All Archived News"}
              </button>
            </div>

            <input
              type="search"
              value={archivedSearchQuery}
              onChange={(event) => setArchivedSearchQuery(event.target.value)}
              className="mb-5 w-full rounded border border-slate-300 bg-white px-4 py-3 outline-none focus:border-yellow-500"
              placeholder="Search archived news..."
            />

            {(isCheckingSession || isLoading) && (
              <p className="rounded border border-slate-200 bg-white p-6 text-slate-700 shadow-sm">
                Loading ended news records...
              </p>
            )}

            {!isCheckingSession && !isLoading && endedNews.length === 0 && (
              <p className="rounded border border-slate-200 bg-white p-6 text-slate-700 shadow-sm">
                No ended news records found.
              </p>
            )}

            {!isCheckingSession &&
              !isLoading &&
              endedNews.length > 0 &&
              visibleEndedNews.length === 0 && (
                <p className="rounded border border-slate-200 bg-white p-6 text-slate-700 shadow-sm">
                  No archived news records match your search.
                </p>
              )}

            {!isCheckingSession && !isLoading && visibleEndedNews.length > 0 && (
              <div className="space-y-4">
                {visibleEndedNews.map((item) => (
                  <article
                    key={item.id}
                    className="rounded border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex gap-4">
                      {item.image_url && (
                        <div
                          className="h-20 w-24 shrink-0 rounded border border-slate-200 bg-slate-100 bg-cover bg-center"
                          style={{ backgroundImage: `url(${item.image_url})` }}
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="rounded bg-yellow-100 px-3 py-1 text-sm font-bold text-yellow-800">
                            {item.category}
                          </span>
                          <span
                            className={`rounded px-3 py-1 text-sm font-bold ${
                              item.is_published
                                ? "bg-sky-100 text-sky-800"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {item.is_published ? "Published" : "Draft"}
                          </span>
                          <span className="text-sm font-semibold text-red-600">
                            Ended: {formatDisplayDateTime(item.expires_at)}
                          </span>
                        </div>
                        <h3 className="mt-3 text-xl font-bold text-sky-950">
                          {item.title}
                        </h3>
                        <div className="mt-4 flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() => restoreEndedNews(item)}
                            className="rounded border border-sky-800 px-4 py-2 font-bold text-sky-950 transition hover:bg-sky-50"
                          >
                            Restore / Extend
                          </button>
                          <button
                            type="button"
                            disabled
                            className="rounded border border-slate-300 px-4 py-2 font-bold text-slate-500"
                          >
                            Kept as Archived
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item.id)}
                            disabled={actionId === item.id}
                            className="rounded bg-red-600 px-4 py-2 font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                          >
                            {actionId === item.id
                              ? "Deleting..."
                              : "Delete Permanently"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {isDeleteAllModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-lg rounded border border-slate-200 bg-white p-6 shadow-xl">
            <h2 className="text-2xl font-bold text-sky-950">
              Delete All Archived News
            </h2>
            <p className="mt-4 leading-7 text-slate-700">
              Are you sure you want to permanently delete all archived news?
              This action cannot be undone.
            </p>
            <label className="mt-5 grid gap-2 font-semibold text-slate-700">
              Type DELETE to confirm
              <input
                type="text"
                value={deleteAllConfirmation}
                onChange={(event) =>
                  setDeleteAllConfirmation(event.target.value)
                }
                className="w-full rounded border border-slate-300 px-4 py-3 font-normal outline-none focus:border-yellow-500"
                placeholder="DELETE"
              />
            </label>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={closeDeleteAllModal}
                disabled={isDeletingAll}
                className="rounded border border-slate-300 px-4 py-2 font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAllArchivedNews}
                disabled={
                  deleteAllConfirmation !== "DELETE" ||
                  endedNews.length === 0 ||
                  isDeletingAll
                }
                className="rounded bg-red-600 px-4 py-2 font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {isDeletingAll ? "Deleting..." : "Yes, Delete All"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
