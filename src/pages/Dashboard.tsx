import React, { useEffect, useState } from "react";
import { IonPage, IonContent, useIonRouter } from "@ionic/react";
import { Shirt, Camera, LayoutTemplate, ChevronRight, Sun, CalendarDays, ShoppingBag } from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return { text: "Buenos días", emoji: "☀️" };
  if (h < 18) return { text: "Buenas tardes", emoji: "🌤️" };
  return { text: "Buenas noches", emoji: "🌙" };
};

// ─── Animation CSS (inline, GPU-friendly) ────────────────────────────────────

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
  @keyframes pulse-ring {
    0%   { transform: scale(1);   opacity: 0.6; }
    100% { transform: scale(1.6); opacity: 0; }
  }
  .animate-fade-up   { animation: fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) both; }
  .animate-fade-in   { animation: fadeIn 0.4s ease both; }
  .delay-100 { animation-delay: 0.10s; }
  .delay-200 { animation-delay: 0.20s; }
  .delay-300 { animation-delay: 0.30s; }
  .delay-400 { animation-delay: 0.40s; }
  .delay-500 { animation-delay: 0.50s; }

  .card-tap {
    transition: transform 0.18s cubic-bezier(0.22,1,0.36,1),
                box-shadow 0.18s ease;
    -webkit-tap-highlight-color: transparent;
    will-change: transform;
  }
  .card-tap:active { transform: scale(0.97); box-shadow: none !important; }

  .shimmer-text {
    background: linear-gradient(
      90deg,
      #c084fc 0%, #f472b6 40%, #fb923c 60%, #c084fc 100%
    );
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: shimmer 3s linear infinite;
  }

  .hero-gradient {
    background: linear-gradient(135deg,
      #0f0c29 0%, #302b63 50%, #24243e 100%
    );
  }

  .card-gradient-1 { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
  .card-gradient-2 { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); }
  .card-gradient-3 { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
  .card-gradient-4 { background: linear-gradient(135deg, #f7971e 0%, #ffd200 100%); }
  .card-gradient-5 { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }
  .card-gradient-6 { background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); }

  .status-dot::before {
    content: '';
    display: block;
    width: 8px; height: 8px;
    border-radius: 50%;
    background: #4ade80;
    animation: pulse-ring 1.5s ease-out infinite;
    position: absolute; top: 0; left: 0;
  }
  .status-dot { position: relative; width: 8px; height: 8px; }
  .status-dot-core {
    width: 8px; height: 8px; border-radius: 50%;
    background: #4ade80;
    position: absolute; top: 0; left: 0;
  }
`;

// ─── Nav Card Component ───────────────────────────────────────────────────────

interface NavCardProps {
  label: string;
  subtitle: string;
  icon: React.ReactNode;
  gradientClass: string;
  onClick: () => void;
  delay: string;
  badge?: string;
}

const NavCard: React.FC<NavCardProps> = ({
  label, subtitle, icon, gradientClass, onClick, delay, badge,
}) => (
  <button
    onClick={onClick}
    className={`card-tap w-full animate-fade-up ${delay}`}
    style={{ WebkitAppearance: "none" }}
  >
    <div
      className="relative overflow-hidden rounded-2xl p-5 flex items-center"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.10)",
        backdropFilter: "blur(12px)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)",
      }}
    >
      {/* Accent blob */}
      <div
        className={`absolute -right-8 -top-8 w-32 h-32 rounded-full opacity-20 blur-xl ${gradientClass}`}
      />

      {/* Icon */}
      <div
        className={`${gradientClass} w-14 h-14 rounded-xl flex items-center justify-center mr-4 flex-shrink-0 shadow-lg`}
        style={{ boxShadow: "0 4px 15px rgba(0,0,0,0.3)" }}
      >
        {icon}
      </div>

      {/* Text */}
      <div className="text-left flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-white">{label}</h2>
          {badge && (
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: "rgba(251,146,60,0.25)", color: "#fb923c", border: "1px solid rgba(251,146,60,0.3)" }}
            >
              {badge}
            </span>
          )}
        </div>
        <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>
          {subtitle}
        </p>
      </div>

      {/* Arrow */}
      <ChevronRight
        size={20}
        style={{ color: "rgba(255,255,255,0.3)", flexShrink: 0 }}
      />
    </div>
  </button>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export const Dashboard: React.FC = () => {
  const router = useIonRouter();
  const greeting = getGreeting();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Tiny delay so Ionic page transition completes before animations fire
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <IonPage>
      <style>{STYLES}</style>

      <IonContent
        style={{ "--background": "#0f0c29" } as React.CSSProperties}
      >
        <div
          className="hero-gradient flex flex-col"
          style={{ minHeight: "100%" }}
        >
          {/* ── Header ── */}
          <div className="flex-shrink-0 pt-14 px-6 pb-6">
            {/* Status bar area */}
            <div
              className={`flex items-center gap-2 mb-6 animate-fade-in ${visible ? "" : "opacity-0"}`}
              style={{ animationDelay: "0s" }}
            >
              <div className="status-dot">
                <div className="status-dot-core" />
              </div>
              <span className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>
                ClosetSync — activo
              </span>
            </div>

            {/* Greeting */}
            <div className={`animate-fade-up ${visible ? "" : "opacity-0"}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">{greeting.emoji}</span>
                <span className="text-base font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>
                  {greeting.text}
                </span>
              </div>
              <h1 className="text-4xl font-bold leading-tight tracking-tight text-white">
                Tu{" "}
                <span className="shimmer-text">closet</span>
                <br />
                digital
              </h1>
              <p className="mt-2 text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
                ¿Qué quieres ponerte hoy?
              </p>
            </div>
          </div>

          {/* ── Navigation Cards ── */}
          <div className="flex-1 px-6 pb-10 flex flex-col gap-3">
            {visible && (
              <>
                <NavCard
                  label="Mi Armario"
                  subtitle="Explora y organiza tus prendas"
                  icon={<Shirt size={26} color="white" />}
                  gradientClass="card-gradient-1"
                  onClick={() => router.push("/closet")}
                  delay="delay-300"
                />
                <NavCard
                  label="Estudio"
                  subtitle="Escanea y añade ropa nueva"
                  icon={<Camera size={26} color="white" />}
                  gradientClass="card-gradient-2"
                  onClick={() => router.push("/studio")}
                  delay="delay-400"
                  badge="IA"
                />
                <NavCard
                  label="Probador"
                  subtitle="Combina y crea outfits"
                  icon={<LayoutTemplate size={26} color="white" />}
                  gradientClass="card-gradient-3"
                  onClick={() => router.push("/fitting-room")}
                  delay="delay-500"
                />
                <NavCard
                  label="Outfit del día"
                  subtitle="Tu look perfecto generado por IA"
                  icon={<Sun size={26} color="white" />}
                  gradientClass="card-gradient-4"
                  onClick={() => router.push("/daily-outfit")}
                  delay="delay-500"
                  badge="Nuevo"
                />
                <NavCard
                  label="Calendario"
                  subtitle="Historial de outfits por día"
                  icon={<CalendarDays size={26} color="white" />}
                  gradientClass="card-gradient-5"
                  onClick={() => router.push("/outfit-calendar")}
                  delay="delay-500"
                />
                <NavCard
                  label="Asesor de Estilo"
                  subtitle="Qué comprar según tu cuerpo"
                  icon={<ShoppingBag size={26} color="white" />}
                  gradientClass="card-gradient-6"
                  onClick={() => router.push("/style-advisor")}
                  delay="delay-500"
                  badge="IA"
                />
              </>
            )}
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};