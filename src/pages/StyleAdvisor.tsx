import React, { useState, useEffect, useRef } from "react";
import {
  IonPage, IonContent, IonHeader, IonToolbar,
  IonButtons, IonBackButton,
} from "@ionic/react";
import { User, ChevronRight, RefreshCw, Save, Wand2, ShoppingBag } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SkinTone =
  | "muy_claro" | "claro" | "medio_claro" | "medio"
  | "medio_oscuro" | "oscuro" | "muy_oscuro";

export type BodyType =
  | "ectomorfo"   // delgado, hombros y caderas angostos
  | "mesomorfo"   // atlético, musculoso
  | "endomorfo"   // más peso en caderas/abdomen
  | "triangulo"   // caderas más anchas que hombros
  | "invertido"   // hombros más anchos que caderas
  | "rectangulo"  // hombros y caderas similares, sin cintura marcada
  | "reloj_arena";// cintura muy marcada

export interface UserStyleProfile {
  skinTone:    SkinTone;
  bodyType:    BodyType;
  heightCm:    number;      // 140–210
  gender:      "hombre" | "mujer" | "no_binario";
  age:         number;
  preferences: string;      // free text: "me gusta lo casual, odio los estampados"
}

export interface StyleRecommendation {
  profile:     UserStyleProfile;
  generatedAt: string;
  sections:    RecommendationSection[];
}

interface RecommendationSection {
  title:   string;
  emoji:   string;
  content: string;
}

// ─── Storage ──────────────────────────────────────────────────────────────────

const PROFILE_KEY = "style_advisor_profile";
const RECO_KEY    = "style_advisor_last_reco";

