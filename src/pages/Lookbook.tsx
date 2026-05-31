import React, { useState } from "react";
import {
  IonPage, IonContent, IonHeader, IonToolbar,
  IonButtons, IonBackButton, useIonViewWillEnter,
} from "@ionic/react";
import { deleteOutfit, getOutfits } from "../database/dbService";
import { Trash2, Sparkles, Calendar, BookOpen } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface OutfitItem {
  id: string | number;
  name: string;
  preview_image: string;
  created_at: string;
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const STYLES = `
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes scaleOut {
    0%   { opacity: 1; transform: scale(1); }
    100% { opacity: 0; transform: scale(0.82); }
  }

  .animate-fade-up { animation: fadeUp 0.42s cubic-bezier(0.22,1,0.36,1) both; }
  .animate-fade-in { animation: fadeIn 0.35s ease both; }

  /* Staggered entrance for grid items */
  .outfit-card:nth-child(1)  { animation-delay: 0.04s; }
  .outfit-card:nth-child(2)  { animation-delay: 0.08s; }
  .outfit-card:nth-child(3)  { animation-delay: 0.12s; }
  .outfit-card:nth-child(4)  { animation-delay: 0.16s; }
  .outfit-card:nth-child(5)  { animation-delay: 0.20s; }
  .outfit-card:nth-child(6)  { animation-delay: 0.24s; }
  .outfit-card:nth-child(n+7){ animation-delay: 0.28s; }

  .removing { animation: scaleOut 0.28s cubic-bezier(0.22,1,0.36,1) forwards; }

  .card-tap {
    -webkit-tap-highlight-color: transparent;
    transition: transform 0.18s cubic-bezier(0.22,1,0.36,1);
    will-change: transform;
  }
  .card-tap:active { transform: scale(0.97); }

  .delete-btn {
    -webkit-tap-highlight-color: transparent;
    transition: opacity 0.15s ease, transform 0.15s cubic-bezier(0.22,1,0.36,1);
  }
  .delete-btn:active { transform: scale(0.84); }

  .scrollbar-hide::-webkit-scrollbar { display: none; }
  .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }

  ion-content { --background: #0f0c29; }
`;

// ─── Outfit Card ──────────────────────────────────────────────────────────────

const OutfitCard: React.FC<{
  outfit: OutfitItem;
  onDelete: (e: React.MouseEvent, outfit: OutfitItem) => void;
  isRemoving: boolean;
}> = ({ outfit, onDelete, isRemoving }) => {
  const date = new Date(outfit.created_at).toLocaleDateString("es-CO", {
    month: "short", day: "numeric",
  });

  return (
    <div
      className={`outfit-card animate-fade-up card-tap ${isRemoving ? "removing" : ""} flex flex-col`}
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "20px",
        overflow: "hidden",
      }}
    >
      {/* Preview image */}
      <div className="relative" style={{ aspectRatio: "3/4" }}>
        <img
          src={outfit.preview_image}
          alt={outfit.name}
          className="w-full h-full object-cover"
          loading="lazy"
          style={{ display: "block" }}
        />

        {/* Gradient overlay at bottom */}
        <div
          className="absolute inset-x-0 bottom-0 h-16"
          style={{ background: "linear-gradient(to top, rgba(15,12,41,0.85), transparent)" }}
        />

        {/* Delete button */}
        <button
          onClick={(e) => onDelete(e, outfit)}
          className="delete-btn absolute top-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center"
          style={{
            background: "rgba(15,12,41,0.75)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,0.12)",
          }}
        >
          <Trash2 size={14} style={{ color: "#f87171" }} />
        </button>

        {/* Date badge on image */}
        <div
          className="absolute bottom-2.5 left-2.5 flex items-center gap-1 px-2 py-1 rounded-full"
          style={{ background: "rgba(15,12,41,0.65)", backdropFilter: "blur(6px)" }}
        >
          <Calendar size={10} style={{ color: "rgba(255,255,255,0.5)" }} />
          <span className="text-[10px] font-medium" style={{ color: "rgba(255,255,255,0.65)" }}>
            {date}
          </span>
        </div>
      </div>

      {/* Name footer */}
      <div className="px-3 py-2.5">
        <p className="text-xs font-semibold text-white truncate">{outfit.name}</p>
      </div>
    </div>
  );
};

