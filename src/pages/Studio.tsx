import React, { useState } from "react";
import {
  IonPage,
  IonContent,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  useIonRouter,
} from "@ionic/react";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { Camera as CameraIcon, Image as ImageIcon, Check, X, Sparkles, Tag, Palette, Wand2 } from "lucide-react";
import { saveItem } from "../database/dbService";
import { extractDominantColor } from "../utils/colorEngine";

// ─── Styles ──────────────────────────────────────────────────────────────────

const STYLES = `
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes spin-smooth {
    to { transform: rotate(360deg); }
  }
  @keyframes orbit {
    to { transform: rotate(360deg); }
  }
  @keyframes pulse-glow {
    0%, 100% { box-shadow: 0 0 0 0 rgba(102,126,234,0.4); }
    50%       { box-shadow: 0 0 0 14px rgba(102,126,234,0); }
  }
  @keyframes checkered-fade {
    from { opacity: 0; transform: scale(0.94); }
    to   { opacity: 1; transform: scale(1); }
  }

  .animate-fade-up { animation: fadeUp 0.45s cubic-bezier(0.22,1,0.36,1) both; }
  .animate-fade-in { animation: fadeIn 0.35s ease both; }
  .delay-100 { animation-delay: 0.10s; }
  .delay-200 { animation-delay: 0.20s; }
  .delay-300 { animation-delay: 0.30s; }

  .btn-tap {
    transition: transform 0.15s cubic-bezier(0.22,1,0.36,1), opacity 0.15s ease;
    -webkit-tap-highlight-color: transparent;
    will-change: transform;
  }
  .btn-tap:active { transform: scale(0.96); opacity: 0.85; }

  .source-btn {
    transition: transform 0.18s cubic-bezier(0.22,1,0.36,1),
                box-shadow 0.18s ease,
                background-color 0.18s ease;
    -webkit-tap-highlight-color: transparent;
    will-change: transform;
  }
  .source-btn:active { transform: scale(0.97); }

  .spinner-ring {
    width: 56px; height: 56px;
    border: 3px solid rgba(102,126,234,0.15);
    border-top-color: #667eea;
    border-radius: 50%;
    animation: spin-smooth 0.8s linear infinite;
  }
  .spinner-ring-outer {
    width: 72px; height: 72px;
    border: 2px solid rgba(102,126,234,0.08);
    border-top-color: rgba(102,126,234,0.4);
    border-radius: 50%;
    animation: spin-smooth 1.4s linear infinite reverse;
    position: absolute;
  }

  .preview-container {
    animation: checkered-fade 0.4s cubic-bezier(0.22,1,0.36,1) both;
    background-color: #f8f9fa;
    background-image:
      linear-gradient(45deg, #e8eaed 25%, transparent 25%),
      linear-gradient(-45deg, #e8eaed 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, #e8eaed 75%),
      linear-gradient(-45deg, transparent 75%, #e8eaed 75%);
    background-size: 20px 20px;
    background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
  }

  .step-pill {
    transition: all 0.3s cubic-bezier(0.22,1,0.36,1);
  }

  .field-focus-ring:focus-within {
    box-shadow: 0 0 0 3px rgba(102,126,234,0.2);
    border-color: #667eea !important;
  }
  .field-focus-ring { transition: box-shadow 0.2s ease, border-color 0.2s ease; }

  .save-btn-glow { animation: pulse-glow 2s ease-in-out infinite; }

  .dark-surface {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.08);
  }
`;

// ─── Step indicator ───────────────────────────────────────────────────────────

const STEPS = ["Captura", "Vista previa", "Guardar"];

const StepIndicator: React.FC<{ current: number }> = ({ current }) => (
  <div className="flex items-center justify-center gap-2 mb-8">
    {STEPS.map((s, i) => (
      <React.Fragment key={s}>
        <div className="flex items-center gap-1.5">
          <div
            className="step-pill w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold"
            style={{
              background: i < current ? "#667eea" : i === current ? "#667eea" : "rgba(255,255,255,0.08)",
              color: i <= current ? "white" : "rgba(255,255,255,0.3)",
              boxShadow: i === current ? "0 0 0 3px rgba(102,126,234,0.25)" : "none",
            }}
          >
            {i < current ? <Check size={12} /> : i + 1}
          </div>
          <span
            className="text-xs font-medium hidden sm:block"
            style={{ color: i === current ? "white" : "rgba(255,255,255,0.3)" }}
          >
            {s}
          </span>
        </div>
        {i < STEPS.length - 1 && (
          <div
            className="step-pill flex-1 h-px max-w-[32px]"
            style={{ background: i < current ? "#667eea" : "rgba(255,255,255,0.1)" }}
          />
        )}
      </React.Fragment>
    ))}
  </div>
);