function loadProfile(): UserStyleProfile | null {
  try { return JSON.parse(localStorage.getItem(PROFILE_KEY) ?? "null"); }
  catch { return null; }
}
function saveProfile(p: UserStyleProfile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
}
function loadLastReco(): StyleRecommendation | null {
  try { return JSON.parse(localStorage.getItem(RECO_KEY) ?? "null"); }
  catch { return null; }
}
function saveLastReco(r: StyleRecommendation) {
  localStorage.setItem(RECO_KEY, JSON.stringify(r));
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const STYLES = `
  @keyframes fadeUp  { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
  @keyframes shimmer {
    0%   { background-position: -200% center; }
    100% { background-position:  200% center; }
  }
  @keyframes typing-cursor {
    0%,100% { opacity:1 } 50% { opacity:0 }
  }

  .animate-fade-up { animation: fadeUp 0.42s cubic-bezier(0.22,1,0.36,1) both; }
  .animate-fade-in { animation: fadeIn 0.3s ease both; }

  .btn-tap {
    -webkit-tap-highlight-color: transparent;
    transition: transform 0.15s cubic-bezier(0.22,1,0.36,1), opacity 0.15s;
    will-change: transform;
  }
  .btn-tap:active { transform: scale(0.94); opacity: 0.8; }

  .option-btn {
    -webkit-tap-highlight-color: transparent;
    transition: all 0.2s cubic-bezier(0.22,1,0.36,1);
    will-change: transform;
  }
  .option-btn:active { transform: scale(0.96); }

  .shimmer-text {
    background: linear-gradient(90deg,#c084fc 0%,#f472b6 40%,#fb923c 60%,#c084fc 100%);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: shimmer 3s linear infinite;
  }

  .text-field {
    width: 100%;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 14px;
    color: white; font-size: 14px;
    padding: 12px 14px; outline: none; resize: none;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .text-field:focus {
    border-color: rgba(102,126,234,0.6);
    box-shadow: 0 0 0 3px rgba(102,126,234,0.12);
  }
  .text-field::placeholder { color: rgba(255,255,255,0.25); }

  .reco-section {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 20px;
    padding: 18px;
    margin-bottom: 12px;
  }
  .reco-content {
    color: rgba(255,255,255,0.75);
    font-size: 14px;
    line-height: 1.7;
    white-space: pre-wrap;
  }

  .streaming-cursor::after {
    content: '▋';
    animation: typing-cursor 0.8s ease infinite;
    color: #a5b4fc;
  }

  .scrollbar-hide::-webkit-scrollbar { display: none; }
  .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }

  .height-slider {
    width: 100%;
    -webkit-appearance: none;
    appearance: none;
    height: 4px;
    border-radius: 2px;
    background: rgba(255,255,255,0.12);
    outline: none;
  }
  .height-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 20px; height: 20px;
    border-radius: 50%;
    background: linear-gradient(135deg,#667eea,#764ba2);
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(102,126,234,0.5);
  }
`;

// ─── Profile data ─────────────────────────────────────────────────────────────

const SKIN_TONES: { value: SkinTone; label: string; hex: string }[] = [
  { value: "muy_claro",   label: "Muy claro",   hex: "#FDDBB4" },
  { value: "claro",       label: "Claro",        hex: "#F5C49D" },
  { value: "medio_claro", label: "Medio claro",  hex: "#E8A87C" },
  { value: "medio",       label: "Medio",        hex: "#C68A5A" },
  { value: "medio_oscuro",label: "Medio oscuro", hex: "#A0623A" },
  { value: "oscuro",      label: "Oscuro",       hex: "#7A3B1E" },
  { value: "muy_oscuro",  label: "Muy oscuro",   hex: "#4A1F0A" },
];

const BODY_TYPES: { value: BodyType; label: string; emoji: string; desc: string }[] = [
  { value: "ectomorfo",    label: "Ectomorfo",       emoji: "🏃", desc: "Delgado, hombros y caderas angostos" },
  { value: "mesomorfo",    label: "Mesomorfo",        emoji: "💪", desc: "Atlético, musculoso, bien proporcionado" },
  { value: "endomorfo",    label: "Endomorfo",        emoji: "🟤", desc: "Más peso en abdomen/caderas, redondeado" },
  { value: "triangulo",    label: "Triángulo",        emoji: "🔻", desc: "Caderas más anchas que hombros" },
  { value: "invertido",    label: "Triángulo inv.",   emoji: "🔺", desc: "Hombros más anchos que caderas" },
  { value: "rectangulo",   label: "Rectángulo",       emoji: "▭",  desc: "Hombros y caderas similares, sin cintura" },
  { value: "reloj_arena",  label: "Reloj de arena",   emoji: "⏳", desc: "Cintura muy marcada, busto y caderas similares" },
];

const GENDERS = [
  { value: "hombre" as const,     label: "Hombre",     emoji: "👨" },
  { value: "mujer" as const,      label: "Mujer",       emoji: "👩" },
  { value: "no_binario" as const, label: "No binario",  emoji: "🧑" },
];

// ─── Motor de recomendaciones LOCAL ──────────────────────────────────────────
// Cero APIs, cero keys, cero errores de red. Funciona offline.
// Basado en tablas de conocimiento de estilismo profesional.
// ─────────────────────────────────────────────────────────────────────────────

// ── Paletas por tono de piel ──────────────────────────────────────────────────

const SKIN_COLOR_MAP: Record<SkinTone, {
  ideal: string[]; avoid: string[]; neutrals: string[];
}> = {
  muy_claro: {
    ideal:   ["azul marino", "borgoña", "verde bosque", "gris carbón", "negro", "azul cobalto", "ciruela", "teal"],
    avoid:   ["beige claro", "blanco puro (lava mucho)", "amarillo pálido", "nude claro"],
    neutrals:["gris perla", "blanco hueso", "crema"],
  },
  claro: {
    ideal:   ["azul marino", "verde esmeralda", "rojo burdeos", "mostaza", "coral", "terracota suave", "lavanda oscuro"],
    avoid:   ["nude idéntico a tu piel", "amarillo neón", "blanco brillante sin contraste"],
    neutrals:["beige tostado", "gris claro", "camel"],
  },
  medio_claro: {
    ideal:   ["terracota", "verde oliva", "azul acero", "naranja quemado", "café chocolate", "mostaza dorada"],
    avoid:   ["gris muy claro", "pasteles lavados", "amarillo limón"],
    neutrals:["camel", "beige medio", "blanco roto"],
  },
  medio: {
    ideal:   ["naranja quemado", "rojo tomate", "verde musgo", "azul pavo real", "amarillo ocre", "coral intenso", "vino"],
    avoid:   ["gris ratón", "colores demasiado apagados sin acento", "verde lima neón"],
    neutrals:["camel oscuro", "beige cálido", "crema tostada"],
  },
  medio_oscuro: {
    ideal:   ["amarillo dorado", "naranja intenso", "verde esmeralda", "rojo carmín", "blanco", "azul eléctrico", "rosa fucsia"],
    avoid:   ["marrón muy oscuro sin contraste", "gris oscuro apagado"],
    neutrals:["blanco", "crema", "camel claro"],
  },
  oscuro: {
    ideal:   ["blanco", "amarillo vibrante", "naranja", "verde lima", "rosa chicle", "azul eléctrico", "rojo intenso", "dorado"],
    avoid:   ["marrón oscuro (se pierde)", "gris oscuro sin acento"],
    neutrals:["blanco", "crema", "beige claro"],
  },
  muy_oscuro: {
    ideal:   ["blanco brillante", "amarillo solar", "naranja mango", "verde menta", "rosa intenso", "dorado", "plateado", "azul rey"],
    avoid:   ["negro puro (puede apagar)", "marrón oscuro"],
    neutrals:["blanco", "marfil", "dorado claro"],
  },
};

// ── Siluetas y prendas por tipo de cuerpo ────────────────────────────────────

const BODY_STYLE_MAP: Record<BodyType, {
  siluetas: string;
  prendas:  string;
  errores:  string;
  accesorios: string;
}> = {
  ectomorfo: {
    siluetas: "Busca crear volumen y definir el cuerpo.\n• Cortes rectos y estructurados que den anchura\n• Hombreras sutiles en chaquetas y blazers\n• Pantalones slim o straight, nunca extra baggy\n• Capas (layering): camisas abiertas sobre camisetas\n• Patrones horizontales y estampados medianos que añaden dimensión",
    prendas:  "🛒 Lista de compras prioritaria:\n1. Blazer estructurado (azul marino o gris)\n2. Camisas de franela o cuadros (añaden volumen visual)\n3. Pantalón chino slim en camel o beige\n4. Jersey/suéter de punto grueso o cable-knit\n5. Chaqueta bomber o trucker (añade masa a la parte superior)\n6. Jeans straight-leg de mezclilla media\n7. Camisa de lino con bolsillos en el pecho\n8. Zapatillas chunky o botas con suela gruesa (dan base al look)",
    errores:  "❌ Errores frecuentes:\n• Ropa demasiado ceñida que marca la delgadez extrema\n• Prendas largas sin estructura (hacen ver más delgado)\n• Pantalones muy anchos sin volumen arriba (desequilibran)\n• Evitar monocromático total en colores oscuros\n• Cuellos en V muy pronunciados sin capa encima",
    accesorios: "💡 Accesorios recomendados:\n• Cinturones anchos para marcar la cintura\n• Relojes grandes con correa de cuero\n• Mochilas y bolsos con volumen\n• Gorras estructuradas (baseball caps)\n• Bufandas gruesas enrolladas",
  },
  mesomorfo: {
    siluetas: "Tu cuerpo ya está bien proporcionado — el objetivo es resaltarlo sin exagerarlo.\n• Cortes slim-fit (no ajustado) que sigan la forma\n• Camisas entalladas con un poco de holgura en el pecho\n• Pantalones de corte recto o slim, largo perfecto sobre el zapato\n• Evitar prendas oversized que oculten la figura\n• Cualquier silueta funciona — eres el lienzo perfecto",
    prendas:  "🛒 Lista de compras prioritaria:\n1. Camisas slim-fit en popelín blanco y azul claro\n2. Jeans slim de índigo oscuro\n3. Blazer sport en gris o navy\n4. Polo de piqué para casual elegante\n5. Pantalón de vestir en gris marengo\n6. Camiseta básica premium en varios colores neutros\n7. Chino en distintos tonos (beige, verde oliva, burdeos)\n8. Zapatillas blancas limpias estilo tennis",
    errores:  "❌ Errores frecuentes:\n• Ropa demasiado ajustada que se ve forzada\n• Camisetas muy cortas que suben al moverse\n• Pantalones de tiro muy bajo\n• Exceso de logos y estampados grandes\n• Descuidar el largo de los pantalones",
    accesorios: "💡 Accesorios recomendados:\n• Cinturón de cuero delgado a juego con los zapatos\n• Reloj clásico de acero\n• Bolso de mano o maletín slim\n• Gafas de sol de montura media\n• Calcetines de calidad visibles con loafers",
  },
  endomorfo: {
    siluetas: "El objetivo es estilizar y alargar la figura visualmente.\n• Cortes verticales que guíen el ojo de arriba a abajo\n• Prendas con estructura (no pegadas, no demasiado sueltas)\n• Monócromos o tonos similares arriba y abajo\n• Cuellos en V que alargan el torso\n• Pantalones de tiro medio-alto que definen la cintura\n• Evitar prendas con detalle horizontal en la zona media",
    prendas:  "🛒 Lista de compras prioritaria:\n1. Camisa de botones en corte recto (no entallada)\n2. Pantalón de tiro medio en color oscuro\n3. Blazer con solapas en V y apertura central\n4. Jeans oscuros de corte recto\n5. Jersey fino de cuello en V en colores neutros\n6. Chaqueta larga tipo abrigo que cae recto\n7. Zapato o zapatilla de silueta limpia\n8. Camiseta interior de calidad que no se transparente",
    errores:  "❌ Errores frecuentes:\n• Ropa muy pegada en la zona abdominal\n• Estampados muy grandes centrados en el torso\n• Cinturones muy anchos en la cintura natural\n• Camisas por fuera sin estructura\n• Pantalones de tiro bajo (crean efecto muffin top)",
    accesorios: "💡 Accesorios recomendados:\n• Cinturón del mismo color que el pantalón\n• Relojes de tamaño medio\n• Bolsos en colores neutros\n• Pañuelo de bolsillo en el blazer (alarga la línea del torso)\n• Zapatos en colores oscuros (alargan la pierna)",
  },
  triangulo: {
    siluetas: "Objetivo: equilibrar caderas anchas con hombros y torso visualmente más anchos.\n• Detalle y volumen en la parte SUPERIOR\n• Prendas oscuras y sin detalle en la parte inferior\n• Escotes en barco, hombros caídos o con volumen\n• Faldas y pantalones en A-line o rectos, sin bolsillos laterales\n• Blazers estructurados con hombreras",
    prendas:  "🛒 Lista de compras prioritaria:\n1. Blusas/camisas con detalle en hombros o cuello\n2. Blazer con hombros estructurados\n3. Pantalón recto o slim en negro o azul oscuro\n4. Falda recta midi en color oscuro\n5. Top con cuello bote o cuello bardot\n6. Jersey con cuello en barco\n7. Jeans oscuros de corte recto sin bolsillos traseros grandes\n8. Zapatos/botas con detalle (compensan visualmente)",
    errores:  "❌ Errores frecuentes:\n• Pantalones con bolsillos laterales grandes\n• Estampados llamativos en caderas y muslos\n• Faldas con volumen o fruncidos en la cadera\n• Colores brillantes abajo y oscuros arriba (efecto contrario)\n• Cinturones muy anchos en la cadera",
    accesorios: "💡 Accesorios recomendados:\n• Collares llamativos y aretes grandes (dirigen mirada arriba)\n• Bolsos al hombro o cruzados a la altura del torso\n• Pañuelos anudados al cuello\n• Sombreros de ala ancha\n• Anillos y pulseras llamativas",
  },
  invertido: {
    siluetas: "Objetivo: añadir volumen a caderas y piernas, suavizar hombros.\n• Detalle y volumen en la parte INFERIOR\n• Prendas oscuras sin adorno en hombros y pecho\n• Escotes en V o redondo profundo que suavizan\n• Faldas y pantalones con vuelo, bolsillos o fruncidos\n• Evitar prendas con hombreras",
    prendas:  "🛒 Lista de compras prioritaria:\n1. Pantalón wide-leg o palazzo\n2. Falda midi con vuelo o pliegues\n3. Jeans bootcut o flare\n4. Camiseta o blusa lisa en colores neutros oscuros\n5. Cardigan largo fino\n6. Vestido con vuelo desde la cintura\n7. Zapatos con volumen: cuña, plataforma o bota larga\n8. Cinturón fino para marcar la cintura",
    errores:  "❌ Errores frecuentes:\n• Hombreras o mangas con volumen\n• Escotes en barca demasiado horizontales\n• Pantalones slim que accentúan el desequilibrio\n• Rayas horizontales en hombros y pecho\n• Mochilas y bolsos grandes a la espalda",
    accesorios: "💡 Accesorios recomendados:\n• Cinturón fino o medio para marcar cintura\n• Bolsos de mano o clutch\n• Pendientes pequeños y sutiles\n• Anillos y pulseras\n• Zapatos con detalle visible",
  },
  rectangulo: {
    siluetas: "Objetivo: crear la ilusión de cintura y curvas.\n• Prendas que entallen en la cintura\n• Capas y texturas para dar dimensión\n• Faldas y pantalones con detalle en cadera\n• Cinturas elásticas o cinturones que marquen\n• Crop tops con pantalón de tiro alto",
    prendas:  "🛒 Lista de compras prioritaria:\n1. Vestido o blusa con cintura elástica o lazada\n2. Pantalón de tiro alto con cinturón\n3. Falda lápiz o con peplum\n4. Cardigan entallado con botones\n5. Jumpsuit ajustado en la cintura\n6. Blusa con frunce o drapeado central\n7. Jeans de tiro alto con bolsillos traseros con detalle\n8. Top corto (crop) combinado con pantalón de tiro alto",
    errores:  "❌ Errores frecuentes:\n• Prendas completamente rectas sin definición\n• Ropa muy holgada de arriba a abajo\n• Pantalones de tiro bajo\n• Evitar líneas verticales muy marcadas (pueden enfatizar la rectitud)\n• Camisas por fuera largas sin cinturón",
    accesorios: "💡 Accesorios recomendados:\n• Cinturones anchos o medianos en la cintura natural\n• Bolsos con estructura y ángulos\n• Collares y aretes llamativos\n• Fajines decorativos\n• Zapatos de tacón o cuña (alargan y curvan)",
  },
  reloj_arena: {
    siluetas: "Tu figura es la más versátil — el objetivo es resaltarla sin ocultarla.\n• Ropa que siga la curva natural del cuerpo\n• Cortes entallados o semi-entallados\n• Vestidos y faldas wrap (cruzados) son perfectos\n• Pantalones de tiro alto para resaltar la cintura\n• Evitar oversized que oculte la silueta",
    prendas:  "🛒 Lista de compras prioritaria:\n1. Vestido wrap en cualquier color\n2. Jeans skinny o straight de tiro alto\n3. Blusa entallada con escote en V\n4. Falda lápiz midi\n5. Blazer entallado con un botón\n6. Body o camiseta ajustada como base\n7. Vestido midi ajustado con escote moderado\n8. Pantalón wide-leg de tiro muy alto",
    errores:  "❌ Errores frecuentes:\n• Prendas completamente sueltas sin definición (ocultan la figura)\n• Pantalones de tiro bajo que cortan la cintura\n• Ropa demasiado ajustada que no permite movimiento\n• Demasiado volumen en zonas ya generosas\n• Ignorar el ajuste — la talla perfecta es clave",
    accesorios: "💡 Accesorios recomendados:\n• Cinturón delgado para remarcar la cintura\n• Todos los estilos de bolsos funcionan\n• Collares llamativos y pendientes colgantes\n• Cinturón de cadena dorada\n• Cualquier tipo de calzado sienta bien",
  },
};

// ── Consejos por altura ───────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function heightAdvice(cm: number, gender: string): string {
  if (cm < 163) {
    return `Para tu estatura (${cm}cm) hay trucos clave:\n• Monocromático de pies a cabeza para parecer más alto/a\n• Pantalones de tiro alto siempre\n• Zapatos del mismo tono que el pantalón (alarga la pierna)\n• Evita cortes midi que corten la pierna por la mitad\n• Rayas verticales sutiles son tus aliadas\n• Ropa bien ajustada — nada demasiado largo ni ancho`;
  }
  if (cm < 178) {
    return `Tu estatura media (${cm}cm) es la más versátil — casi todo funciona.\n• Puedes usar cualquier largo de prenda\n• Los cortes midi y maxi quedan perfectos\n• Experimenta con proporciones: oversized arriba + ajustado abajo\n• Aprovecha todos los estilos de calzado`;
  }
  return `Tu altura (${cm}cm) te da una ventaja enorme para la moda.\n• Los largos maxi y midi te sientan espectacularmente\n• Puedes usar oversized sin perder presencia\n• Pantalones de tiro bajo también funcionan\n• Las rayas horizontales no son un problema\n• Aprovecha prendas con detalle vertical para enfatizar la altura`;
}

