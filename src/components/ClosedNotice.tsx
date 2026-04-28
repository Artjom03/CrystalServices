"use client";

import { useEffect, useMemo, useState } from "react";

// Shows a dismissible popup if we're within the closed period.
// Period: inclusive 25 May 2026 through 5 Jun 2026 (Europe/Brussels).
export default function ClosedNotice() {
  const [visible, setVisible] = useState(false);

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
      const preStartYMD = toYMD(new Date(Date.UTC(2026, 4, 18))); // 18 May 2026
      const closedStartYMD = toYMD(new Date(Date.UTC(2026, 4, 25))); // 25 May 2026
      const closedEndYMD = toYMD(new Date(Date.UTC(2026, 5, 5))); // 5 Jun 2026

      const inPre = todayYMD >= preStartYMD && todayYMD < closedStartYMD;
      const inClosed = todayYMD >= closedStartYMD && todayYMD <= closedEndYMD;
      return { phase: inClosed ? "closed" as const : inPre ? "pre" as const : null, isWithinAnyPeriod: inPre || inClosed };
    } catch (_) {
      // Fallback: simple UTC compare
      const now = new Date();
      const preStart = new Date(Date.UTC(2026, 4, 18, 0, 0, 0));
      const closedStart = new Date(Date.UTC(2026, 4, 25, 0, 0, 0));
      const closedEnd = new Date(Date.UTC(2026, 5, 5, 23, 59, 59));
      const inPre = now >= preStart && now < closedStart;
      const inClosed = now >= closedStart && now <= closedEnd;
      return { phase: inClosed ? "closed" as const : inPre ? "pre" as const : null, isWithinAnyPeriod: inPre || inClosed };
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Show the closure notice on load so the message is immediately visible.
    setVisible(true);
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    // No persistence: will show again on refresh while within the period
    setVisible(false);
  };

  const title = phase === "closed" ? "Tijdelijk gesloten" : "Vakantieperiode";

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
              <strong>Vakantieperiode:</strong> wij nemen even een pauze 😊<br />
              Van <strong>25 mei 2026</strong> t.e.m. <strong>5 juni 2026</strong> zijn we gesloten wegens jaarlijks verlof.
            </p>
            <p className="mb-6 text-sm text-gray-600">
              We verwelkomen je graag opnieuw vanaf <strong>8 juni</strong>. Bedankt voor je begrip!
            </p>
          </>
        ) : (
          <>
            <p className="mb-4 text-gray-700">
              <strong>Vakantieperiode:</strong> wij nemen even een pauze 😊<br />
              Van <strong>25 mei 2026</strong> t.e.m. <strong>5 juni 2026</strong> zijn we gesloten wegens jaarlijks verlof.
            </p>
            <p className="mb-6 text-sm text-gray-600">
              We verwelkomen je graag opnieuw vanaf <strong>8 juni</strong>. Bedankt voor je begrip!
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
