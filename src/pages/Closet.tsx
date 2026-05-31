import React, { useState, useCallback } from "react";
import {
  IonPage,
  IonContent,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  useIonViewWillEnter,
} from "@ionic/react";
import { Capacitor } from "@capacitor/core";
import { getGarments, deleteGarment } from "../database/dbService";
import { Trash2, Plus, SearchX, Shirt } from "lucide-react";
import { useIonRouter } from "@ionic/react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface GarmentItem {
  id: string | number;
  image_uri: string;
  color_tag: string;
  category_name: string;
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const STYLES = `
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes scaleOut {
    from { opacity: 1; transform: scale(1); }
    to   { opacity: 0; transform: scale(0.85); }
  }

  .animate-fade-up  { animation: fadeUp  0.4s cubic-bezier(0.22,1,0.36,1) both; }
  .animate-fade-in  { animation: fadeIn  0.35s ease both; }
  .animate-slide-down { animation: slideDown 0.3s cubic-bezier(0.22,1,0.36,1) both; }

  .item-stagger:nth-child(1)  { animation-delay: 0.04s; }
  .item-stagger:nth-child(2)  { animation-delay: 0.08s; }
  .item-stagger:nth-child(3)  { animation-delay: 0.12s; }
  .item-stagger:nth-child(4)  { animation-delay: 0.16s; }
  .item-stagger:nth-child(5)  { animation-delay: 0.20s; }
  .item-stagger:nth-child(6)  { animation-delay: 0.24s; }
  .item-stagger:nth-child(7)  { animation-delay: 0.28s; }
  .item-stagger:nth-child(8)  { animation-delay: 0.32s; }
  .item-stagger:nth-child(n+9){ animation-delay: 0.36s; }

  .filter-pill {
    transition: transform 0.2s cubic-bezier(0.22,1,0.36,1),
                background-color 0.2s ease,
                color 0.2s ease,
                box-shadow 0.2s ease;
    -webkit-tap-highlight-color: transparent;
    will-change: transform;
  }
  .filter-pill:active { transform: scale(0.94); }

  .card-item {
    transition: transform 0.2s cubic-bezier(0.22,1,0.36,1),
                box-shadow 0.2s ease;
    -webkit-tap-highlight-color: transparent;
    will-change: transform;
  }
  .card-item:active { transform: scale(0.98); }

  .delete-btn {
    transition: opacity 0.2s ease, transform 0.15s cubic-bezier(0.22,1,0.36,1);
    -webkit-tap-highlight-color: transparent;
  }
  .delete-btn:active { transform: scale(0.85); }

  /* Show delete btn on mobile (always visible, subtle) */
  .garment-img { transition: transform 0.35s cubic-bezier(0.22,1,0.36,1); }
  .card-item:active .garment-img { transform: scale(1.04); }

  .fab {
    transition: transform 0.2s cubic-bezier(0.22,1,0.36,1),
                box-shadow 0.2s ease;
    will-change: transform;
  }
  .fab:active { transform: scale(0.93); }

  .removing {
    animation: scaleOut 0.28s cubic-bezier(0.22,1,0.36,1) forwards;
  }

  ion-content {
    --background: #0f0c29;
  }

  .scrollbar-hide::-webkit-scrollbar { display: none; }
  .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
`;

// ─── Category data ────────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: null, label: "Todos", emoji: "✨" },
  { id: 1,    label: "Superior", emoji: "👕" },
  { id: 2,    label: "Inferior",  emoji: "👖" },
  { id: 3,    label: "Calzado",   emoji: "👟" },
  { id: 4,    label: "Accesorios",emoji: "🎒" },
];

// ─── Garment Card ─────────────────────────────────────────────────────────────

const GarmentCard: React.FC<{
  item: GarmentItem;
  onDelete: (e: React.MouseEvent, item: GarmentItem) => void;
  isRemoving: boolean;
}> = ({ item, onDelete, isRemoving }) => (
  <div
    className={`card-item animate-fade-up item-stagger ${isRemoving ? "removing" : ""}`}
    style={{
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: "20px",
      overflow: "hidden",
    }}
  >
    {/* Image area */}
    <div
      className="relative flex items-center justify-center overflow-hidden"
      style={{
        height: "168px",
        backgroundColor: "#f1f2f6",
        backgroundImage: `
          linear-gradient(45deg, #e8eaed 25%, transparent 25%),
          linear-gradient(-45deg, #e8eaed 25%, transparent 25%),
          linear-gradient(45deg, transparent 75%, #e8eaed 75%),
          linear-gradient(-45deg, transparent 75%, #e8eaed 75%)
        `,
        backgroundSize: "16px 16px",
        backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
      }}
    >
      <img
        src={Capacitor.convertFileSrc(item.image_uri)}
        alt={item.category_name}
        className="garment-img object-contain w-full h-full p-3"
        style={{ filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.25))" }}
      />

      {/* Delete button — always visible, top-right */}
      <button
        onClick={(e) => onDelete(e, item)}
        className="delete-btn absolute top-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center"
        style={{
          background: "rgba(15,12,41,0.75)",
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(255,255,255,0.12)",
        }}
      >
        <Trash2 size={14} style={{ color: "#f87171" }} />
      </button>
    </div>

    {/* Footer */}
    <div className="px-3 py-2.5 flex items-center justify-between">
      <span
        className="text-[11px] font-semibold px-2 py-1 rounded-md"
        style={{
          background: "rgba(102,126,234,0.15)",
          color: "#a5b4fc",
          border: "1px solid rgba(102,126,234,0.2)",
        }}
      >
        {item.category_name}
      </span>
      {item.color_tag && (
        <div
          className="w-5 h-5 rounded-full flex-shrink-0"
          style={{
            backgroundColor: item.color_tag,
            boxShadow: `0 0 0 2px rgba(255,255,255,0.1), 0 0 8px ${item.color_tag}66`,
          }}
          title={item.color_tag}
        />
      )}
    </div>
  </div>
);

