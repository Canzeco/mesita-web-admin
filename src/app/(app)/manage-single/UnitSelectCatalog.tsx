"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ChevronRight,
  Crown,
  Loader2,
  MapPin,
  Plus,
  Search,
  X,
} from "lucide-react";
import {
  createUnitFromPlaceId,
  findPlaceByPlaceId,
  suggestPlaces,
  type PlacePrediction,
  type PlacePredictionStatus,
} from "./actions";
import { unitSectionHref } from "./nav";
import { UnitThumb } from "./UnitEditChrome";
import { useUnitCatalogSearch } from "./useUnitCatalogSearch";
import { ErrorNote } from "./ui";

const STATUS_BADGE: Record<
  PlacePredictionStatus,
  { label: string; className: string; Icon: typeof MapPin }
> = {
  not_in_mesita: {
    label: "New · create",
    className: "bg-muted text-muted-foreground",
    Icon: Plus,
  },
  web_listed: {
    label: "On Mesita · unclaimed",
    className: "bg-secondary/15 text-secondary",
    Icon: MapPin,
  },
  verified_partner_other: {
    label: "On Mesita · claimed",
    className: "bg-amber-100 text-amber-800",
    Icon: CheckCircle2,
  },
  verified_partner_self: {
    label: "On Mesita · claimed",
    className: "bg-amber-100 text-amber-800",
    Icon: Crown,
  },
};

