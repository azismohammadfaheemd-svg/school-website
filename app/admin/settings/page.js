"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import SiteBrandName, { DEFAULT_SITE_NAME } from "@/app/components/SiteBrandName";

const initialForm = {
  site_name: DEFAULT_SITE_NAME,
  logo_url: "",
  contact_number: "",
  email: "",
  address: "",
  facebook_url: "",
  office_hours: "",
};

const acceptedImageTypes = ["image/jpeg", "image/png", "image/webp"];

function extractLogoPath(logoUrl) {
  if (!logoUrl) {
    return "";
  }

  const publicUrlPath = "/storage/v1/object/public/site-assets/";
  const pathStartIndex = logoUrl.indexOf(publicUrlPath);

  if (pathStartIndex === -1) {
    console.warn("Could not extract logo file path from URL:", logoUrl);
    return "";
  }

  const encodedFilePath = logoUrl.slice(pathStartIndex + publicUrlPath.length);

  try {
    return decodeURIComponent(encodedFilePath);
  } catch (error) {
    console.warn("Failed to decode logo file path:", error.message);
    return encodedFilePath;
  }
}

export default function AdminSettingsPage() {
  const [formData, setFormData] = useState(initialForm);
  const [settingsId, setSettingsId] = useState(null);
  const [selectedLogoFile, setSelectedLogoFile] = useState(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState("");
  const [existingLogoUrl, setExistingLogoUrl] = useState("");
  const [logoLoadFailed, setLogoLoadFailed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  function applySettings(settings) {
    setSettingsId(settings.id || null);
    setExistingLogoUrl(settings.logo_url || "");
    setLogoLoadFailed(false);
    setFormData({
      site_name: settings.site_name || DEFAULT_SITE_NAME,
      logo_url: settings.logo_url || "",
      contact_number: settings.contact_number || "",
      email: settings.email || "",
      address: settings.address || "",
      facebook_url: settings.facebook_url || "",
      office_hours: settings.office_hours || "",
    });
  }

  async function fetchSettings() {
    setIsLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    const { data, error } = await supabase
      .from("site_settings")
      .select(
        "id, site_name, logo_url, contact_number, email, address, facebook_url, office_hours, updated_at"
      )
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      setErrorMessage(error.message);
      setIsLoading(false);
      return;
    }

    if (data) {
      applySettings(data);
    } else {
      setSettingsId(null);
      setExistingLogoUrl("");
      setLogoLoadFailed(false);
      setFormData({ ...initialForm });
    }

    setIsLoading(false);
  }

  useEffect(() => {
    async function loadSettings() {
      await fetchSettings();
    }

    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateForm(event) {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleLogoChange(event) {
    const file = event.target.files?.[0];
    setErrorMessage("");
    setSuccessMessage("");
    setLogoLoadFailed(false);

    if (!file) {
      setSelectedLogoFile(null);
      setLogoPreviewUrl("");
      return;
    }

    if (!acceptedImageTypes.includes(file.type)) {
      setSelectedLogoFile(null);
      setLogoPreviewUrl("");
      event.target.value = "";
      setErrorMessage("Only JPG, JPEG, PNG, and WEBP images are allowed.");
      return;
    }

    setSelectedLogoFile(file);
    setLogoPreviewUrl(URL.createObjectURL(file));
  }

  async function uploadLogo(file) {
    const fileExtension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const fileName = `${Date.now()}-${crypto.randomUUID()}.${fileExtension}`;
    const filePath = `logos/${fileName}`;

    setIsUploading(true);

    const { error } = await supabase.storage
      .from("site-assets")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    setIsUploading(false);

    if (error) {
      throw new Error(error.message);
    }

    const { data } = supabase.storage.from("site-assets").getPublicUrl(filePath);

    return data.publicUrl;
  }

  async function deleteOldLogoIfReplaced(oldLogoUrl, newLogoUrl) {
    if (!oldLogoUrl || oldLogoUrl === newLogoUrl) {
      return;
    }

    const filePath = extractLogoPath(oldLogoUrl);

    if (!filePath) {
      return;
    }

    const { error } = await supabase.storage.from("site-assets").remove([filePath]);

    if (error) {
      console.warn("Failed to delete old site logo from Supabase Storage:", error.message);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    let logoUrl = existingLogoUrl || "";

    if (selectedLogoFile) {
      try {
        logoUrl = await uploadLogo(selectedLogoFile);
      } catch (error) {
        setErrorMessage(error.message);
        setIsSubmitting(false);
        return;
      }
    }

    const settingsData = {
      site_name: formData.site_name.trim() || DEFAULT_SITE_NAME,
      logo_url: logoUrl,
      contact_number: formData.contact_number,
      email: formData.email,
      address: formData.address,
      facebook_url: formData.facebook_url,
      office_hours: formData.office_hours,
    };

    const saveQuery = settingsId
      ? supabase
          .from("site_settings")
          .update(settingsData)
          .eq("id", settingsId)
      : supabase.from("site_settings").insert(settingsData);

    const { data, error } = await saveQuery
      .select(
        "id, site_name, logo_url, contact_number, email, address, facebook_url, office_hours, updated_at"
      )
      .single();

    if (error) {
      setErrorMessage(error.message);
    } else {
      if (selectedLogoFile) {
        await deleteOldLogoIfReplaced(existingLogoUrl, logoUrl);
      }

      setSelectedLogoFile(null);
      setLogoPreviewUrl("");
      applySettings(data);
      setSuccessMessage("Contact and logo settings updated successfully.");
    }

    setIsSubmitting(false);
  }

  const previewLogoUrl = logoPreviewUrl || existingLogoUrl;

  return (
    <section>
      <p className="text-sm font-bold uppercase tracking-[0.18em] text-yellow-600">
        Settings
      </p>
      <h1 className="mt-3 text-4xl font-bold text-sky-950">
        Contact/Logo Settings
      </h1>
      <p className="mt-4 max-w-2xl leading-7 text-slate-700">
        Update the public website name, logo, and contact information. Mission
        and vision are intentionally not editable here.
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

      {isLoading ? (
        <p className="mt-8 rounded border border-slate-200 bg-white p-6 text-slate-700 shadow-sm">
          Loading settings...
        </p>
      ) : (
        <div className="mt-8 grid gap-8 xl:grid-cols-[0.8fr_1.2fr]">
          <form
            onSubmit={handleSubmit}
            className="rounded border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h2 className="text-2xl font-bold text-sky-950">Public Settings</h2>

            <div className="mt-6 grid gap-4">
              <label className="grid gap-2 font-semibold text-slate-700">
                Website Name
                <input
                  name="site_name"
                  type="text"
                  value={formData.site_name}
                  onChange={updateForm}
                  className="w-full rounded border border-slate-300 px-4 py-3 font-normal outline-none focus:border-yellow-500"
                  placeholder={DEFAULT_SITE_NAME}
                />
              </label>

              <div className="grid gap-3">
                <label className="grid gap-2 font-semibold text-slate-700">
                  School Logo
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                    onChange={handleLogoChange}
                    className="w-full rounded border border-slate-300 px-4 py-3 font-normal outline-none file:mr-4 file:rounded file:border-0 file:bg-sky-950 file:px-4 file:py-2 file:font-bold file:text-white focus:border-yellow-500"
                  />
                  <span className="text-sm font-normal text-slate-500">
                    PNG with transparent background is recommended for best
                    quality.
                  </span>
                </label>

                {previewLogoUrl && !logoLoadFailed && (
                  <div>
                    <p className="mb-2 text-sm font-semibold text-slate-600">
                      {logoPreviewUrl ? "Selected logo preview" : "Current logo"}
                    </p>
                    <div className="flex h-36 items-center justify-center">
                      <img
                        src={previewLogoUrl}
                        alt="School logo preview"
                        className="max-h-full max-w-full object-contain"
                        onError={() => setLogoLoadFailed(true)}
                      />
                    </div>
                  </div>
                )}

                {(!previewLogoUrl || logoLoadFailed) && (
                  <div className="flex h-36 items-center justify-center rounded border border-dashed border-slate-300 bg-slate-50 text-sm font-semibold text-slate-500">
                    Default text logo will be used.
                  </div>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 font-semibold text-slate-700">
                  Contact Number
                  <input
                    name="contact_number"
                    type="text"
                    value={formData.contact_number}
                    onChange={updateForm}
                    className="w-full rounded border border-slate-300 px-4 py-3 font-normal outline-none focus:border-yellow-500"
                    placeholder="Example: (555) 014-2026"
                  />
                </label>

                <label className="grid gap-2 font-semibold text-slate-700">
                  Email
                  <input
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={updateForm}
                    className="w-full rounded border border-slate-300 px-4 py-3 font-normal outline-none focus:border-yellow-500"
                    placeholder="Example: office@school.edu"
                  />
                </label>
              </div>

              <label className="grid gap-2 font-semibold text-slate-700">
                Address
                <textarea
                  name="address"
                  rows="4"
                  value={formData.address}
                  onChange={updateForm}
                  className="w-full rounded border border-slate-300 px-4 py-3 font-normal outline-none focus:border-yellow-500"
                  placeholder="Enter school address"
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 font-semibold text-slate-700">
                  Facebook URL
                  <input
                    name="facebook_url"
                    type="url"
                    value={formData.facebook_url}
                    onChange={updateForm}
                    className="w-full rounded border border-slate-300 px-4 py-3 font-normal outline-none focus:border-yellow-500"
                    placeholder="https://facebook.com/your-school"
                  />
                </label>

                <label className="grid gap-2 font-semibold text-slate-700">
                  Office Hours
                  <input
                    name="office_hours"
                    type="text"
                    value={formData.office_hours}
                    onChange={updateForm}
                    className="w-full rounded border border-slate-300 px-4 py-3 font-normal outline-none focus:border-yellow-500"
                    placeholder="Example: Monday-Friday, 8:00 AM-5:00 PM"
                  />
                </label>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded bg-yellow-400 px-6 py-3 font-bold text-sky-950 transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {isSubmitting || isUploading
                  ? isUploading
                    ? "Uploading logo..."
                    : "Saving..."
                  : "Save Settings"}
              </button>
            </div>
          </form>

          <div className="rounded border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-sky-950">Public Preview</h2>
            <p className="mt-3 leading-7 text-slate-600">
              These values are shown on the public website header, footer, and
              contact page. Mission and vision remain fixed.
            </p>

            <div className="mt-6 rounded border border-sky-100 bg-sky-50 p-5">
              <div className="flex items-center gap-4">
                {previewLogoUrl && !logoLoadFailed ? (
                  <img
                    src={previewLogoUrl}
                    alt="School logo"
                    className="h-16 w-16 object-contain"
                    onError={() => setLogoLoadFailed(true)}
                  />
                ) : (
                  <span className="flex size-16 items-center justify-center rounded bg-sky-100 text-xl font-bold text-emerald-700 ring-1 ring-sky-200">
                    GH
                  </span>
                )}
                <div>
                  <p className="text-lg font-bold text-sky-950">
                    <SiteBrandName
                      siteName={formData.site_name}
                      firstClassName="text-yellow-600"
                      restClassName="text-sky-950"
                    />
                  </p>
                  <p className="text-sm text-emerald-700">
                    Learn well. Live well.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-3 text-sm text-slate-700">
                <p>
                  <span className="font-bold text-slate-800">Phone:</span>{" "}
                  {formData.contact_number || "Not set"}
                </p>
                <p>
                  <span className="font-bold text-slate-800">Email:</span>{" "}
                  {formData.email || "Not set"}
                </p>
                <p>
                  <span className="font-bold text-slate-800">Address:</span>{" "}
                  {formData.address || "Not set"}
                </p>
                <p>
                  <span className="font-bold text-slate-800">Office Hours:</span>{" "}
                  {formData.office_hours || "Not set"}
                </p>
                <p>
                  <span className="font-bold text-slate-800">Facebook:</span>{" "}
                  {formData.facebook_url || "Not set"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
