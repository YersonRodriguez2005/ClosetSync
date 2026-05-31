import React, { useState, useCallback } from "react";
import {
  IonPage, IonContent, IonHeader, IonToolbar,
  IonButtons, IonBackButton, useIonRouter, useIonViewWillEnter,
} from "@ionic/react";
import { Capacitor } from "@capacitor/core";
import {
  Sparkles, Bell, BellOff, RefreshCw, ChevronRight,
  Zap, Sun, Layers, Circle,
} from "lucide-react";
import {
  pickDailyOutfit, generateOutfitSuggestions,
  type OutfitSuggestion, type GarmentWithColor, type HarmonyType,
} from "../utils/colorEngine";
import {
  scheduleDailyOutfitNotification, cancelDailyOutfitNotification,
  isDailyNotificationEnabled, getNextNotificationTime,
} from "../services/notificationService";
import { getGarments } from "../database/dbService";

// ─── Styles ──────────────────────────────────────────────────────────────────

const STYLES = `
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes shimmer {
    0%   { background-position: -200% center; }
    100% { background-position:  200% center; }
  }
  @keyframes spin-slow {
    to { transform: rotate(360deg); }
  }
  @keyframes pulse-glow {
    0%, 100% { opacity: 0.5; transform: scale(1);   }
    50%       { opacity: 1;   transform: scale(1.08); }
  }
  @keyframes scoreBar {
    from { width: 0%; }
    to   { width: var(--target-width); }
  }

  .animate-fade-up  { animation: fadeUp  0.45s cubic-bezier(0.22,1,0.36,1) both; }
  .animate-fade-in  { animation: fadeIn  0.35s ease both; }
  .delay-1 { animation-delay: 0.1s; }
  .delay-2 { animation-delay: 0.2s; }
  .delay-3 { animation-delay: 0.3s; }
  .delay-4 { animation-delay: 0.4s; }

  .btn-tap {
    -webkit-tap-highlight-color: transparent;
    transition: transform 0.15s cubic-bezier(0.22,1,0.36,1), opacity 0.15s ease;
    will-change: transform;
  }
  .btn-tap:active { transform: scale(0.95); opacity: 0.8; }

  .garment-card-daily {
    -webkit-tap-highlight-color: transparent;
    transition: transform 0.2s cubic-bezier(0.22,1,0.36,1);
    will-change: transform;
  }
  .garment-card-daily:active { transform: scale(0.96); }

  .shimmer-badge {
    background: linear-gradient(
      90deg, #c084fc 0%, #f472b6 40%, #fb923c 60%, #c084fc 100%
    );
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: shimmer 3s linear infinite;
  }

  .score-bar-fill {
    animation: scoreBar 0.9s cubic-bezier(0.22,1,0.36,1) 0.3s both;
  }

  .toggle-track {
    transition: background 0.25s ease;
  }
  .toggle-thumb {
    transition: transform 0.25s cubic-bezier(0.22,1,0.36,1);
  }

  .scrollbar-hide::-webkit-scrollbar { display: none; }
  .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
`;

// ─── Harmony icons & colors ───────────────────────────────────────────────────

const HARMONY_UI: Record<HarmonyType, { icon: React.ReactNode; color: string; bg: string }> = {
  complementary: { icon: <Zap     size={16} />, color: "#f59e0b", bg: "rgba(245,158,11,0.15)" },
  analogous:     { icon: <Sun     size={16} />, color: "#34d399", bg: "rgba(52,211,153,0.15)"  },
  triadic:       { icon: <Layers  size={16} />, color: "#a78bfa", bg: "rgba(167,139,250,0.15)" },
  "split-comp":  { icon: <Sparkles size={16} />, color: "#f472b6", bg: "rgba(244,114,182,0.15)"},
  neutral:       { icon: <Circle  size={16} />, color: "#94a3b8", bg: "rgba(148,163,184,0.15)" },
};

// ─── Color Palette Strip ──────────────────────────────────────────────────────