// ── Generador de recomendación local ─────────────────────────────────────────

function generateLocalReco(profile: UserStyleProfile): Record<string, string> {
  const tone    = SKIN_COLOR_MAP[profile.skinTone];
  const body    = BODY_STYLE_MAP[profile.bodyType];
  const toneLabel = SKIN_TONES.find((t) => t.value === profile.skinTone)?.label ?? "";
  const bodyLabel = BODY_TYPES.find((b) => b.value === profile.bodyType)?.label ?? "";
  const genderLabel = GENDERS.find((g) => g.value === profile.gender)?.label ?? "";

  const preferenceNote = profile.preferences
    ? `\n\n📝 Teniendo en cuenta tus preferencias ("${profile.preferences}"), prioriza los colores e items que encajen con ese estilo.`
    : "";

  return {
    colores_ideales:
      `Para tu piel ${toneLabel}, estos colores te harán brillar:\n\n` +
      tone.ideal.map((c, i) => `${i + 1}. ${c.charAt(0).toUpperCase() + c.slice(1)}`).join("\n") +
      `\n\nNeutrales que siempre combinan: ${tone.neutrals.join(", ")}.\n` +
      `Estos colores crean armonía con tu subtono de piel y hacen que tu cara luzca luminosa y descansada.` +
      preferenceNote,

    colores_evitar:
      `Estos colores pueden apagar tu tono ${toneLabel}:\n\n` +
      tone.avoid.map((c, i) => `${i + 1}. ${c.charAt(0).toUpperCase() + c.slice(1)}`).join("\n") +
      `\n\nNo son prohibidos, pero si los usas combínalos con uno de tus colores ideales como accesorio o capa encima para equilibrar.`,

    siluetas_prendas:
      `Para cuerpo ${bodyLabel} (${profile.heightCm}cm):\n\n` +
      body.siluetas +
      `\n\n` +
      heightAdvice(profile.heightCm, profile.gender),

    prendas_comprar:
      body.prendas +
      `\n\n🎨 En tus colores: ${tone.ideal.slice(0, 4).join(", ")} y los neutros ${tone.neutrals.join(", ")}.`,

    errores_comunes: body.errores,

    accesorios: body.accesorios,

    consejo_personal:
      `${genderLabel} de ${profile.age} años con tono ${toneLabel} y cuerpo ${bodyLabel}: tienes todos los elementos para crear un estilo que refleje exactamente quién eres.\n\n` +
      `La moda no se trata de seguir reglas al pie de la letra, sino de entender qué herramientas visuales te favorecen para usarlas conscientemente. Con los colores que iluminan tu piel y los cortes que equilibran tu silueta, cada vez que te vistas estarás tomando decisiones de poder, no de azar.\n\n` +
      `Empieza con 2-3 prendas básicas de tu lista en tus colores ideales — una inversión pequeña con un impacto enorme en cómo te ves y cómo te sientes. 🌟`,
  };
}

