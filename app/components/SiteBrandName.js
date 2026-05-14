"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export const DEFAULT_SITE_NAME = "JMD Training Institute";

export function splitSiteName(siteName) {
  const cleanName = String(siteName || DEFAULT_SITE_NAME).trim() || DEFAULT_SITE_NAME;
  const [firstWord, ...restWords] = cleanName.split(/\s+/);

  return {
    firstWord,
    restName: restWords.join(" "),
    fullName: cleanName,
  };
}

export function useSiteName() {
  const [siteName, setSiteName] = useState(DEFAULT_SITE_NAME);

  useEffect(() => {
    let isActive = true;

    async function fetchSiteName() {
      const { data, error } = await supabase
        .from("site_settings")
        .select("site_name, updated_at")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!isActive || error) {
        return;
      }

      setSiteName(data?.site_name?.trim() || DEFAULT_SITE_NAME);
    }

    fetchSiteName();

    return () => {
      isActive = false;
    };
  }, []);

  return siteName;
}

export default function SiteBrandName({
  siteName,
  className = "",
  firstClassName = "text-yellow-500",
  restClassName = "",
}) {
  const fetchedSiteName = useSiteName();
  const resolvedSiteName = siteName || fetchedSiteName;
  const { firstWord, restName } = useMemo(
    () => splitSiteName(resolvedSiteName),
    [resolvedSiteName]
  );

  return (
    <span className={className}>
      <span className={firstClassName}>{firstWord}</span>
      {restName && (
        <>
          {" "}
          <span className={restClassName}>{restName}</span>
        </>
      )}
    </span>
  );
}