const PaletteStrip: React.FC<{ colors: string[] }> = ({ colors }) => (
  <div className="flex gap-1.5 items-center">
    {colors.map((c, i) => (
      <div key={i} className="flex flex-col items-center gap-1">
        <div
          className="w-8 h-8 rounded-xl"
          style={{
            backgroundColor: c,
            boxShadow: `0 0 0 2px rgba(255,255,255,0.1), 0 4px 10px ${c}55`,
          }}
        />
        <span className="text-[8px] font-mono" style={{ color: "rgba(255,255,255,0.3)" }}>
          {c.toUpperCase()}
        </span>
      </div>
    ))}
  </div>
);

// ─── Score Bar ────────────────────────────────────────────────────────────────

const ScoreBar: React.FC<{ score: number }> = ({ score }) => (
  <div className="flex items-center gap-3">
    <div
      className="flex-1 h-2 rounded-full overflow-hidden"
      style={{ background: "rgba(255,255,255,0.08)" }}
    >
      <div
        className="score-bar-fill h-full rounded-full"
        style={{
          "--target-width": `${score}%`,
          width: `${score}%`,
          background: score >= 90
            ? "linear-gradient(90deg,#667eea,#a78bfa)"
            : score >= 80
            ? "linear-gradient(90deg,#34d399,#667eea)"
            : "linear-gradient(90deg,#f59e0b,#34d399)",
        } as React.CSSProperties}
      />
    </div>
    <span className="text-sm font-bold text-white w-8 text-right">{score}</span>
  </div>
);

// ─── Garment Card ─────────────────────────────────────────────────────────────

const GarmentCard: React.FC<{ garment: GarmentWithColor; index: number }> = ({ garment, index }) => (
  <div
    className={`garment-card-daily animate-fade-up flex-shrink-0`}
    style={{
      animationDelay: `${0.1 + index * 0.08}s`,
      width: "120px",
    }}
  >
    <div
      className="rounded-2xl overflow-hidden mb-2"
      style={{
        background: "#f1f2f6",
        backgroundImage: `
          linear-gradient(45deg,#e8eaed 25%,transparent 25%),
          linear-gradient(-45deg,#e8eaed 25%,transparent 25%),
          linear-gradient(45deg,transparent 75%,#e8eaed 75%),
          linear-gradient(-45deg,transparent 75%,#e8eaed 75%)
        `,
        backgroundSize: "12px 12px",
        backgroundPosition: "0 0,0 6px,6px -6px,-6px 0",
        height: "120px",
        border: "1px solid rgba(255,255,255,0.1)",
      }}
    >
      <img
        src={Capacitor.convertFileSrc(garment.image_uri)}
        alt={garment.category_name}
        className="w-full h-full object-contain p-2"
        style={{ filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.3))" }}
      />
    </div>
    <div className="flex items-center gap-1.5">
      <div
        className="w-3 h-3 rounded-full flex-shrink-0"
        style={{
          backgroundColor: garment.color_tag,
          boxShadow: `0 0 6px ${garment.color_tag}88`,
        }}
      />
      <span className="text-[11px] font-medium truncate" style={{ color: "rgba(255,255,255,0.55)" }}>
        {garment.category_name}
      </span>
    </div>
  </div>
);

// ─── Suggestion Card ──────────────────────────────────────────────────────────

