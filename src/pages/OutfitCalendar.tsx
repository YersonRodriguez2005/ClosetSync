import React, { useState, useEffect, useCallback } from "react";
import {
  IonPage, IonContent, IonHeader, IonToolbar,
  IonButtons, IonBackButton, useIonViewWillEnter,
} from "@ionic/react";
import {
  ChevronLeft, ChevronRight, Plus, X, AlertTriangle,
  Calendar, Shirt,
} from "lucide-react";
import { getOutfits } from "../database/dbService";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OutfitWearEntry {
  id:        string;
  date:      string;        // "YYYY-MM-DD"
  outfitId:  string | null; // null = garment IDs used instead
  garmentIds:string[];
  eventTag:  EventTag;
  note:      string;
  previewImage?: string;
}

export type EventTag =
  | "casual"   | "trabajo"  | "reunión"
  | "cita"     | "fiesta"   | "viaje"  | "deporte" | "otro";

// ─── Storage helpers ──────────────────────────────────────────────────────────

const STORAGE_KEY = "outfit_calendar_entries";

function loadEntries(): OutfitWearEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveEntries(entries: OutfitWearEntry[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

// eslint-disable-next-line react-refresh/only-export-components
export function addWearEntry(entry: OutfitWearEntry): void {
  const entries = loadEntries();
  // Remove existing entry for that date if any (one outfit per day)
  const filtered = entries.filter((e) => e.date !== entry.date);
  saveEntries([...filtered, entry]);
}

// eslint-disable-next-line react-refresh/only-export-components
export function deleteWearEntry(id: string): void {
  const entries = loadEntries().filter((e) => e.id !== id);
  saveEntries(entries);
}

// eslint-disable-next-line react-refresh/only-export-components
export function getEntriesForMonth(year: number, month: number): OutfitWearEntry[] {
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  return loadEntries().filter((e) => e.date.startsWith(prefix));
}

// eslint-disable-next-line react-refresh/only-export-components
export function getEntryForDate(dateStr: string): OutfitWearEntry | null {
  return loadEntries().find((e) => e.date === dateStr) ?? null;
}

function detectRepetition(
  garmentIds: string[],
  currentDate: string,
): { repeated: boolean; daysAgo: number | null; entry: OutfitWearEntry | null } {
  const entries = loadEntries();
  const current = new Date(currentDate);
  const recent = entries
    .filter((e) => e.date !== currentDate)
    .filter((e) => {
      const d = new Date(e.date);
      const diff = (current.getTime() - d.getTime()) / 86400000;
      return diff > 0 && diff <= 14;
    })
    .filter((e) =>
      garmentIds.some((id) => e.garmentIds.includes(id))
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (recent.length === 0) return { repeated: false, daysAgo: null, entry: null };
  const daysAgo = Math.round(
    (current.getTime() - new Date(recent[0].date).getTime()) / 86400000
  );
  return { repeated: true, daysAgo, entry: recent[0] };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS_ES   = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MONTHS_ES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio",
                   "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

const EVENT_TAGS: { value: EventTag; label: string; emoji: string; color: string }[] = [
  { value: "casual",   label: "Casual",   emoji: "😎", color: "#34d399" },
  { value: "trabajo",  label: "Trabajo",  emoji: "💼", color: "#60a5fa" },
  { value: "reunión",  label: "Reunión",  emoji: "🤝", color: "#f59e0b" },
  { value: "cita",     label: "Cita",     emoji: "💑", color: "#f472b6" },
  { value: "fiesta",   label: "Fiesta",   emoji: "🎉", color: "#a78bfa" },
  { value: "viaje",    label: "Viaje",    emoji: "✈️", color: "#38bdf8" },
  { value: "deporte",  label: "Deporte",  emoji: "🏃", color: "#fb923c" },
  { value: "otro",     label: "Otro",     emoji: "📌", color: "#94a3b8" },
];

const TAG_MAP = Object.fromEntries(EVENT_TAGS.map((t) => [t.value, t]));

// ─── Heatmap color by density ─────────────────────────────────────────────────

function heatColor(hasEntry: boolean, tag?: EventTag): string {
  if (!hasEntry) return "rgba(255,255,255,0.04)";
  const t = tag ? TAG_MAP[tag] : null;
  return t ? `${t.color}55` : "rgba(102,126,234,0.35)";
}

function heatBorder(hasEntry: boolean, tag?: EventTag): string {
  if (!hasEntry) return "rgba(255,255,255,0.06)";
  const t = tag ? TAG_MAP[tag] : null;
  return t ? `${t.color}88` : "rgba(102,126,234,0.6)";
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const STYLES = `
  @keyframes fadeUp  { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
  @keyframes slideUp { from{opacity:0;transform:translateY(100%)} to{opacity:1;transform:translateY(0)} }

  .animate-fade-up  { animation: fadeUp  0.4s cubic-bezier(0.22,1,0.36,1) both; }
  .animate-fade-in  { animation: fadeIn  0.3s ease both; }
  .animate-slide-up { animation: slideUp 0.38s cubic-bezier(0.22,1,0.36,1) both; }

  .btn-tap {
    -webkit-tap-highlight-color: transparent;
    transition: transform 0.15s cubic-bezier(0.22,1,0.36,1), opacity 0.15s;
    will-change: transform;
  }
  .btn-tap:active { transform: scale(0.93); opacity: 0.8; }

  .day-cell {
    -webkit-tap-highlight-color: transparent;
    transition: transform 0.15s cubic-bezier(0.22,1,0.36,1), box-shadow 0.15s ease;
    will-change: transform;
  }
  .day-cell:active { transform: scale(0.88); }

  .bottom-sheet-overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.65);
    backdrop-filter: blur(8px);
    z-index: 200;
    display: flex; align-items: flex-end; justify-content: center;
    animation: fadeIn 0.2s ease both;
  }
  .bottom-sheet {
    width: 100%; max-width: 480px;
    max-height: 88vh;
    overflow-y: auto;
    background: linear-gradient(160deg,#1a1740,#2d2660);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 28px 28px 0 0;
    padding: 20px 20px calc(32px + env(safe-area-inset-bottom));
    animation: slideUp 0.35s cubic-bezier(0.22,1,0.36,1) both;
  }

  .note-input {
    width: 100%;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 14px;
    color: white; font-size: 14px;
    padding: 12px 14px; outline: none; resize: none;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .note-input:focus {
    border-color: rgba(102,126,234,0.6);
    box-shadow: 0 0 0 3px rgba(102,126,234,0.12);
  }
  .note-input::placeholder { color: rgba(255,255,255,0.25); }

  .scrollbar-hide::-webkit-scrollbar { display: none; }
  .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
`;

// ─── Day Detail Sheet ─────────────────────────────────────────────────────────

interface DaySheetProps {
  dateStr:  string;
  entry:    OutfitWearEntry | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  outfits:  any[];
  onClose:  () => void;
  onSaved:  () => void;
}

const DaySheet: React.FC<DaySheetProps> = ({ dateStr, entry, outfits, onClose, onSaved }) => {
  const [selectedTag,   setSelectedTag]   = useState<EventTag>(entry?.eventTag ?? "casual");
  const [note,          setNote]          = useState(entry?.note ?? "");
  const [selectedOutfit,setSelectedOutfit]= useState<string | null>(entry?.outfitId ?? null);
  const [repetitionInfo, setRepetitionInfo] = useState<ReturnType<typeof detectRepetition> | null>(null);

  // Check repetition when outfit changes
  useEffect(() => {
    if (!selectedOutfit) { setRepetitionInfo(null); return; }
    const outfit = outfits.find((o) => o.id === selectedOutfit);
    if (!outfit) return;
    // Approximate garmentIds from outfit (stored in canvas JSON — we use id as proxy)
    const info = detectRepetition([selectedOutfit], dateStr);
    setRepetitionInfo(info);
  }, [selectedOutfit, dateStr, outfits]);

  const dateLabel = new Date(dateStr + "T12:00:00").toLocaleDateString("es-CO", {
    weekday: "long", day: "numeric", month: "long",
  });

  const handleSave = () => {
    const newEntry: OutfitWearEntry = {
      id:          entry?.id ?? crypto.randomUUID(),
      date:        dateStr,
      outfitId:    selectedOutfit,
      garmentIds:  selectedOutfit ? [selectedOutfit] : [],
      eventTag:    selectedTag,
      note,
      previewImage: outfits.find((o) => o.id === selectedOutfit)?.preview_image,
    };
    addWearEntry(newEntry);
    onSaved();
    onClose();
  };

  const handleDelete = () => {
    if (entry) deleteWearEntry(entry.id);
    onSaved();
    onClose();
  };


  return (
    <div className="bottom-sheet-overlay" onClick={onClose}>
      <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
        {/* Handle */}
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-5" />

        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1"
               style={{ color: "rgba(255,255,255,0.4)" }}>
              Registro de outfit
            </p>
            <h2 className="text-lg font-bold text-white capitalize">{dateLabel}</h2>
          </div>
          <button onClick={onClose} className="btn-tap p-2">
            <X size={20} style={{ color: "rgba(255,255,255,0.5)" }} />
          </button>
        </div>

        {/* Repetition warning */}
        {repetitionInfo?.repeated && (
          <div
            className="flex items-start gap-3 p-3 rounded-2xl mb-4 animate-fade-in"
            style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)" }}
          >
            <AlertTriangle size={16} style={{ color: "#f59e0b", flexShrink: 0, marginTop: 1 }} />
            <p className="text-xs" style={{ color: "rgba(245,158,11,0.9)" }}>
              ⚠️ Usaste este outfit hace{" "}
              <strong>{repetitionInfo.daysAgo} día{repetitionInfo.daysAgo !== 1 ? "s" : ""}</strong>.
              {repetitionInfo.entry?.eventTag === "reunión" || repetitionInfo.entry?.eventTag === "trabajo"
                ? " Cuidado si tienes la misma persona en la reunión."
                : ""}
            </p>
          </div>
        )}

        {/* Outfit selector */}
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-wider mb-3"
             style={{ color: "rgba(255,255,255,0.4)" }}>
            Outfit usado
          </p>
          {outfits.length === 0 ? (
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
              No tienes outfits guardados aún. Crea uno en el Probador.
            </p>
          ) : (
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {/* None option */}
              <button
                onClick={() => setSelectedOutfit(null)}
                className="btn-tap flex-shrink-0 flex flex-col items-center gap-1"
              >
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{
                    background: selectedOutfit === null ? "rgba(102,126,234,0.25)" : "rgba(255,255,255,0.05)",
                    border: `1px solid ${selectedOutfit === null ? "rgba(102,126,234,0.6)" : "rgba(255,255,255,0.08)"}`,
                  }}
                >
                  <Shirt size={24} style={{ color: "rgba(255,255,255,0.35)" }} />
                </div>
                <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>Sin outfit</span>
              </button>

              {outfits.map((o) => (
                <button
                  key={o.id}
                  onClick={() => setSelectedOutfit(o.id)}
                  className="btn-tap flex-shrink-0 flex flex-col items-center gap-1"
                >
                  <div
                    className="w-16 h-16 rounded-2xl overflow-hidden"
                    style={{
                      border: `2px solid ${selectedOutfit === o.id ? "#667eea" : "rgba(255,255,255,0.08)"}`,
                      boxShadow: selectedOutfit === o.id ? "0 0 0 3px rgba(102,126,234,0.25)" : "none",
                    }}
                  >
                    <img src={o.preview_image} alt={o.name}
                         className="w-full h-full object-cover" />
                  </div>
                  <span className="text-[10px] max-w-[64px] truncate"
                        style={{ color: selectedOutfit === o.id ? "#a5b4fc" : "rgba(255,255,255,0.35)" }}>
                    {o.name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Event tag selector */}
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-wider mb-3"
             style={{ color: "rgba(255,255,255,0.4)" }}>
            Tipo de evento
          </p>
          <div className="grid grid-cols-4 gap-2">
            {EVENT_TAGS.map((t) => (
              <button
                key={t.value}
                onClick={() => setSelectedTag(t.value)}
                className="btn-tap flex flex-col items-center gap-1.5 py-2.5 px-1 rounded-2xl"
                style={{
                  background: selectedTag === t.value ? `${t.color}22` : "rgba(255,255,255,0.04)",
                  border: `1px solid ${selectedTag === t.value ? t.color + "88" : "rgba(255,255,255,0.08)"}`,
                }}
              >
                <span className="text-lg">{t.emoji}</span>
                <span className="text-[10px] font-medium"
                      style={{ color: selectedTag === t.value ? t.color : "rgba(255,255,255,0.45)" }}>
                  {t.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Note */}
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wider mb-2"
             style={{ color: "rgba(255,255,255,0.4)" }}>
            Nota (opcional)
          </p>
          <textarea
            className="note-input"
            rows={2}
            placeholder="Ej: Reunión con cliente Acme Corp, quedé muy bien..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={200}
          />
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          {entry && (
            <button
              onClick={handleDelete}
              className="btn-tap px-4 py-3.5 rounded-2xl"
              style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)" }}
            >
              <X size={18} style={{ color: "#f87171" }} />
            </button>
          )}
          <button
            onClick={handleSave}
            className="btn-tap flex-1 py-3.5 rounded-2xl font-semibold text-sm text-white"
            style={{
              background: "linear-gradient(135deg,#667eea,#764ba2)",
              boxShadow: "0 6px 18px rgba(102,126,234,0.4)",
            }}
          >
            {entry ? "Actualizar registro" : "Guardar en calendario"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Calendar Component ──────────────────────────────────────────────────

export const OutfitCalendar: React.FC = () => {
  const today    = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [entries, setEntries] = useState<OutfitWearEntry[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [outfits, setOutfits] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<OutfitWearEntry | null>(null);

  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;

  const loadData = useCallback(async () => {
    const monthEntries = getEntriesForMonth(year, month);
    setEntries(monthEntries);
    const savedOutfits = await getOutfits();
    setOutfits(savedOutfits);
  }, [year, month]);

  useIonViewWillEnter(() => { loadData(); });
  useEffect(() => { loadData(); }, [loadData]);

  // ── Calendar math ─────────────────────────────────────────────────────────

  const firstDay   = new Date(year, month, 1).getDay();   // 0=Sun
  const daysInMonth= new Date(year, month + 1, 0).getDate();
  const entryMap   = Object.fromEntries(entries.map((e) => [e.date, e]));

  const prevMonth = () => {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); }
    else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear((y) => y + 1); setMonth(0); }
    else setMonth((m) => m + 1);
  };

  const handleDayPress = (day: number) => {
    const dateStr = `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    setSelectedDate(dateStr);
    setSelectedEntry(entryMap[dateStr] ?? null);
  };

  // ── Stats for current month ───────────────────────────────────────────────

  const tagCounts = entries.reduce((acc, e) => {
    acc[e.eventTag] = (acc[e.eventTag] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topTag = Object.entries(tagCounts).sort((a,b)=>b[1]-a[1])[0];
  const daysLogged = entries.length;
  const streak = (() => {
    let s = 0;
    const d = new Date(today);
    while (true) {
      const ds = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
      if (!entryMap[ds]) break;
      s++; d.setDate(d.getDate()-1);
    }
    return s;
  })();

  return (
    <IonPage>
      <style>{STYLES}</style>

      <IonHeader className="ion-no-border">
        <IonToolbar style={{ "--background":"#0f0c29","--border-width":"0" } as React.CSSProperties}>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/dashboard"
              style={{ "--color":"rgba(255,255,255,0.7)" } as React.CSSProperties} />
          </IonButtons>
          <div className="flex items-center gap-2 pl-1">
            <Calendar size={17} style={{ color:"#a5b4fc" }} />
            <span className="text-base font-bold text-white">Calendario de Outfits</span>
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent style={{ "--background":"#0f0c29" } as React.CSSProperties}>
        <div className="min-h-full pb-16"
             style={{ background:"linear-gradient(160deg,#0f0c29 0%,#302b63 60%,#24243e 100%)" }}>

          <div className="px-4 pt-4">

            {/* ── Month navigator ── */}
            <div className="flex items-center justify-between mb-5 animate-fade-up">
              <button onClick={prevMonth} className="btn-tap w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)" }}>
                <ChevronLeft size={20} style={{ color:"rgba(255,255,255,0.7)" }} />
              </button>
              <div className="text-center">
                <h2 className="text-lg font-bold text-white">
                  {MONTHS_ES[month]} {year}
                </h2>
                <p className="text-xs" style={{ color:"rgba(255,255,255,0.4)" }}>
                  {daysLogged} día{daysLogged !== 1 ? "s" : ""} registrado{daysLogged !== 1 ? "s" : ""}
                </p>
              </div>
              <button onClick={nextMonth} className="btn-tap w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)" }}>
                <ChevronRight size={20} style={{ color:"rgba(255,255,255,0.7)" }} />
              </button>
            </div>

            {/* ── Stats strip ── */}
            <div className="grid grid-cols-3 gap-2 mb-5 animate-fade-up" style={{ animationDelay:"0.05s" }}>
              {[
                { label:"Registros", value: daysLogged, icon:"📅" },
                { label:"Racha", value: `${streak}d`, icon:"🔥" },
                { label:"Top evento", value: topTag ? TAG_MAP[topTag[0]]?.emoji ?? "—" : "—", icon:"🏷️" },
              ].map((s) => (
                <div key={s.label} className="flex flex-col items-center py-3 rounded-2xl"
                     style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.07)" }}>
                  <span className="text-lg font-bold text-white">{s.value}</span>
                  <span className="text-[10px] mt-0.5" style={{ color:"rgba(255,255,255,0.4)" }}>{s.label}</span>
                </div>
              ))}
            </div>

            {/* ── Day-of-week headers ── */}
            <div className="grid grid-cols-7 mb-1 animate-fade-up" style={{ animationDelay:"0.08s" }}>
              {DAYS_ES.map((d) => (
                <div key={d} className="text-center py-1">
                  <span className="text-[10px] font-semibold"
                        style={{ color:"rgba(255,255,255,0.3)" }}>{d}</span>
                </div>
              ))}
            </div>

            {/* ── Heatmap grid ── */}
            <div className="grid grid-cols-7 gap-1.5 animate-fade-up" style={{ animationDelay:"0.1s" }}>
              {/* Empty cells before month start */}
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}

              {/* Day cells */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day     = i + 1;
                const dateStr = `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
                const entry   = entryMap[dateStr];
                const isToday = dateStr === todayStr;
                const isFuture= dateStr > todayStr;

                return (
                  <button
                    key={day}
                    onClick={() => !isFuture && handleDayPress(day)}
                    disabled={isFuture}
                    className="day-cell aspect-square rounded-xl flex flex-col items-center justify-center relative"
                    style={{
                      background: heatColor(!!entry, entry?.eventTag),
                      border: `1.5px solid ${isToday ? "#667eea" : heatBorder(!!entry, entry?.eventTag)}`,
                      boxShadow: isToday ? "0 0 0 2px rgba(102,126,234,0.35)" : "none",
                      opacity: isFuture ? 0.3 : 1,
                    }}
                  >
                    <span className="text-xs font-bold"
                          style={{ color: entry ? "white" : isToday ? "#a5b4fc" : "rgba(255,255,255,0.45)" }}>
                      {day}
                    </span>
                    {entry && (
                      <span className="text-[8px] leading-none mt-0.5">
                        {TAG_MAP[entry.eventTag]?.emoji}
                      </span>
                    )}
                    {isToday && !entry && (
                      <div className="absolute bottom-1 w-1 h-1 rounded-full bg-indigo-400" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* ── Legend ── */}
            <div className="mt-5 animate-fade-up" style={{ animationDelay:"0.15s" }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2"
                 style={{ color:"rgba(255,255,255,0.3)" }}>Leyenda de eventos</p>
              <div className="flex flex-wrap gap-2">
                {EVENT_TAGS.map((t) => (
                  <div key={t.value} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full"
                       style={{ background:`${t.color}18`, border:`1px solid ${t.color}44` }}>
                    <span className="text-xs">{t.emoji}</span>
                    <span className="text-[11px] font-medium" style={{ color:t.color }}>{t.label}</span>
                    {tagCounts[t.value] && (
                      <span className="text-[10px] font-bold" style={{ color:`${t.color}cc` }}>
                        ×{tagCounts[t.value]}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* ── Recent entries list ── */}
            {entries.length > 0 && (
              <div className="mt-6 animate-fade-up" style={{ animationDelay:"0.18s" }}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-3"
                   style={{ color:"rgba(255,255,255,0.3)" }}>Últimos registros</p>
                <div className="space-y-2">
                  {[...entries]
                    .sort((a,b)=>new Date(b.date).getTime()-new Date(a.date).getTime())
                    .slice(0,5)
                    .map((e) => {
                      const tag = TAG_MAP[e.eventTag];
                      return (
                        <button
                          key={e.id}
                          onClick={() => { setSelectedDate(e.date); setSelectedEntry(e); }}
                          className="btn-tap w-full flex items-center gap-3 px-3 py-3 rounded-2xl"
                          style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.07)" }}
                        >
                          {e.previewImage ? (
                            <img src={e.previewImage} alt=""
                                 className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                                 style={{ background:`${tag.color}22` }}>
                              <span className="text-lg">{tag.emoji}</span>
                            </div>
                          )}
                          <div className="flex-1 text-left min-w-0">
                            <p className="text-sm font-semibold text-white truncate">
                              {new Date(e.date+"T12:00:00").toLocaleDateString("es-CO",{weekday:"short",day:"numeric",month:"short"})}
                            </p>
                            <p className="text-xs truncate" style={{ color:"rgba(255,255,255,0.4)" }}>
                              {tag.emoji} {tag.label}{e.note ? ` · ${e.note}` : ""}
                            </p>
                          </div>
                          <ChevronRight size={16} style={{ color:"rgba(255,255,255,0.25)", flexShrink:0 }} />
                        </button>
                      );
                    })}
                </div>
              </div>
            )}

            {/* ── Add today button ── */}
            {!entryMap[todayStr] && (
              <button
                onClick={() => handleDayPress(today.getDate())}
                className="btn-tap w-full mt-6 py-4 rounded-2xl flex items-center justify-center gap-2 font-semibold text-sm text-white animate-fade-up"
                style={{
                  background:"linear-gradient(135deg,#667eea,#764ba2)",
                  boxShadow:"0 6px 20px rgba(102,126,234,0.4)",
                  animationDelay:"0.2s",
                }}
              >
                <Plus size={18} />
                Registrar outfit de hoy
              </button>
            )}
          </div>
        </div>

        {/* ── Day sheet modal ── */}
        {selectedDate && (
          <DaySheet
            dateStr={selectedDate}
            entry={selectedEntry}
            outfits={outfits}
            onClose={() => setSelectedDate(null)}
            onSaved={loadData}
          />
        )}
      </IonContent>
    </IonPage>
  );
};