export function UnitSelectCatalog() {
  const router = useRouter();
  const { q, setQ, hits, pending, error, metaLabel, searchedQuery, clear } =
    useUnitCatalogSearch();

  const sessionTokenRef = useRef(newSessionToken());
  const [googlePredictions, setGooglePredictions] = useState<PlacePrediction[]>([]);
  const [googleSearching, setGoogleSearching] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [googleSearchedQuery, setGoogleSearchedQuery] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [creatingLabel, setCreatingLabel] = useState<string | null>(null);
  const [createPending, startCreate] = useTransition();

  const trimmed = q.trim();
  const placeIdMode = looksLikePlaceId(trimmed);
  const catalogSettledEmpty =
    !pending &&
    !error &&
    searchedQuery !== null &&
    searchedQuery === trimmed &&
    hits.length === 0 &&
    trimmed.length >= 2;

  // When Mesita catalog search settles empty, fetch Google Places suggestions
  // so the operator can create from an external match. Catalog already debounced.
  useEffect(() => {
    if (!catalogSettledEmpty || placeIdMode) {
      return;
    }

    let cancelled = false;
    setGoogleSearching(true);
    setGoogleError(null);
    void (async () => {
      const r = await suggestPlaces(trimmed, sessionTokenRef.current);
      if (cancelled) return;
      setGoogleSearching(false);
      setGoogleSearchedQuery(trimmed);
      if (!r.ok) {
        setGoogleError(r.error);
        setGooglePredictions([]);
        return;
      }
      setGooglePredictions(r.data);
    })();

    return () => {
      cancelled = true;
    };
  }, [catalogSettledEmpty, placeIdMode, trimmed]);

  // Reset Google state whenever the query changes away from a settled empty search.
  useEffect(() => {
    if (!catalogSettledEmpty) {
      setGooglePredictions([]);
      setGoogleSearching(false);
      setGoogleError(null);
      setGoogleSearchedQuery(null);
    }
  }, [catalogSettledEmpty]);

  const pickUnit = (projectId: string) => {
    router.push(unitSectionHref(projectId, "place"));
  };

  const createFromPlaceId = (placeId: string, label?: string) => {
    setCreateError(null);
    setCreatingLabel(label ?? placeId);

    startCreate(async () => {
      const found = await findPlaceByPlaceId(placeId);
      if (!found.ok) {
        setCreateError(found.error);
        setCreatingLabel(null);
        return;
      }
      if (found.found) {
        setCreatingLabel(null);
        router.push(unitSectionHref(found.place.id, "place"));
        return;
      }

      const created = await createUnitFromPlaceId(placeId);
      if (!created.ok) {
        setCreateError(created.error);
        setCreatingLabel(null);
        return;
      }
      router.push(`/manage-single/${created.projectId}/place`);
    });
  };

  const onPickGoogle = (prediction: PlacePrediction) => {
    if (prediction.status !== "not_in_mesita") {
      // Already on Mesita — open the existing unit via place-id lookup.
      createFromPlaceId(prediction.placeId, prediction.mainText);
      return;
    }
    createFromPlaceId(prediction.placeId, prediction.mainText);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trimmed || createPending) return;

    if (placeIdMode) {
      createFromPlaceId(trimmed, trimmed);
      return;
    }

    if (hits.length === 1) {
      pickUnit(hits[0].id);
      return;
    }

    const creatable = googlePredictions.filter((p) => p.status === "not_in_mesita");
    if (catalogSettledEmpty && creatable.length === 1) {
      onPickGoogle(creatable[0]);
    }
  };

  const onClear = () => {
    clear();
    setGooglePredictions([]);
    setGoogleSearching(false);
    setGoogleError(null);
    setGoogleSearchedQuery(null);
    setCreateError(null);
    setCreatingLabel(null);
    sessionTokenRef.current = newSessionToken();
  };

  const showGoogleSection =
    catalogSettledEmpty && !placeIdMode && (googleSearching || googleError || googleSearchedQuery === trimmed);

  return (
    <div className="-mx-4 -mt-8 sm:-mx-6 sm:-mt-12 lg:-mx-8">
      <div className="border-border bg-card/95 supports-[backdrop-filter]:bg-card/85 sticky top-0 z-30 border-b px-4 py-4 backdrop-blur-md sm:px-6 sm:py-5 lg:px-8">
        <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase">
          Manage Single Unit
        </p>
        <form onSubmit={onSubmit}>
          <div className="border-border bg-background focus-within:border-foreground focus-within:ring-foreground/10 mt-3 flex h-14 items-center gap-3 rounded-xl border px-4 shadow-sm transition focus-within:ring-2 sm:h-16 sm:gap-4 sm:px-5">
            <Search className="text-muted-foreground h-5 w-5 shrink-0 sm:h-6 sm:w-6" />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setCreateError(null);
                setCreatingLabel(null);
              }}
              placeholder="Search by name, unit id, or Google Place ID…"
              autoFocus
              aria-label="Search units"
              spellCheck={false}
              className="placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent text-base outline-none sm:text-lg"
            />
            {(pending || googleSearching || createPending) && trimmed.length >= 2 && (
              <Loader2 className="text-muted-foreground h-5 w-5 shrink-0 animate-spin" />
            )}
            {!pending && !googleSearching && !createPending && q.length > 0 && (
              <button
                type="button"
                onClick={onClear}
                aria-label="Clear search"
                className="text-muted-foreground hover:text-foreground hover:bg-muted inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </form>
        {placeIdMode && !createPending && (
          <p className="text-muted-foreground mt-2 text-xs sm:text-sm">
            Google Place ID detected. Press Enter to create or open this unit.
          </p>
        )}
      </div>

      <div className="px-4 pt-5 sm:px-6 lg:px-8">
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Manage Single Unit · {metaLabel}
        </p>

        {error && <ErrorNote message={error} />}
        {createError && <ErrorNote message={createError} />}

        {creatingLabel && createPending && (
          <div className="border-border bg-card mt-4 rounded-xl border p-4">
            <p className="text-sm font-medium">{creatingLabel}</p>
            <p className="text-muted-foreground mt-2 text-xs">
              Creating unit… Deep enrichment runs in the background once it exists.
            </p>
          </div>
        )}

        <div className="mt-4 flex flex-col gap-2">
          {hits.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => pickUnit(u.id)}
              disabled={createPending}
              className="border-border bg-card hover:border-foreground/40 flex items-center gap-3 rounded-xl border p-3 text-left transition disabled:opacity-50"
            >
              <UnitThumb photo={u.photo} name={u.name} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{u.name}</p>
                <p className="text-muted-foreground truncate text-xs">
                  {u.category_label ?? u.category ?? "—"}
                  {u.status ? ` · ${u.status}` : ""}
                  {u.address ? ` · ${u.address}` : ""}
                </p>
              </div>
              <ChevronRight className="text-muted-foreground h-4 w-4 shrink-0" />
            </button>
          ))}

          {!pending && hits.length === 0 && !error && searchedQuery === null && q.trim().length === 0 && (
            <div className="border-border bg-card rounded-2xl border px-4 py-12 text-center">
              <p className="text-muted-foreground text-sm">
                No units in the catalog yet. Search a place name to create one from Google.
              </p>
            </div>
          )}
        </div>

        {showGoogleSection && (
          <div className="mt-8">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Not on Mesita · Google results
              {googleSearching
                ? " · Searching…"
                : googleSearchedQuery === trimmed
                  ? ` · ${googlePredictions.length}`
                  : ""}
            </p>

            {googleError && <ErrorNote message={googleError} />}

            <div className="mt-4 flex flex-col gap-2">
              {googlePredictions.map((p) => {
                const badge = STATUS_BADGE[p.status];
                const canCreate = p.status === "not_in_mesita";
                return (
                  <button
                    key={p.placeId}
                    type="button"
                    disabled={createPending}
                    onClick={() => onPickGoogle(p)}
                    className="border-border bg-card hover:border-foreground/40 flex items-start gap-3 rounded-xl border p-3 text-left transition disabled:opacity-50"
                  >
                    <span
                      className={
                        "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full " +
                        badge.className
                      }
                    >
                      <badge.Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-medium">{p.mainText}</span>
                        <span
                          className={
                            "inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase " +
                            badge.className
                          }
                        >
                          {badge.label}
                        </span>
                      </span>
                      {p.secondaryText && (
                        <span className="text-muted-foreground mt-0.5 block truncate text-xs">
                          {p.secondaryText}
                        </span>
                      )}
                      <span className="text-muted-foreground mt-1 block text-xs">
                        {canCreate
                          ? "Click to create this unit"
                          : "Already on Mesita — click to open"}
                      </span>
                    </span>
                    <ChevronRight className="text-muted-foreground mt-3 h-4 w-4 shrink-0" />
                  </button>
                );
              })}

              {!googleSearching &&
                !googleError &&
                googleSearchedQuery === trimmed &&
                googlePredictions.length === 0 && (
                  <div className="border-border bg-card rounded-2xl border px-4 py-12 text-center">
                    <p className="text-muted-foreground text-sm">
                      {`No Mesita units or Google matches for “${trimmed}”. Try another spelling or paste a Place ID.`}
                    </p>
                  </div>
                )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function looksLikePlaceId(raw: string): boolean {
  const s = raw.trim();
  if (s.length < 10 || /\s/.test(s)) return false;
  if (/^(ChI|EhI|GhI)/.test(s)) return true;
  return /^[A-Za-z0-9_-]+$/.test(s) && s.length >= 20;
}

function newSessionToken(): string {
  return crypto.randomUUID();
}
