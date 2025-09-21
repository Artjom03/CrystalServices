"use client";

import { useEffect, useMemo, useState } from "react";

// Shows a dismissible popup if we're within the closed period.
// Period: inclusive 29 Sep 2025 through 8 Oct 2025 (Europe/Brussels)
// Persists dismissal in localStorage for this season.
export default function ClosedNotice() {
  const [visible, setVisible] = useState(false);
  // Base for dismissal keys; separate keys for pre-notice vs closed so both can be shown once
  const storageBase = "closedNotice-2025b";

  // Compute if now is within the closed window, using Europe/Brussels timezone.
  const { phase, isWithinAnyPeriod } = useMemo(() => {
    try {
      const fmt = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/Brussels",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });

      // Helper to build a Date from y,m,d at 00:00 Brussels and compare by y-m-d
      const toYMD = (d: Date) => {
        const parts = fmt.formatToParts(d);
        const day = parts.find(p => p.type === "day")?.value;
        const month = parts.find(p => p.type === "month")?.value;
        const year = parts.find(p => p.type === "year")?.value;
        return `${year}-${month}-${day}`; // YYYY-MM-DD
      };

      const todayYMD = toYMD(new Date());
      const preStartYMD = toYMD(new Date(Date.UTC(2025, 8, 21))); // 21 Sep 2025
      const closedStartYMD = toYMD(new Date(Date.UTC(2025, 8, 29))); // 29 Sep 2025
      const closedEndYMD = toYMD(new Date(Date.UTC(2025, 9, 8))); // 8 Oct 2025

      const inPre = todayYMD >= preStartYMD && todayYMD < closedStartYMD;
      const inClosed = todayYMD >= closedStartYMD && todayYMD <= closedEndYMD;
      return { phase: inClosed ? "closed" as const : inPre ? "pre" as const : null, isWithinAnyPeriod: inPre || inClosed };
    } catch (_) {
      // Fallback: simple UTC compare
      const now = new Date();
      const preStart = new Date(Date.UTC(2025, 8, 21, 0, 0, 0));
      const closedStart = new Date(Date.UTC(2025, 8, 29, 0, 0, 0));
      const closedEnd = new Date(Date.UTC(2025, 9, 8, 23, 59, 59));
      const inPre = now >= preStart && now < closedStart;
      const inClosed = now >= closedStart && now <= closedEnd;
      return { phase: inClosed ? "closed" as const : inPre ? "pre" as const : null, isWithinAnyPeriod: inPre || inClosed };
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Allow forcing the popup for testing with ?closedTest=1 or ?forceClosedNotice
    const params = new URLSearchParams(window.location.search);
    const forced = params.get("closedTest") === "1" || params.has("forceClosedNotice");
    if (forced) {
      setVisible(true);
      return;
    }

    if (!isWithinAnyPeriod || !phase) return;

    const key = `${storageBase}-${phase}`;
    const dismissed = window.localStorage.getItem(key);
    if (!dismissed) setVisible(true);
  }, [isWithinAnyPeriod, phase, storageBase]);

  if (!visible) return null;

  const dismiss = () => {
    try {
      const key = `${storageBase}-${phase ?? "pre"}`;
      window.localStorage.setItem(key, "1");
    } catch {}
    setVisible(false);
  };

  const title = phase === "closed" ? "Tijdelijk gesloten" : "Binnenkort tijdelijk gesloten";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={dismiss} />

      <div className="relative z-10 w-[92vw] max-w-md rounded-lg bg-white p-6 shadow-xl">
        <button
          aria-label="Sluiten"
          className="absolute right-3 top-3 rounded-md p-1 text-gray-500 hover:bg-gray-100"
          onClick={dismiss}
        >
          ✕
        </button>

        <h2 className="mb-2 text-xl font-bold text-gray-900">{title}</h2>
        {phase === "closed" ? (
          <>
            <p className="mb-4 text-gray-700">
              We zijn gesloten van <strong>29 september</strong> t/m <strong>8 oktober</strong>.
              Tijdens deze periode kunnen we geen ophalingen of leveringen uitvoeren.
            </p>
            <p className="mb-6 text-sm text-gray-600">
              Bedankt voor uw begrip. We helpen u graag weer vanaf <strong>9 oktober</strong>.
            </p>
          </>
        ) : (
          <>
            <p className="mb-4 text-gray-700">
              We zijn <strong>binnenkort tijdelijk gesloten</strong>: van <strong>29 september</strong> t/m <strong>8 oktober</strong>.
            </p>
            <p className="mb-6 text-sm text-gray-600">
              Plan uw ophaling of levering bij voorkeur <strong>voor 29 september</strong> of <strong>na 8 oktober</strong>.
            </p>
          </>
        )}

        <div className="flex justify-end">
          <button
            onClick={dismiss}
            className="rounded-md bg-gray-900 px-4 py-2 text-white hover:bg-black"
          >
            Begrepen
          </button>
        </div>
      </div>
    </div>
  );
}