const SuggestionCard: React.FC<{
  suggestion: OutfitSuggestion;
  index: number;
  onTryOn: (suggestion: OutfitSuggestion) => void;
  isTransitioning: boolean;
}> = ({ suggestion, index, onTryOn, isTransitioning }) => {
  const harmonyUi = HARMONY_UI[suggestion.harmony];

  return (
    <div
      className={`animate-fade-up`}
      style={{
        animationDelay: `${0.05 * index}s`,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "20px",
        padding: "16px",
        marginBottom: "12px",
      }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: harmonyUi.bg, color: harmonyUi.color }}
          >
            {harmonyUi.icon}
          </div>
          <div>
            <p className="text-xs font-bold text-white">{suggestion.harmonyLabel}</p>
            <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>
              {suggestion.description}
            </p>
          </div>
        </div>
        <button
          onClick={() => onTryOn(suggestion)}
          disabled={isTransitioning}
          className="btn-tap flex items-center gap-1 px-3 py-1.5 rounded-full"
          style={{
            background: "rgba(102,126,234,0.2)",
            border: "1px solid rgba(102,126,234,0.3)",
            opacity: isTransitioning ? 0.5 : 1,
            transition: "opacity 0.2s ease",
          }}
        >
          <span className="text-[11px] font-semibold" style={{ color: "#a5b4fc" }}>Probar</span>
          <ChevronRight size={12} style={{ color: "#a5b4fc" }} />
        </button>
      </div>

      {/* Score */}
      <div className="mb-3">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.35)" }}>
            Compatibilidad
          </span>
        </div>
        <ScoreBar score={suggestion.score} />
      </div>

      {/* Palette */}
      <PaletteStrip colors={suggestion.paletteColors} />

      {/* Garment mini-row */}
      <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-hide">
        {suggestion.garments.map((g) => (
          <div key={g.id} className="flex-shrink-0 flex flex-col items-center gap-1">
            <div
              className="w-12 h-12 rounded-xl overflow-hidden"
              style={{
                background: "#f1f2f6",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <img
                src={Capacitor.convertFileSrc(g.image_uri)}
                alt={g.category_name}
                className="w-full h-full object-contain p-1"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Notification Toggle ──────────────────────────────────────────────────────

const NotificationToggle: React.FC = () => {
  const [enabled, setEnabled] = useState(isDailyNotificationEnabled);
  const [loading, setLoading] = useState(false);
  const nextTime = getNextNotificationTime();

  const toggle = async () => {
    setLoading(true);
    if (enabled) {
      await cancelDailyOutfitNotification();
      setEnabled(false);
    } else {
      const ok = await scheduleDailyOutfitNotification();
      setEnabled(ok);
    }
    setLoading(false);
  };

  return (
    <div
      className="flex items-center justify-between px-4 py-3.5 rounded-2xl animate-fade-up delay-4"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{
            background: enabled ? "rgba(102,126,234,0.2)" : "rgba(255,255,255,0.06)",
            border: enabled ? "1px solid rgba(102,126,234,0.3)" : "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {enabled
            ? <Bell size={17} style={{ color: "#a5b4fc" }} />
            : <BellOff size={17} style={{ color: "rgba(255,255,255,0.35)" }} />}
        </div>
        <div>
          <p className="text-sm font-semibold text-white">Alerta diaria</p>
          <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>
            {enabled ? `Próxima: ${nextTime}` : "Desactivada"}
          </p>
        </div>
      </div>

      {/* Toggle */}
      <button onClick={toggle} disabled={loading} className="btn-tap relative">
        <div
          className="toggle-track w-12 h-6 rounded-full"
          style={{ background: enabled ? "#667eea" : "rgba(255,255,255,0.12)" }}
        >
          <div
            className="toggle-thumb absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm"
            style={{ transform: enabled ? "translateX(26px)" : "translateX(2px)" }}
          />
        </div>
      </button>
    </div>
  );
};

// ─── Empty State ──────────────────────────────────────────────────────────────

const EmptyState: React.FC<{ onGoToStudio: () => void }> = ({ onGoToStudio }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center px-6 animate-fade-up">
    <div
      className="w-24 h-24 rounded-3xl flex items-center justify-center mb-6"
      style={{ background: "rgba(102,126,234,0.1)", border: "1px solid rgba(102,126,234,0.15)" }}
    >
      <Sparkles size={40} style={{ color: "rgba(165,180,252,0.55)" }} />
    </div>
    <h3 className="text-lg font-bold text-white mb-2">Armario insuficiente</h3>
    <p className="text-sm mb-6 leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>
      Necesitas al menos una parte superior y una inferior para generar outfits automáticos
    </p>
    <button
      onClick={onGoToStudio}
      className="btn-tap px-6 py-3 rounded-2xl text-sm font-semibold text-white"
      style={{
        background: "linear-gradient(135deg,#667eea,#764ba2)",
        boxShadow: "0 6px 20px rgba(102,126,234,0.4)",
      }}
    >
      Ir al Estudio
    </button>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export const DailyOutfit: React.FC = () => {
  const router = useIonRouter();
  const [dailyPick, setDailyPick]     = useState<OutfitSuggestion | null>(null);
  const [suggestions, setSuggestions] = useState<OutfitSuggestion[]>([]);
  const [garments, setGarments]       = useState<GarmentWithColor[]>([]);
  const [loading, setLoading]         = useState(true);
  const [activeTab, setActiveTab]     = useState<"daily" | "all">("daily");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const raw = await getGarments(null) as GarmentWithColor[];
      setGarments(raw);
      const daily = pickDailyOutfit(raw);
      const all   = generateOutfitSuggestions(raw, 12);
      setDailyPick(daily);
      setSuggestions(all);
    } finally {
      setLoading(false);
    }
  }, []);

  useIonViewWillEnter(() => { loadData(); });

  const [transitioning, setTransitioning] = useState(false);

  const handleTryOn = (suggestion: OutfitSuggestion) => {
    setTransitioning(true);
    // Store garment IDs — FittingRoom reads them from sessionStorage on enter
    sessionStorage.setItem(
      "fitting_preload",
      JSON.stringify(suggestion.garments.map((g) => g.id))
    );
    // Small delay so the button feedback is visible before navigation
    setTimeout(() => {
      setTransitioning(false);
      router.push("/fitting-room");
    }, 280);
  };

  const todayStr = new Date().toLocaleDateString("es-CO", {
    weekday: "long", day: "numeric", month: "long",
  });

  return (
    <IonPage>
      <style>{STYLES}</style>

      <IonHeader className="ion-no-border">
        <IonToolbar
          style={{ "--background": "#0f0c29", "--border-width": "0" } as React.CSSProperties}
        >
          <IonButtons slot="start">
            <IonBackButton
              defaultHref="/dashboard"
              style={{ "--color": "rgba(255,255,255,0.7)" } as React.CSSProperties}
            />
          </IonButtons>
          <div className="flex items-center gap-2 pl-1">
            <Sparkles size={16} style={{ color: "#a5b4fc" }} />
            <span className="text-base font-bold text-white">Outfit del día</span>
          </div>
          {/* Refresh button */}
          <div slot="end" className="pr-3">
            <button onClick={loadData} className="btn-tap p-2">
              <RefreshCw size={18} style={{ color: "rgba(255,255,255,0.5)" }} />
            </button>
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent
        style={{ "--background": "#0f0c29" } as React.CSSProperties}
      >
        <div
          className="min-h-full pb-12"
          style={{ background: "linear-gradient(160deg,#0f0c29 0%,#302b63 60%,#24243e 100%)" }}
        >
          {loading ? (
            // ── Loading skeleton ──
            <div className="flex flex-col items-center justify-center" style={{ minHeight: "60vh" }}>
              <div className="relative flex items-center justify-center w-16 h-16 mb-4">
                <div
                  className="absolute w-16 h-16 rounded-full border-2"
                  style={{ borderColor: "rgba(102,126,234,0.15)", borderTopColor: "#667eea",
                           animation: "spin-slow 1s linear infinite" }}
                />
                <Sparkles size={22} style={{ color: "#a5b4fc" }} />
              </div>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
                Calculando armonías de color...
              </p>
            </div>
          ) : garments.length < 2 || !dailyPick ? (
            <EmptyState onGoToStudio={() => router.push("/studio")} />
          ) : (
            <div className="px-4 pt-4">

              {/* ── Date header ── */}
              <div className="animate-fade-up mb-5">
                <p className="text-xs font-semibold uppercase tracking-widest mb-1"
                   style={{ color: "rgba(255,255,255,0.35)" }}>
                  {todayStr}
                </p>
                <h1 className="text-2xl font-bold text-white leading-tight">
                  Tu look de{" "}
                  <span className="shimmer-badge">hoy</span>
                </h1>
              </div>

              {/* ── Tab switcher ── */}
              <div
                className="flex gap-1 p-1 rounded-2xl mb-5 animate-fade-up delay-1"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                {(["daily", "all"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className="btn-tap flex-1 py-2 rounded-xl text-sm font-semibold"
                    style={{
                      background: activeTab === tab
                        ? "linear-gradient(135deg,#667eea,#764ba2)"
                        : "transparent",
                      color: activeTab === tab ? "white" : "rgba(255,255,255,0.45)",
                      boxShadow: activeTab === tab ? "0 4px 12px rgba(102,126,234,0.35)" : "none",
                      transition: "all 0.2s ease",
                    }}
                  >
                    {tab === "daily" ? "🌅 Pick del día" : "✨ Todos los looks"}
                  </button>
                ))}
              </div>

              {/* ── DAILY TAB ── */}
              {activeTab === "daily" && dailyPick && (
                <div>
                  {/* Hero card */}
                  <div
                    className="rounded-3xl p-5 mb-4 animate-fade-up delay-2"
                    style={{
                      background: "linear-gradient(135deg,rgba(102,126,234,0.15),rgba(118,75,162,0.15))",
                      border: "1px solid rgba(102,126,234,0.2)",
                    }}
                  >
                    {/* Harmony badge */}
                    <div className="flex items-center gap-2 mb-4">
                      <div
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                        style={{
                          background: HARMONY_UI[dailyPick.harmony].bg,
                          border: `1px solid ${HARMONY_UI[dailyPick.harmony].color}44`,
                        }}
                      >
                        <span style={{ color: HARMONY_UI[dailyPick.harmony].color }}>
                          {HARMONY_UI[dailyPick.harmony].icon}
                        </span>
                        <span className="text-xs font-bold" style={{ color: HARMONY_UI[dailyPick.harmony].color }}>
                          {dailyPick.harmonyLabel}
                        </span>
                      </div>
                      <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                        {dailyPick.description}
                      </span>
                    </div>

                    {/* Garment strip */}
                    <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 mb-4">
                      {dailyPick.garments.map((g, i) => (
                        <GarmentCard key={g.id} garment={g} index={i} />
                      ))}
                    </div>

                    {/* Score */}
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-semibold uppercase tracking-wider"
                              style={{ color: "rgba(255,255,255,0.35)" }}>
                          Compatibilidad cromática
                        </span>
                        <span className="text-xs font-bold" style={{ color: "#a5b4fc" }}>
                          {dailyPick.score}/100
                        </span>
                      </div>
                      <ScoreBar score={dailyPick.score} />
                    </div>

                    {/* Color palette */}
                    <div className="mb-5">
                      <p className="text-xs font-semibold uppercase tracking-wider mb-2"
                         style={{ color: "rgba(255,255,255,0.35)" }}>
                        Paleta del outfit
                      </p>
                      <PaletteStrip colors={dailyPick.paletteColors} />
                    </div>

                    {/* CTA */}
                    <button
                      onClick={() => handleTryOn(dailyPick)}
                      disabled={transitioning}
                      className="btn-tap w-full py-3.5 rounded-2xl font-semibold text-white text-sm flex items-center justify-center gap-2"
                      style={{
                        background: transitioning
                          ? "rgba(102,126,234,0.5)"
                          : "linear-gradient(135deg,#667eea,#764ba2)",
                        boxShadow: "0 6px 20px rgba(102,126,234,0.4)",
                        transition: "background 0.2s ease",
                      }}
                    >
                      {transitioning ? (
                        <>
                          <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white"
                               style={{ animation: "spin-slow 0.7s linear infinite" }} />
                          Abriendo Probador...
                        </>
                      ) : (
                        <>
                          <Sparkles size={16} />
                          Probar en el Probador
                          <ChevronRight size={16} />
                        </>
                      )}
                    </button>
                  </div>

                  {/* Notification toggle */}
                  <NotificationToggle />
                </div>
              )}

              {/* ── ALL SUGGESTIONS TAB ── */}
              {activeTab === "all" && (
                <div>
                  <p className="text-xs mb-4" style={{ color: "rgba(255,255,255,0.4)" }}>
                    {suggestions.length} combinaciones encontradas • ordenadas por armonía cromática
                  </p>
                  {suggestions.map((s, i) => (
                    <SuggestionCard
                      key={i}
                      suggestion={s}
                      index={i}
                      onTryOn={handleTryOn}
                      isTransitioning={transitioning}
                    />
                  ))}
                  {suggestions.length === 0 && (
                    <EmptyState onGoToStudio={() => router.push("/studio")} />
                  )}
                </div>
              )}

            </div>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
};