// ─── Empty State ──────────────────────────────────────────────────────────────

const EmptyState: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-center px-8 animate-fade-up">
    <div
      className="w-24 h-24 rounded-3xl flex items-center justify-center mb-6"
      style={{
        background: "rgba(102,126,234,0.1)",
        border: "1px solid rgba(102,126,234,0.15)",
      }}
    >
      <BookOpen size={40} style={{ color: "rgba(165,180,252,0.55)" }} />
    </div>
    <h2 className="text-xl font-bold text-white mb-2">Tu Lookbook está vacío</h2>
    <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>
      Ve al probador, combina tus prendas y guarda tu primer outfit para verlo aquí
    </p>
    <div
      className="mt-6 px-5 py-2.5 rounded-full text-xs font-semibold flex items-center gap-2"
      style={{
        background: "rgba(102,126,234,0.15)",
        border: "1px solid rgba(102,126,234,0.25)",
        color: "#a5b4fc",
      }}
    >
      <Sparkles size={13} />
      Crea tu primer look
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export const Lookbook: React.FC = () => {
  const [outfits, setOutfits] = useState<OutfitItem[]>([]);
  const [removingId, setRemovingId] = useState<string | number | null>(null);
  const [gridKey, setGridKey] = useState(0);

  useIonViewWillEnter(() => {
    (async () => {
      try {
        const data = await getOutfits();
        setOutfits(data);
        setGridKey((k) => k + 1);
      } catch (e) {
        console.error("Error cargando outfits:", e);
      }
    })();
  });

  const handleExecuteDelete = async (e: React.MouseEvent, outfit: OutfitItem) => {
    e.stopPropagation();
    if (!window.confirm(`¿Eliminar el look "${outfit.name}"?`)) return;

    setRemovingId(outfit.id);
    await new Promise((r) => setTimeout(r, 260));
    try {
      await deleteOutfit(outfit.id);
      setOutfits((prev) => prev.filter((o) => o.id !== outfit.id));
    } catch {
      console.error("Error eliminando outfit");
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <IonPage>
      <style>{STYLES}</style>

      <IonHeader className="ion-no-border">
        <IonToolbar
          style={{
            "--background": "#0f0c29",
            "--border-width": "0",
          } as React.CSSProperties}
        >
          <IonButtons slot="start">
            <IonBackButton
              defaultHref="/dashboard"
              style={{ "--color": "rgba(255,255,255,0.7)" } as React.CSSProperties}
            />
          </IonButtons>
          <div className="flex items-center gap-2 pl-1">
            <BookOpen size={17} style={{ color: "#a5b4fc" }} />
            <span className="text-base font-bold text-white">Mis Looks</span>
          </div>
          {outfits.length > 0 && (
            <div slot="end" className="pr-4">
              <span
                className="text-xs font-bold px-2.5 py-1 rounded-full"
                style={{
                  background: "rgba(102,126,234,0.2)",
                  color: "#a5b4fc",
                  border: "1px solid rgba(102,126,234,0.3)",
                }}
              >
                {outfits.length} {outfits.length === 1 ? "look" : "looks"}
              </span>
            </div>
          )}
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <div
          className="min-h-full"
          style={{
            background: "linear-gradient(160deg, #0f0c29 0%, #302b63 60%, #24243e 100%)",
          }}
        >
          {outfits.length === 0 ? (
            <div style={{ height: "calc(100vh - 56px)" }}>
              <EmptyState />
            </div>
          ) : (
            <div className="p-4 pb-12">
              {/* Header label */}
              <div className="flex items-center gap-2 mb-4 animate-fade-in">
                <Sparkles size={13} style={{ color: "rgba(251,146,60,0.7)" }} />
                <span className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.35)" }}>
                  Tus outfits guardados
                </span>
              </div>

              {/* Grid */}
              <div key={gridKey} className="grid grid-cols-2 gap-3">
                {outfits.map((outfit) => (
                  <OutfitCard
                    key={outfit.id}
                    outfit={outfit}
                    onDelete={handleExecuteDelete}
                    isRemoving={removingId === outfit.id}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
};