// ─── Empty State ──────────────────────────────────────────────────────────────

const EmptyState: React.FC<{ onAdd: () => void }> = ({ onAdd }) => (
  <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-up px-6">
    <div
      className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5"
      style={{
        background: "rgba(102,126,234,0.1)",
        border: "1px solid rgba(102,126,234,0.15)",
      }}
    >
      <SearchX size={36} style={{ color: "rgba(165,180,252,0.6)" }} />
    </div>
    <p className="text-base font-semibold text-white mb-1">
      Tu armario está vacío
    </p>
    <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.4)" }}>
      Ve al estudio para escanear tu primera prenda
    </p>
    <button
      onClick={onAdd}
      className="flex items-center gap-2 px-5 py-2.5 rounded-full font-medium"
      style={{
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        boxShadow: "0 4px 16px rgba(102,126,234,0.4)",
        color: "white",
      }}
    >
      <Plus size={18} />
      Añadir prenda
    </button>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export const Closet: React.FC = () => {
  const router = useIonRouter();
  const [items, setItems] = useState<GarmentItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [removingId, setRemovingId] = useState<string | number | null>(null);
  const [gridKey, setGridKey] = useState(0); // force re-stagger on filter change

  const loadItems = useCallback(async (catId: number | null) => {
    try {
      const data = await getGarments(catId);
      setItems(data);
      setGridKey((k) => k + 1);
    } catch (e) {
      console.error("Error cargando armario:", e);
    }
  }, []);

  useIonViewWillEnter(() => {
    loadItems(activeCategory);
  });

  const handleCategoryChange = (catId: number | null) => {
    if (catId === activeCategory) return;
    setActiveCategory(catId);
    loadItems(catId);
  };

  const handleDeleteGarment = async (e: React.MouseEvent, item: GarmentItem) => {
    e.stopPropagation();
    // Animate out first, then delete
    setRemovingId(item.id);
    await new Promise((r) => setTimeout(r, 260));
    try {
      await deleteGarment(item.id);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch {
      alert("No se pudo eliminar la prenda.");
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
            <Shirt size={18} style={{ color: "#a5b4fc" }} />
            <span className="text-lg font-bold text-white">Mi Armario</span>
          </div>
          {/* Item count badge */}
          {items.length > 0 && (
            <div slot="end" className="pr-4">
              <span
                className="text-xs font-bold px-2.5 py-1 rounded-full"
                style={{
                  background: "rgba(102,126,234,0.2)",
                  color: "#a5b4fc",
                  border: "1px solid rgba(102,126,234,0.3)",
                }}
              >
                {items.length} {items.length === 1 ? "prenda" : "prendas"}
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
          {/* ── Filter pills ── */}
          <div
            className="px-4 pt-4 pb-2 animate-slide-down"
            style={{ position: "sticky", top: 0, zIndex: 10, background: "rgba(15,12,41,0.9)", backdropFilter: "blur(12px)" }}
          >
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {CATEGORIES.map((cat) => {
                const active = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id ?? "all"}
                    onClick={() => handleCategoryChange(cat.id)}
                    className="filter-pill flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium flex-shrink-0"
                    style={{
                      background: active
                        ? "linear-gradient(135deg, #667eea, #764ba2)"
                        : "rgba(255,255,255,0.06)",
                      color: active ? "white" : "rgba(255,255,255,0.5)",
                      border: active
                        ? "1px solid transparent"
                        : "1px solid rgba(255,255,255,0.08)",
                      boxShadow: active ? "0 4px 12px rgba(102,126,234,0.35)" : "none",
                    }}
                  >
                    <span>{cat.emoji}</span>
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Grid ── */}
          <div className="px-4 pt-3 pb-28">
            {items.length > 0 ? (
              <div
                key={gridKey}
                className="grid grid-cols-2 gap-3"
              >
                {items.map((item) => (
                  <GarmentCard
                    key={item.id}
                    item={item}
                    onDelete={handleDeleteGarment}
                    isRemoving={removingId === item.id}
                  />
                ))}
              </div>
            ) : (
              <EmptyState onAdd={() => router.push("/studio")} />
            )}
          </div>
        </div>
      </IonContent>

      {/* ── FAB: Add garment ── */}
      {items.length > 0 && (
        <div
          className="animate-fade-in"
          style={{
            position: "fixed",
            bottom: "calc(24px + env(safe-area-inset-bottom))",
            right: "20px",
            zIndex: 50,
          }}
        >
          <button
            onClick={() => router.push("/studio")}
            className="fab w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              boxShadow: "0 8px 24px rgba(102,126,234,0.5), 0 2px 8px rgba(0,0,0,0.3)",
            }}
          >
            <Plus size={26} color="white" />
          </button>
        </div>
      )}
    </IonPage>
  );
};