// ── Wrapper para mantener compatibilidad con el resto del código ──────────────

async function generateRecommendations(
  profile: UserStyleProfile,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _signal?: AbortSignal
): Promise<Record<string, string>> {
  // Pequeño delay para que el UI de "calculando" se muestre brevemente
  await new Promise((r) => setTimeout(r, 800));
  return generateLocalReco(profile);
}

const RECO_SECTIONS = [
  { key: "colores_ideales",    title: "Colores que te favorecen",     emoji: "🎨" },
  { key: "colores_evitar",     title: "Colores a evitar",             emoji: "🚫" },
  { key: "siluetas_prendas",   title: "Siluetas y cortes ideales",    emoji: "✂️" },
  { key: "prendas_comprar",    title: "Prendas específicas a comprar",emoji: "🛍️" },
  { key: "errores_comunes",    title: "Errores comunes a evitar",     emoji: "⚠️" },
  { key: "accesorios",         title: "Accesorios y complementos",    emoji: "💎" },
  { key: "consejo_personal",   title: "Consejo personal del estilista",emoji: "✨" },
];

// ─── Profile Form ─────────────────────────────────────────────────────────────

const ProfileForm: React.FC<{
  initial: UserStyleProfile | null;
  onSubmit: (p: UserStyleProfile) => void;
}> = ({ initial, onSubmit }) => {
  const [skinTone,    setSkinTone]    = useState<SkinTone>(initial?.skinTone    ?? "medio");
  const [bodyType,    setBodyType]    = useState<BodyType>(initial?.bodyType    ?? "mesomorfo");
  const [heightCm,    setHeightCm]    = useState(initial?.heightCm    ?? 170);
  const [gender,      setGender]      = useState<"hombre"|"mujer"|"no_binario">(initial?.gender ?? "hombre");
  const [age,         setAge]         = useState(initial?.age         ?? 25);
  const [preferences, setPreferences] = useState(initial?.preferences ?? "");
  const [step,        setStep]        = useState(0); // 0=basic 1=body 2=prefs


  const handleNext = () => {
    if (step < 2) { setStep((s) => s + 1); return; }
    onSubmit({ skinTone, bodyType, heightCm, gender, age, preferences });
  };

  return (
    <div className="px-4 pt-4 pb-24">

      {/* Progress bar */}
      <div className="flex gap-1.5 mb-6 animate-fade-up">
        {[0,1,2].map((i) => (
          <div key={i} className="flex-1 h-1 rounded-full overflow-hidden"
               style={{ background:"rgba(255,255,255,0.08)" }}>
            <div className="h-full rounded-full"
                 style={{
                   background:"linear-gradient(90deg,#667eea,#764ba2)",
                   width: i <= step ? "100%" : "0%",
                   transition:"width 0.35s ease",
                 }} />
          </div>
        ))}
      </div>

      {/* ── Step 0: Basic info ── */}
      {step === 0 && (
        <div className="animate-fade-up">
          <h2 className="text-xl font-bold text-white mb-1">Tu perfil básico</h2>
          <p className="text-sm mb-6" style={{ color:"rgba(255,255,255,0.45)" }}>
            Información para personalizar tus recomendaciones
          </p>

          {/* Gender */}
          <div className="mb-5">
            <label className="text-xs font-semibold uppercase tracking-wider mb-3 block"
                   style={{ color:"rgba(255,255,255,0.4)" }}>Género</label>
            <div className="flex gap-2">
              {GENDERS.map((g) => (
                <button key={g.value} onClick={() => setGender(g.value)}
                        className="option-btn flex-1 flex flex-col items-center py-3 rounded-2xl"
                        style={{
                          background: gender===g.value ? "rgba(102,126,234,0.2)" : "rgba(255,255,255,0.04)",
                          border:`1px solid ${gender===g.value ? "rgba(102,126,234,0.5)" : "rgba(255,255,255,0.08)"}`,
                        }}>
                  <span className="text-2xl mb-1">{g.emoji}</span>
                  <span className="text-xs font-medium"
                        style={{ color:gender===g.value?"#a5b4fc":"rgba(255,255,255,0.5)" }}>
                    {g.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Skin tone */}
          <div className="mb-5">
            <label className="text-xs font-semibold uppercase tracking-wider mb-3 block"
                   style={{ color:"rgba(255,255,255,0.4)" }}>
              Tono de piel
            </label>
            <div className="flex gap-2 flex-wrap">
              {SKIN_TONES.map((t) => (
                <button key={t.value} onClick={() => setSkinTone(t.value)}
                        className="option-btn flex flex-col items-center gap-1.5">
                  <div className="w-9 h-9 rounded-full"
                       style={{
                         backgroundColor: t.hex,
                         border: skinTone===t.value ? "3px solid #667eea" : "2px solid rgba(255,255,255,0.15)",
                         boxShadow: skinTone===t.value ? "0 0 0 3px rgba(102,126,234,0.3)" : "none",
                         transition:"all 0.2s",
                       }} />
                  <span className="text-[9px]"
                        style={{ color: skinTone===t.value ? "#a5b4fc" : "rgba(255,255,255,0.35)" }}>
                    {t.label.split(" ")[0]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Age */}
          <div className="mb-5">
            <label className="text-xs font-semibold uppercase tracking-wider mb-3 block"
                   style={{ color:"rgba(255,255,255,0.4)" }}>
              Edad: <span className="text-white font-bold">{age} años</span>
            </label>
            <input type="range" min={15} max={80} value={age}
                   onChange={(e)=>setAge(Number(e.target.value))}
                   className="height-slider" />
          </div>
        </div>
      )}

      {/* ── Step 1: Body ── */}
      {step === 1 && (
        <div className="animate-fade-up">
          <h2 className="text-xl font-bold text-white mb-1">Tu cuerpo</h2>
          <p className="text-sm mb-6" style={{ color:"rgba(255,255,255,0.45)" }}>
            Sé honesto/a — esto es confidencial y solo mejora tus recomendaciones
          </p>

          {/* Height */}
          <div className="mb-6">
            <label className="text-xs font-semibold uppercase tracking-wider mb-3 block"
                   style={{ color:"rgba(255,255,255,0.4)" }}>
              Altura:{" "}
              <span className="text-white font-bold">{heightCm} cm</span>
              <span className="ml-2 text-[10px]" style={{ color:"rgba(255,255,255,0.35)" }}>
                ({heightCm < 160 ? "baja" : heightCm < 175 ? "media" : "alta"} estatura)
              </span>
            </label>
            <input type="range" min={140} max={210} value={heightCm}
                   onChange={(e)=>setHeightCm(Number(e.target.value))}
                   className="height-slider" />
            <div className="flex justify-between mt-1">
              <span className="text-[10px]" style={{ color:"rgba(255,255,255,0.25)" }}>140 cm</span>
              <span className="text-[10px]" style={{ color:"rgba(255,255,255,0.25)" }}>210 cm</span>
            </div>
          </div>

          {/* Body type */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider mb-3 block"
                   style={{ color:"rgba(255,255,255,0.4)" }}>Tipo de cuerpo / contextura</label>
            <div className="space-y-2">
              {BODY_TYPES.map((b) => (
                <button key={b.value} onClick={() => setBodyType(b.value)}
                        className="option-btn w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left"
                        style={{
                          background: bodyType===b.value ? "rgba(102,126,234,0.18)" : "rgba(255,255,255,0.04)",
                          border:`1px solid ${bodyType===b.value ? "rgba(102,126,234,0.5)" : "rgba(255,255,255,0.08)"}`,
                        }}>
                  <span className="text-xl flex-shrink-0">{b.emoji}</span>
                  <div>
                    <p className="text-sm font-semibold"
                       style={{ color:bodyType===b.value?"#a5b4fc":"white" }}>{b.label}</p>
                    <p className="text-[11px]" style={{ color:"rgba(255,255,255,0.4)" }}>{b.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Step 2: Preferences ── */}
      {step === 2 && (
        <div className="animate-fade-up">
          <h2 className="text-xl font-bold text-white mb-1">Tus preferencias</h2>
          <p className="text-sm mb-6" style={{ color:"rgba(255,255,255,0.45)" }}>
            Cuéntale al estilista qué te gusta y qué no
          </p>

          <label className="text-xs font-semibold uppercase tracking-wider mb-3 block"
                 style={{ color:"rgba(255,255,255,0.4)" }}>
            ¿Qué estilo te gusta? ¿Qué evitas?
          </label>
          <textarea
            className="text-field mb-4"
            rows={5}
            placeholder={"Ej: Me gusta el estilo casual pero quiero verme bien en el trabajo. Odio los estampados muy llamativos. Me interesan marcas como Zara y H&M. Tengo presupuesto medio..."}
            value={preferences}
            onChange={(e) => setPreferences(e.target.value)}
            maxLength={500}
          />
          <p className="text-[11px]" style={{ color:"rgba(255,255,255,0.25)" }}>
            {preferences.length}/500 caracteres
          </p>

          {/* Profile summary */}
          <div className="mt-5 p-4 rounded-2xl"
               style={{ background:"rgba(102,126,234,0.1)", border:"1px solid rgba(102,126,234,0.2)" }}>
            <p className="text-xs font-bold text-white mb-2">Tu perfil completo:</p>
            <div className="space-y-1">
              {[
                ["Género",        GENDERS.find((g)=>g.value===gender)?.label],
                ["Edad",          `${age} años`],
                ["Altura",        `${heightCm} cm`],
                ["Tono de piel",  SKIN_TONES.find((t)=>t.value===skinTone)?.label],
                ["Tipo de cuerpo",BODY_TYPES.find((b)=>b.value===bodyType)?.label],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-xs" style={{ color:"rgba(255,255,255,0.45)" }}>{k}</span>
                  <span className="text-xs font-semibold text-white">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="fixed bottom-0 left-0 right-0 px-4 pb-8 pt-4"
           style={{ background:"linear-gradient(to top,#0f0c29 70%,transparent)", zIndex:50 }}>
        <div className="flex gap-3 max-w-[480px] mx-auto">
          {step > 0 && (
            <button onClick={() => setStep((s)=>s-1)}
                    className="btn-tap px-5 py-3.5 rounded-2xl text-sm font-medium"
                    style={{ background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.1)", color:"rgba(255,255,255,0.7)" }}>
              Atrás
            </button>
          )}
          <button onClick={handleNext}
                  className="btn-tap flex-1 py-3.5 rounded-2xl text-sm font-semibold text-white flex items-center justify-center gap-2"
                  style={{
                    background:"linear-gradient(135deg,#667eea,#764ba2)",
                    boxShadow:"0 6px 18px rgba(102,126,234,0.4)",
                  }}>
            {step < 2 ? (
              <>Siguiente <ChevronRight size={16} /></>
            ) : (
              <><Wand2 size={16} /> Generar recomendaciones</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Recommendation view ──────────────────────────────────────────────────────

const RecommendationView: React.FC<{
  reco:      StyleRecommendation;
  streaming: boolean;
  onReset:   () => void;
  onRefresh: () => void;
}> = ({ reco, streaming, onReset, onRefresh }) => {
  const profile    = reco.profile;
  const toneInfo   = SKIN_TONES.find((t) => t.value === profile.skinTone);
  const bodyInfo   = BODY_TYPES.find((b) => b.value === profile.bodyType);
  const genderInfo = GENDERS.find((g)    => g.value === profile.gender);

  return (
    <div className="px-4 pt-4 pb-24">

      {/* Profile pill */}
      <div className="flex items-center gap-3 mb-5 animate-fade-up">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
             style={{ background:"rgba(102,126,234,0.15)", border:"1px solid rgba(102,126,234,0.2)" }}>
          <span className="text-lg">{genderInfo?.emoji}</span>
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-white">
            {genderInfo?.label} · {profile.age} años · {profile.heightCm}cm
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor:toneInfo?.hex }} />
            <span className="text-xs" style={{ color:"rgba(255,255,255,0.45)" }}>
              {toneInfo?.label} · {bodyInfo?.label}
            </span>
          </div>
        </div>
        <button onClick={onRefresh} className="btn-tap p-2"
                title="Regenerar recomendaciones">
          <RefreshCw size={18} style={{ color:"rgba(255,255,255,0.5)" }} />
        </button>
      </div>

      {/* Title */}
      <div className="mb-5 animate-fade-up" style={{ animationDelay:"0.05s" }}>
        <h1 className="text-2xl font-bold text-white leading-tight">
          Tu guía de{" "}
          <span className="shimmer-text">estilo personal</span>
        </h1>
        <p className="text-xs mt-1" style={{ color:"rgba(255,255,255,0.4)" }}>
          Generado por IA · {new Date(reco.generatedAt).toLocaleDateString("es-CO",{day:"numeric",month:"long"})}
        </p>
      </div>

      {/* Sections */}
      {reco.sections.map((section, i) => (
        <div key={section.title}
             className={`reco-section animate-fade-up`}
             style={{ animationDelay:`${0.08 + i * 0.04}s` }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">{section.emoji}</span>
            <h3 className="text-sm font-bold text-white">{section.title}</h3>
          </div>
          <p className={`reco-content ${streaming && i === reco.sections.length - 1 ? "streaming-cursor" : ""}`}>
            {section.content}
          </p>
        </div>
      ))}

      {streaming && (
        <div className="flex items-center gap-2 py-4 animate-fade-in">
          <div className="w-4 h-4 rounded-full border-2 border-indigo-400 border-t-transparent"
               style={{ animation:"spin 0.8s linear infinite" }} />
          <p className="text-xs" style={{ color:"rgba(255,255,255,0.45)" }}>
            Generando recomendaciones...
          </p>
        </div>
      )}

      {/* Bottom actions */}
      <div className="fixed bottom-0 left-0 right-0 px-4 pb-8 pt-4"
           style={{ background:"linear-gradient(to top,#0f0c29 70%,transparent)", zIndex:50 }}>
        <div className="flex gap-3 max-w-[480px] mx-auto">
          <button onClick={onReset}
                  className="btn-tap px-5 py-3.5 rounded-2xl text-sm font-medium"
                  style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", color:"rgba(255,255,255,0.6)" }}>
            <User size={16} />
          </button>
          <button
            onClick={() => {
              const text = reco.sections.map((s)=>`${s.emoji} ${s.title}\n${s.content}`).join("\n\n");
              navigator.clipboard?.writeText(text).then(()=>alert("Copiado al portapapeles"));
            }}
            className="btn-tap flex-1 py-3.5 rounded-2xl text-sm font-semibold text-white flex items-center justify-center gap-2"
            style={{
              background:"linear-gradient(135deg,#667eea,#764ba2)",
              boxShadow:"0 6px 18px rgba(102,126,234,0.4)",
            }}>
            <Save size={16} />
            Copiar guía completa
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const StyleAdvisor: React.FC = () => {
  const [profile,     setProfile]     = useState<UserStyleProfile | null>(loadProfile);
  const [reco,        setReco]        = useState<StyleRecommendation | null>(loadLastReco);
  const [streaming,   setStreaming]    = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [showForm,    setShowForm]    = useState(!loadProfile());
  const abortRef = useRef<AbortController | null>(null);

  // If we have both a profile and a cached reco for that profile — show it directly
  useEffect(() => {
    if (profile && !reco) generateReco(profile);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generateReco = async (p: UserStyleProfile) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setStreaming(true);
    setError(null);

    // Build placeholder sections immediately so UI shows progress
    const placeholders: RecommendationSection[] = RECO_SECTIONS.map((s) => ({
      title:   s.title,
      emoji:   s.emoji,
      content: "",
    }));
    const draft: StyleRecommendation = {
      profile:     p,
      generatedAt: new Date().toISOString(),
      sections:    placeholders,
    };
    setReco(draft);
    setShowForm(false);

    try {
      // ── Motor local — sin APIs, sin keys, instantáneo ──────────────────────
      const parsed = await generateRecommendations(p, abortRef.current.signal);

      const sections: RecommendationSection[] = RECO_SECTIONS.map((s) => ({
        title:   s.title,
        emoji:   s.emoji,
        content: parsed[s.key] ?? "No disponible.",
      }));

      const finalReco: StyleRecommendation = {
        profile:     p,
        generatedAt: new Date().toISOString(),
        sections,
      };

      setReco(finalReco);
      saveLastReco(finalReco);
    } catch (err: unknown) {
      if ((err as Error).name === "AbortError") return;
      setError("Error generando recomendaciones. Intenta de nuevo.");
    } finally {
      setStreaming(false);
    }
  };

  const handleProfileSubmit = (p: UserStyleProfile) => {
    saveProfile(p);
    setProfile(p);
    generateReco(p);
  };

  const handleReset = () => {
    setShowForm(true);
    setReco(null);
  };

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
            <ShoppingBag size={17} style={{ color:"#a5b4fc" }} />
            <span className="text-base font-bold text-white">Asesor de Estilo</span>
          </div>
          {profile && !showForm && (
            <div slot="end" className="pr-3">
              <button onClick={handleReset} className="btn-tap p-2">
                <User size={18} style={{ color:"rgba(255,255,255,0.5)" }} />
              </button>
            </div>
          )}
        </IonToolbar>
      </IonHeader>

      <IonContent style={{ "--background":"#0f0c29" } as React.CSSProperties}>
        <div className="min-h-full"
             style={{ background:"linear-gradient(160deg,#0f0c29 0%,#302b63 60%,#24243e 100%)" }}>

          {error && (
            <div className="mx-4 mt-4 p-4 rounded-2xl animate-fade-in"
                 style={{ background:"rgba(239,68,68,0.12)", border:"1px solid rgba(239,68,68,0.3)" }}>
              <p className="text-sm" style={{ color:"#fca5a5" }}>{error}</p>
              <button onClick={() => profile && generateReco(profile)}
                      className="btn-tap mt-2 text-xs font-bold" style={{ color:"#f87171" }}>
                Reintentar
              </button>
            </div>
          )}

          {showForm ? (
            <ProfileForm initial={profile} onSubmit={handleProfileSubmit} />
          ) : reco ? (
            <RecommendationView
              reco={reco}
              streaming={streaming}
              onReset={handleReset}
              onRefresh={() => profile && generateReco(profile)}
            />
          ) : (
            <div className="flex items-center justify-center min-h-64">
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 rounded-full border-2 border-indigo-400 border-t-transparent"
                     style={{ animation:"spin 0.8s linear infinite" }} />
                <p className="text-sm" style={{ color:"rgba(255,255,255,0.45)" }}>
                  Preparando tu asesor...
                </p>
              </div>
            </div>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
};