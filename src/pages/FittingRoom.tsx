// src/pages/FittingRoom.tsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  IonPage, IonContent, IonHeader, IonToolbar, IonButtons,
  IonBackButton, useIonViewWillEnter, IonModal, useIonRouter,
} from "@ionic/react";
import * as fabric from "fabric";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { getGarments, saveOutfit, getAvatar, saveAvatar } from "../database/dbService";
import {
  Layers, Trash2, Camera as CameraIcon, Image as ImageIcon,
  User, BookOpen, Save, ChevronUp, ChevronDown, Shirt, RotateCcw,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface GarmentItem {
  id: string | number;
  image_uri: string;
  category_name: string;
  color_tag?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MANNEQUINS = [
  { id: "m_slim",   gender: "Hombre", type: "Delgado",  emoji: "👔", url: "/assets/mannequins/male-slim.png" },
  { id: "f_petite", gender: "Mujer",  type: "Petite",   emoji: "👗", url: "/assets/mannequins/female-petite.png" },
];

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
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(40px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes panelIn {
    from { transform: translateY(100%); opacity: 0; }
    to   { transform: translateY(0);   opacity: 1; }
  }

  .animate-fade-up  { animation: fadeUp  0.4s cubic-bezier(0.22,1,0.36,1) both; }
  .animate-fade-in  { animation: fadeIn  0.35s ease both; }
  .animate-slide-up { animation: slideUp 0.45s cubic-bezier(0.22,1,0.36,1) both; }
  .animate-panel-in { animation: panelIn 0.4s  cubic-bezier(0.22,1,0.36,1) both; }

  .delay-100 { animation-delay: 0.10s; }
  .delay-200 { animation-delay: 0.20s; }
  .delay-300 { animation-delay: 0.30s; }

  .btn-tap {
    -webkit-tap-highlight-color: transparent;
    transition: transform 0.15s cubic-bezier(0.22,1,0.36,1), opacity 0.15s ease;
    will-change: transform;
  }
  .btn-tap:active { transform: scale(0.92); opacity: 0.8; }

  .pill-btn {
    -webkit-tap-highlight-color: transparent;
    transition: transform 0.15s cubic-bezier(0.22,1,0.36,1),
                background 0.2s ease, box-shadow 0.2s ease;
    will-change: transform;
  }
  .pill-btn:active { transform: scale(0.94); }

  .garment-card {
    -webkit-tap-highlight-color: transparent;
    transition: transform 0.2s cubic-bezier(0.22,1,0.36,1), box-shadow 0.2s ease;
    will-change: transform;
  }
  .garment-card:active { transform: scale(0.93); }

  .avatar-btn {
    -webkit-tap-highlight-color: transparent;
    transition: transform 0.18s cubic-bezier(0.22,1,0.36,1), box-shadow 0.18s ease;
  }
  .avatar-btn:active { transform: scale(0.96); }

  .scrollbar-hide::-webkit-scrollbar { display: none; }
  .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }

  .canvas-shadow {
    box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 4px 16px rgba(0,0,0,0.3);
  }

  /* Save alert overlay */
  .save-overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.7);
    backdrop-filter: blur(8px);
    z-index: 200;
    display: flex; align-items: flex-end; justify-content: center;
    animation: fadeIn 0.2s ease both;
  }
  .save-sheet {
    width: 100%; max-width: 480px;
    background: linear-gradient(160deg, #1a1740, #2d2660);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 28px 28px 0 0;
    padding: 28px 24px calc(28px + env(safe-area-inset-bottom));
    animation: panelIn 0.35s cubic-bezier(0.22,1,0.36,1) both;
  }
  .save-input {
    width: 100%;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 14px;
    color: white;
    padding: 14px 16px;
    font-size: 15px;
    outline: none;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
  }
  .save-input:focus {
    border-color: rgba(102,126,234,0.6);
    box-shadow: 0 0 0 3px rgba(102,126,234,0.15);
  }
  .save-input::placeholder { color: rgba(255,255,255,0.3); }
`;

// ─── Control Button ───────────────────────────────────────────────────────────

const CtrlBtn: React.FC<{
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  variant?: "default" | "danger" | "primary";
}> = ({ onClick, icon, label, variant = "default" }) => {
  const bg = variant === "danger"  ? "rgba(239,68,68,0.15)"  :
             variant === "primary" ? "linear-gradient(135deg,#667eea,#764ba2)" :
             "rgba(255,255,255,0.08)";
  const color = variant === "danger" ? "#f87171" :
                variant === "primary" ? "white" : "rgba(255,255,255,0.75)";
  const border = variant === "danger" ? "1px solid rgba(239,68,68,0.25)" :
                 variant === "primary" ? "none" : "1px solid rgba(255,255,255,0.1)";

  return (
    <button
      onClick={onClick}
      className="btn-tap flex flex-col items-center gap-1"
    >
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center"
        style={{ background: bg, border, boxShadow: variant === "primary" ? "0 4px 16px rgba(102,126,234,0.4)" : "none" }}
      >
        <div style={{ color }}>{icon}</div>
      </div>
      <span className="text-[10px] font-medium" style={{ color: "rgba(255,255,255,0.4)" }}>
        {label}
      </span>
    </button>
  );
};

// ─── Save Sheet Component ─────────────────────────────────────────────────────

const SaveSheet: React.FC<{
  onSave: (name: string) => void;
  onClose: () => void;
}> = ({ onSave, onClose }) => {
  const [name, setName] = useState("");
  return (
    <div className="save-overlay" onClick={onClose}>
      <div className="save-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-6" />
        <h2 className="text-xl font-bold text-white mb-1">Guardar Look</h2>
        <p className="text-sm mb-5" style={{ color: "rgba(255,255,255,0.45)" }}>
          Dale un nombre a este outfit para tu Lookbook
        </p>
        <input
          className="save-input mb-4"
          placeholder="Ej: Outfit para cita del sábado"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          maxLength={60}
        />
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="pill-btn flex-1 py-3.5 rounded-2xl font-medium text-sm"
            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}
          >
            Cancelar
          </button>
          <button
            onClick={() => { if (name.trim()) onSave(name.trim()); }}
            className="pill-btn flex-1 py-3.5 rounded-2xl font-semibold text-sm text-white"
            style={{
              background: name.trim() ? "linear-gradient(135deg,#667eea,#764ba2)" : "rgba(255,255,255,0.08)",
              boxShadow: name.trim() ? "0 4px 16px rgba(102,126,234,0.4)" : "none",
              transition: "all 0.2s ease",
            }}
          >
            <Save size={15} className="inline mr-1.5 -mt-0.5" />
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const FittingRoom: React.FC = () => {
  const router = useIonRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvas = useRef<fabric.Canvas | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [items, setItems] = useState<GarmentItem[]>([]);
  const [activeAvatar, setActiveAvatar] = useState<string | null>(null);
  const [showMannequinModal, setShowMannequinModal] = useState(false);
  const [showSaveSheet, setShowSaveSheet] = useState(false);
  const [isPanelExpanded, setIsPanelExpanded] = useState(false);
  const [hasSelection, setHasSelection] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // ── Load inventory + handle preload from DailyOutfit ────────────────────

  // Ref to hold pending garments that need to be added once canvas is ready
  const pendingPreloadRef = useRef<GarmentItem[]>([]);
  const preloadAddedRef   = useRef(false);

  useIonViewWillEnter(() => {
    (async () => {
      const clothes = await getGarments(null);

      // Check if DailyOutfit passed a preload payload
      const raw = sessionStorage.getItem("fitting_preload");
      if (raw) {
        sessionStorage.removeItem("fitting_preload");
        try {
          const ids: (string | number)[] = JSON.parse(raw);
          // Filter clothes to only those in the outfit selection, preserving order
          const preloaded = ids
            .map((id) => clothes.find((c: GarmentItem) => String(c.id) === String(id)))
            .filter(Boolean) as GarmentItem[];
          // Show only preloaded items in the carousel (user can still see all via toggle)
          pendingPreloadRef.current = preloaded;
          preloadAddedRef.current   = false;
          setItems(preloaded);          // carousel shows only outfit pieces
          setIsPanelExpanded(true);     // open panel so user sees the pieces
        } catch {
          setItems(clothes);
        }
      } else {
        pendingPreloadRef.current = [];
        setItems(clothes);
      }

      const saved = await getAvatar();
      if (saved) setActiveAvatar(saved);
    })();
  });

  // ── Canvas init ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (!activeAvatar || !canvasRef.current) return;

    if (fabricCanvas.current) fabricCanvas.current.dispose();

    const container = containerRef.current;
    const w = container?.clientWidth  || 340;
    const h = container?.clientHeight || 440;

    fabricCanvas.current = new fabric.Canvas(canvasRef.current, {
      width: w, height: h,
      selection: false,
      backgroundColor: "transparent",
    });

    // Selection events
    fabricCanvas.current.on("selection:created",  () => setHasSelection(true));
    fabricCanvas.current.on("selection:updated",  () => setHasSelection(true));
    fabricCanvas.current.on("selection:cleared",  () => setHasSelection(false));

    fabric.Image.fromURL(activeAvatar).then((img) => {
      const scale = Math.min(w / (img.width || 1), h / (img.height || 1));
      img.set({
        selectable: false, evented: false,
        scaleX: scale, scaleY: scale,
        originX: "center", originY: "center",
        left: w / 2, top: h / 2,
        opacity: 0.92,
      });
      fabricCanvas.current?.add(img);
      fabricCanvas.current?.sendObjectToBack(img);
      fabricCanvas.current?.renderAll();
    });

    return () => { fabricCanvas.current?.dispose(); fabricCanvas.current = null; };
  }, [activeAvatar]);

  // ── Auto-add preloaded outfit garments once canvas is ready ───────────────

  useEffect(() => {
    if (
      !activeAvatar ||
      !fabricCanvas.current ||
      preloadAddedRef.current ||
      pendingPreloadRef.current.length === 0
    ) return;

    // Small delay so canvas finishes rendering the avatar first
    const t = setTimeout(async () => {
      const canvas = fabricCanvas.current;
      if (!canvas) return;

      const garments    = pendingPreloadRef.current;
      const canvasW     = canvas.width  || 320;
      const canvasH     = canvas.height || 440;
      // Distribute pieces in a grid: 2 columns, staggered vertically
      const positions   = [
        { left: canvasW * 0.28, top: canvasH * 0.30 }, // top-left
        { left: canvasW * 0.72, top: canvasH * 0.30 }, // top-right
        { left: canvasW * 0.28, top: canvasH * 0.65 }, // bottom-left
        { left: canvasW * 0.72, top: canvasH * 0.65 }, // bottom-right
      ];

      for (let i = 0; i < garments.length; i++) {
        const g   = garments[i];
        const pos = positions[i] ?? positions[positions.length - 1];
        await new Promise<void>((resolve) => {
          fabric.Image.fromURL(g.image_uri).then((img) => {
            img.scaleToWidth(canvasW * 0.32);
            img.set({
              left:              pos.left,
              top:               pos.top,
              originX:           "center",
              originY:           "center",
              cornerColor:       "#667eea",
              cornerSize:        14,
              transparentCorners:false,
              borderColor:       "#667eea",
              cornerStyle:       "circle",
              padding:           6,
              hasRotatingPoint:  true,
            });
            canvas.add(img);
            canvas.renderAll();
            resolve();
          });
        });
        // Small stagger between additions for visual effect
        await new Promise((r) => setTimeout(r, 120));
      }

      preloadAddedRef.current = true;
    }, 400); // wait for avatar image to render

    return () => clearTimeout(t);
  }, [activeAvatar]); // re-runs when avatar changes (canvas reinitializes)

  // ── Avatar selection ──────────────────────────────────────────────────────

  const selectPhotoAvatar = async (source: CameraSource) => {
    try {
      const photo = await Camera.getPhoto({
        quality: 90, allowEditing: false,
        resultType: CameraResultType.DataUrl, source,
      });
      if (photo.dataUrl) {
        await saveAvatar(photo.dataUrl);
        setActiveAvatar(photo.dataUrl);
      }
    } catch { /* cancelled */ }
  };

  // ── Garment canvas ops ────────────────────────────────────────────────────

  const addGarmentToCanvas = useCallback((imageUri: string) => {
    if (!fabricCanvas.current) return;
    fabric.Image.fromURL(imageUri).then((img) => {
      const cw = fabricCanvas.current?.width || 320;
      img.scaleToWidth(cw * 0.36);
      img.set({
        cornerColor: "#667eea", cornerSize: 14,
        transparentCorners: false, borderColor: "#667eea",
        cornerStyle: "circle", padding: 6, hasRotatingPoint: true,
      });
      fabricCanvas.current?.add(img);
      fabricCanvas.current?.setActiveObject(img);
      fabricCanvas.current?.centerObject(img);
      fabricCanvas.current?.renderAll();
    });
  }, []);

  const deleteSelected = () => {
    const active = fabricCanvas.current?.getActiveObject();
    if (active) { fabricCanvas.current?.remove(active); setHasSelection(false); }
  };

  const bringToFront = () => {
    const active = fabricCanvas.current?.getActiveObject();
    if (active && fabricCanvas.current) {
      fabricCanvas.current.bringObjectToFront(active);
      fabricCanvas.current.renderAll();
    }
  };

  const clearCanvas = () => {
    if (!fabricCanvas.current) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const objs = fabricCanvas.current.getObjects().filter((o) => (o as any).selectable !== false);
    objs.forEach((o) => fabricCanvas.current?.remove(o));
    fabricCanvas.current.renderAll();
    setHasSelection(false);
  };

  // ── Save outfit ───────────────────────────────────────────────────────────

  const handleSaveOutfit = async (outfitName: string) => {
    if (!fabricCanvas.current) return;
    setShowSaveSheet(false);
    setIsSaving(true);
    try {
      fabricCanvas.current.discardActiveObject();
      fabricCanvas.current.requestRenderAll();
      const canvasJson    = JSON.stringify(fabricCanvas.current.toJSON());
      const previewBase64 = fabricCanvas.current.toDataURL({ format: "webp", quality: 0.7, multiplier: 0.5 });
      await saveOutfit(outfitName, canvasJson, previewBase64);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch { /* error */ }
    finally { setIsSaving(false); }
  };

  // ─────────────────────────────────────────────────────────────────────────

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
          <span className="text-base font-bold text-white pl-1">Probador</span>
          <IonButtons slot="end">
            <button
              onClick={() => router.push("/lookbook")}
              className="btn-tap mr-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              <BookOpen size={15} style={{ color: "#a5b4fc" }} />
              <span className="text-xs font-medium" style={{ color: "#a5b4fc" }}>Lookbook</span>
            </button>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent scrollY={false}
        style={{ "--background": "linear-gradient(160deg,#0f0c29 0%,#302b63 60%,#24243e 100%)" } as React.CSSProperties}
      >
        <div className="flex flex-col h-full" style={{ height: "100%" }}>

          {/* ── Canvas area ── */}
          <div className="flex-1 flex flex-col items-center justify-center px-4 pt-3 pb-2 relative min-h-0">

            {/* Canvas container */}
            <div
              ref={containerRef}
              className="canvas-shadow relative rounded-3xl overflow-hidden"
              style={{
                width: "100%",
                maxWidth: "360px",
                height: "100%",
                background: activeAvatar
                  ? "linear-gradient(135deg,#e8eaed 0%,#f1f2f6 100%)"
                  : "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: activeAvatar ? "block" : "none" }} />

              {/* No-avatar overlay */}
              {!activeAvatar && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 animate-fade-in">
                  <div
                    className="w-20 h-20 rounded-3xl flex items-center justify-center mb-4"
                    style={{ background: "rgba(102,126,234,0.1)", border: "1px solid rgba(102,126,234,0.2)" }}
                  >
                    <User size={36} style={{ color: "rgba(165,180,252,0.6)" }} />
                  </div>
                  <h3 className="text-base font-bold text-white mb-1">Configura tu avatar</h3>
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                    Elige una foto tuya o un maniquí para empezar
                  </p>
                </div>
              )}

              {/* Save-success toast */}
              {saveSuccess && (
                <div
                  className="absolute top-3 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-sm font-semibold text-white animate-fade-in"
                  style={{ background: "linear-gradient(135deg,#667eea,#764ba2)", boxShadow: "0 4px 16px rgba(102,126,234,0.5)", whiteSpace: "nowrap" }}
                >
                  ✓ Look guardado en Lookbook
                </div>
              )}

              {/* Saving overlay */}
              {isSaving && (
                <div className="absolute inset-0 flex items-center justify-center animate-fade-in"
                  style={{ background: "rgba(15,12,41,0.6)", backdropFilter: "blur(4px)" }}>
                  <div className="w-8 h-8 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
                </div>
              )}
            </div>

            {/* Control buttons — only when avatar is active */}
            {activeAvatar && (
              <div className="flex items-center gap-4 mt-3 animate-fade-in">
                <CtrlBtn onClick={bringToFront} icon={<Layers size={20} />}    label="Capa"    />
                <CtrlBtn onClick={clearCanvas}  icon={<RotateCcw size={20} />} label="Limpiar" />
                <CtrlBtn onClick={deleteSelected} icon={<Trash2 size={20} />}  label="Borrar"  variant={hasSelection ? "danger" : "default"} />
                <CtrlBtn
                  onClick={() => setShowSaveSheet(true)}
                  icon={<Save size={20} />}
                  label="Guardar"
                  variant="primary"
                />
              </div>
            )}
          </div>

          {/* ── Bottom panel ── */}
          <div
            className="flex-shrink-0 animate-panel-in"
            style={{
              background: "rgba(255,255,255,0.04)",
              borderTop: "1px solid rgba(255,255,255,0.08)",
              backdropFilter: "blur(20px)",
              borderRadius: "28px 28px 0 0",
              paddingBottom: "env(safe-area-inset-bottom)",
            }}
          >
            {/* Panel handle + toggle */}
            <button
              className="btn-tap w-full flex items-center justify-between px-5 py-3"
              onClick={() => setIsPanelExpanded((p) => !p)}
            >
              <div className="flex items-center gap-2">
                <Shirt size={16} style={{ color: "#a5b4fc" }} />
                <span className="text-sm font-semibold text-white">
                  {activeAvatar ? "Tu armario" : "Configurar avatar"}
                </span>
                {items.length > 0 && activeAvatar && (
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(102,126,234,0.2)", color: "#a5b4fc", border: "1px solid rgba(102,126,234,0.25)" }}
                  >
                    {items.length}
                  </span>
                )}
              </div>
              {isPanelExpanded ? <ChevronDown size={18} style={{ color: "rgba(255,255,255,0.4)" }} /> : <ChevronUp size={18} style={{ color: "rgba(255,255,255,0.4)" }} />}
            </button>

            {/* ── Avatar selection panel ── */}
            {!activeAvatar && (
              <div className={`px-4 pb-5 ${isPanelExpanded ? "" : "hidden"} space-y-2`}>
                <button
                  onClick={() => selectPhotoAvatar(CameraSource.Camera)}
                  className="avatar-btn w-full flex items-center px-4 py-3.5 rounded-2xl"
                  style={{ background: "linear-gradient(135deg,#667eea,#764ba2)", boxShadow: "0 6px 20px rgba(102,126,234,0.4)" }}
                >
                  <CameraIcon size={20} color="white" className="mr-3" />
                  <span className="text-sm font-semibold text-white">Tomar mi Foto</span>
                </button>
                <button
                  onClick={() => selectPhotoAvatar(CameraSource.Photos)}
                  className="avatar-btn w-full flex items-center px-4 py-3.5 rounded-2xl"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                >
                  <ImageIcon size={20} style={{ color: "#a5b4fc" }} className="mr-3" />
                  <span className="text-sm font-medium text-white">Subir desde Galería</span>
                </button>
                <button
                  onClick={() => setShowMannequinModal(true)}
                  className="avatar-btn w-full flex items-center px-4 py-3.5 rounded-2xl"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                >
                  <User size={20} style={{ color: "#a5b4fc" }} className="mr-3" />
                  <span className="text-sm font-medium text-white">Usar Maniquí</span>
                </button>
              </div>
            )}

            {/* ── Garment carousel ── */}
            {activeAvatar && (
              <div className={`${isPanelExpanded ? "pb-4" : "pb-4"}`}>
                {items.length > 0 ? (
                  <div className="flex gap-3 overflow-x-auto px-4 pb-1 scrollbar-hide">
                    {items.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => addGarmentToCanvas(item.image_uri)}
                        className="garment-card flex-shrink-0 w-20 h-20 rounded-2xl p-2 flex items-center justify-center"
                        style={{
                          background: "rgba(255,255,255,0.06)",
                          border: "1px solid rgba(255,255,255,0.1)",
                        }}
                      >
                        <img
                          src={item.image_uri}
                          alt="prenda"
                          className="w-full h-full object-contain"
                          style={{ filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.3))" }}
                        />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="px-4 py-3 text-center">
                    <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                      Ve al Estudio para añadir prendas a tu armario
                    </p>
                  </div>
                )}

                {/* Change avatar link */}
                {isPanelExpanded && (
                  <button
                    onClick={() => setActiveAvatar(null)}
                    className="btn-tap w-full flex items-center justify-center gap-1.5 pt-3 pb-1"
                  >
                    <User size={13} style={{ color: "rgba(165,180,252,0.6)" }} />
                    <span className="text-xs" style={{ color: "rgba(165,180,252,0.6)" }}>Cambiar avatar</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Save sheet overlay ── */}
        {showSaveSheet && (
          <SaveSheet onSave={handleSaveOutfit} onClose={() => setShowSaveSheet(false)} />
        )}

        {/* ── Mannequin modal ── */}
        <IonModal
          isOpen={showMannequinModal}
          onDidDismiss={() => setShowMannequinModal(false)}
          breakpoints={[0, 0.45]}
          initialBreakpoint={0.45}
          style={{ "--background": "#1a1740" } as React.CSSProperties}
        >
          <div
            className="flex flex-col h-full"
            style={{ background: "linear-gradient(160deg,#1a1740,#2d2660)", padding: "24px" }}
          >
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-5" />
            <h2 className="text-lg font-bold text-white mb-1">Tipos de cuerpo</h2>
            <p className="text-xs mb-5" style={{ color: "rgba(255,255,255,0.45)" }}>Selecciona un maniquí base</p>
            <div className="space-y-3">
              {MANNEQUINS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => { setActiveAvatar(m.url); setShowMannequinModal(false); }}
                  className="avatar-btn w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl"
                    style={{ background: "rgba(102,126,234,0.15)" }}
                  >
                    {m.emoji}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-white">{m.gender} — {m.type}</p>
                    <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>Boceto paramétrico</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </IonModal>
      </IonContent>
    </IonPage>
  );
};