// ─── Category options ─────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: 1, label: "Superior", sub: "Camisas, Chaquetas", emoji: "👕" },
  { id: 2, label: "Inferior", sub: "Pantalones, Faldas", emoji: "👖" },
  { id: 3, label: "Calzado", sub: "Zapatos, Tenis", emoji: "👟" },
  { id: 4, label: "Accesorios", sub: "Gorros, Bolsos", emoji: "🎒" },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export const Studio: React.FC = () => {
  const router = useIonRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<number>(1);
  const [colorTag, setColorTag] = useState<string>("#6B7280");
  const [processingMsg, setProcessingMsg] = useState("Preparando imagen...");

  // Derive step
  const step = processedImage ? 2 : isProcessing ? 1 : 0;

  const handleCapture = async (source: CameraSource) => {
    try {
      const photo = await Camera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source,
        width: 800,
      });
      if (photo.webPath) await processImage(photo.webPath);
    } catch {
      // user cancelled
    }
  };

  const processImage = async (imagePath: string) => {
    setIsProcessing(true);
    const msgs = [
      "Analizando imagen...",
      "Detectando prenda...",
      "Eliminando fondo con IA...",
      "Detectando color dominante...",
    ];
    let msgIdx = 0;
    setProcessingMsg(msgs[0]);
    const interval = setInterval(() => {
      msgIdx = (msgIdx + 1) % msgs.length;
      setProcessingMsg(msgs[msgIdx]);
    }, 1200);

    try {
      const response = await fetch(imagePath);
      const originalBlob = await response.blob();
      const formData = new FormData();
      formData.append("image_file", originalBlob);
      formData.append("size", "auto");

      const apiResponse = await fetch("https://api.remove.bg/v1.0/removebg", {
        method: "POST",
        headers: { "X-Api-Key": "4ts5yra7aLbaLt5zyLvBxraQ" },
        body: formData,
      });

      if (!apiResponse.ok) throw new Error(apiResponse.statusText);

      const transparentBlob = await apiResponse.blob();
      const url = URL.createObjectURL(transparentBlob);

      // ── Auto-detect dominant color from the transparent image ──────────────
      setProcessingMsg("Detectando color dominante...");
      try {
        const detectedColor = await extractDominantColor(url);
        setColorTag(detectedColor);
      } catch {
        // If color detection fails, keep the default — not a critical error
      }

      setProcessedImage(url);
    } catch {
      alert("Hubo un problema al procesar la imagen. Verifica tu API Key y conexión.");
    } finally {
      clearInterval(interval);
      setIsProcessing(false);
    }
  };

  const handleSave = async () => {
    if (!processedImage) return;
    setIsProcessing(true);
    try {
      const response = await fetch(processedImage);
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64data = reader.result as string;
        await saveItem({
          id: crypto.randomUUID(),
          category_id: categoryId,
          image_uri: base64data,
          color_tag: colorTag,
          created_at: new Date().toISOString(),
        });
        URL.revokeObjectURL(processedImage);
        setProcessedImage(null);
        setIsProcessing(false);
        router.push("/closet", "forward", "replace");
      };
      reader.readAsDataURL(blob);
    } catch {
      setIsProcessing(false);
    }
  };

  const handleDiscard = () => {
    if (processedImage) URL.revokeObjectURL(processedImage);
    setProcessedImage(null);
  };

  return (
    <IonPage>
      <style>{STYLES}</style>

      <IonHeader className="ion-no-border" style={{ background: "transparent" }}>
        <IonToolbar
          style={{
            "--background": "#0f0c29",
            "--border-width": "0",
            paddingTop: "env(safe-area-inset-top)",
          } as React.CSSProperties}
        >
          <IonButtons slot="start">
            <IonBackButton
              defaultHref="/dashboard"
              style={{ "--color": "rgba(255,255,255,0.7)" } as React.CSSProperties}
            />
          </IonButtons>
          <div slot="end" className="pr-4">
            <span
              className="text-xs font-bold px-2.5 py-1 rounded-full"
              style={{ background: "rgba(102,126,234,0.2)", color: "#a5b4fc", border: "1px solid rgba(102,126,234,0.3)" }}
            >
              IA
            </span>
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent scrollY={step === 2}>
        <div
          className="min-h-full flex flex-col"
          style={{
            background: "linear-gradient(160deg, #0f0c29 0%, #302b63 60%, #24243e 100%)",
          }}
        >
          <div className="flex-1 px-6 pt-4 pb-10 flex flex-col">
            {/* Title */}
            <div className="mb-6 animate-fade-up">
              <h1 className="text-2xl font-bold text-white">Estudio</h1>
              <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.45)" }}>
                Añade prendas con eliminación de fondo por IA
              </p>
            </div>

            {/* Step indicator */}
            <StepIndicator current={step} />

            {/* ── STATE 0: Source selection ── */}
            {step === 0 && (
              <div className="flex-1 flex flex-col justify-center animate-fade-up delay-100">
                {/* Illustration */}
                <div className="flex justify-center mb-10">
                  <div
                    className="w-28 h-28 rounded-3xl flex items-center justify-center relative"
                    style={{
                      background: "linear-gradient(135deg, rgba(102,126,234,0.2), rgba(118,75,162,0.2))",
                      border: "1px solid rgba(102,126,234,0.2)",
                    }}
                  >
                    <CameraIcon size={52} style={{ color: "#a5b4fc" }} />
                    <div
                      className="absolute -bottom-2 -right-2 w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ background: "linear-gradient(135deg, #667eea, #764ba2)" }}
                    >
                      <Sparkles size={16} color="white" />
                    </div>
                  </div>
                </div>

                <p className="text-center text-sm mb-8" style={{ color: "rgba(255,255,255,0.45)" }}>
                  Usa un fondo blanco o contrastante para mejores resultados
                </p>

                <div className="space-y-3">
                  <button
                    onClick={() => handleCapture(CameraSource.Camera)}
                    className="source-btn w-full flex items-center px-5 py-4 rounded-2xl"
                    style={{
                      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                      boxShadow: "0 8px 24px rgba(102,126,234,0.4)",
                    }}
                  >
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mr-4">
                      <CameraIcon size={22} color="white" />
                    </div>
                    <div className="text-left">
                      <p className="text-base font-semibold text-white">Tomar Foto</p>
                      <p className="text-xs text-white/60">Usa tu cámara</p>
                    </div>
                  </button>

                  <button
                    onClick={() => handleCapture(CameraSource.Photos)}
                    className="source-btn w-full flex items-center px-5 py-4 rounded-2xl"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center mr-4"
                      style={{ background: "rgba(255,255,255,0.1)" }}
                    >
                      <ImageIcon size={22} style={{ color: "rgba(255,255,255,0.7)" }} />
                    </div>
                    <div className="text-left">
                      <p className="text-base font-semibold text-white">Desde Galería</p>
                      <p className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>Sube una imagen existente</p>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* ── STATE 1: Processing ── */}
            {isProcessing && step === 1 && (
              <div className="flex-1 flex flex-col items-center justify-center animate-fade-in">
                {/* Nested spinner rings */}
                <div className="relative flex items-center justify-center w-24 h-24 mb-8">
                  <div className="spinner-ring-outer absolute" />
                  <div className="spinner-ring" />
                  <Sparkles
                    size={20}
                    style={{ color: "#a5b4fc", position: "absolute" }}
                  />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  Procesando magia
                </h3>
                <p
                  className="text-sm text-center"
                  style={{ color: "rgba(255,255,255,0.45)", minHeight: "20px", transition: "opacity 0.3s" }}
                >
                  {processingMsg}
                </p>
              </div>
            )}

            {/* ── STATE 2: Confirm & metadata ── */}
            {processedImage && !isProcessing && (
              <div className="flex-1 flex flex-col animate-fade-up">
                {/* Preview */}
                <div
                  className="preview-container rounded-2xl h-56 flex items-center justify-center overflow-hidden mb-6 p-4"
                  style={{ border: "1px solid rgba(255,255,255,0.1)" }}
                >
                  <img
                    src={processedImage}
                    alt="Prenda recortada"
                    className="object-contain w-full h-full"
                    style={{ filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.4))" }}
                  />
                </div>

                {/* Category selector */}
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Tag size={14} style={{ color: "#a5b4fc" }} />
                    <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.5)" }}>
                      Categoría
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setCategoryId(cat.id)}
                        className="btn-tap flex items-center gap-3 px-3 py-3 rounded-xl text-left"
                        style={{
                          background: categoryId === cat.id
                            ? "rgba(102,126,234,0.2)"
                            : "rgba(255,255,255,0.04)",
                          border: `1px solid ${categoryId === cat.id ? "rgba(102,126,234,0.5)" : "rgba(255,255,255,0.08)"}`,
                          transition: "all 0.2s ease",
                        }}
                      >
                        <span className="text-xl">{cat.emoji}</span>
                        <div>
                          <p className="text-sm font-medium text-white leading-tight">{cat.label}</p>
                          <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>{cat.sub}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color picker — shows auto-detected color with manual override */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Palette size={14} style={{ color: "#a5b4fc" }} />
                      <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.5)" }}>
                        Color predominante
                      </label>
                    </div>
                    {/* Auto-detected badge */}
                    <div
                      className="flex items-center gap-1 px-2 py-0.5 rounded-full"
                      style={{ background: "rgba(52,211,153,0.15)", border: "1px solid rgba(52,211,153,0.25)" }}
                    >
                      <Wand2 size={10} style={{ color: "#34d399" }} />
                      <span className="text-[10px] font-semibold" style={{ color: "#34d399" }}>
                        Auto-detectado
                      </span>
                    </div>
                  </div>
                  <div
                    className="field-focus-ring flex items-center gap-3 px-4 py-3 rounded-xl"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    {/* Color swatch — clickable to override */}
                    <div
                      className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0"
                      style={{ boxShadow: `0 0 0 2px rgba(255,255,255,0.15), 0 0 14px ${colorTag}66` }}
                    >
                      <input
                        type="color"
                        value={colorTag}
                        onChange={(e) => setColorTag(e.target.value)}
                        className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
                        style={{ transform: "scale(1.5)" }}
                      />
                      <div
                        className="w-full h-full rounded-lg"
                        style={{ backgroundColor: colorTag }}
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-white font-mono uppercase tracking-wide">
                        {colorTag}
                      </p>
                      <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                        Toca el círculo para ajustar manualmente
                      </p>
                    </div>
                    {/* Live preview of harmony partners */}
                    <div className="flex gap-1">
                      {[180, 30, -30].map((offset) => {
                        // Quick HSL shift for preview dots
                        const hex = colorTag.replace("#", "");
                        const r = parseInt(hex.substring(0,2),16);
                        const g = parseInt(hex.substring(2,4),16);
                        const b = parseInt(hex.substring(4,6),16);
                        const rn=r/255,gn=g/255,bn=b/255;
                        const max=Math.max(rn,gn,bn),min=Math.min(rn,gn,bn);
                        const l=(max+min)/2;
                        const d=max-min;
                        const s=d===0?0:(l>0.5?d/(2-max-min):d/(max+min));
                        let h=0;
                        if(max===rn)h=((gn-bn)/d+(gn<bn?6:0))/6;
                        else if(max===gn)h=((bn-rn)/d+2)/6;
                        else h=((rn-gn)/d+4)/6;
                        const newH = ((h*360+offset)%360+360)%360;
                        const sn=s,ln=l;
                        const a2=sn*Math.min(ln,1-ln);
                        const f=(n:number)=>{const k=(n+newH/30)%12;return Math.round(255*(ln-a2*Math.max(Math.min(k-3,9-k,1),-1))).toString(16).padStart(2,"0");};
                        const partnerHex = `#${f(0)}${f(8)}${f(4)}`;
                        return (
                          <div
                            key={offset}
                            className="w-4 h-4 rounded-full"
                            style={{
                              backgroundColor: partnerHex,
                              opacity: 0.7,
                              boxShadow: `0 0 4px ${partnerHex}88`,
                            }}
                            title={`Armonía: ${partnerHex}`}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-3 mt-auto">
                  <button
                    onClick={handleDiscard}
                    className="btn-tap flex-1 flex justify-center items-center py-3.5 rounded-xl font-medium"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "rgba(255,255,255,0.6)",
                    }}
                  >
                    <X size={18} className="mr-2" />
                    Descartar
                  </button>
                  <button
                    onClick={handleSave}
                    className="btn-tap save-btn-glow flex-1 flex justify-center items-center py-3.5 rounded-xl font-semibold text-white"
                    style={{
                      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    }}
                  >
                    <Check size={18} className="mr-2" />
                    Guardar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};