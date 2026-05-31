// src/App.tsx
import React, { useEffect, useState } from "react";
import {
  IonApp,
  IonRouterOutlet,
  setupIonicReact,
} from "@ionic/react";
import { IonReactRouter } from "@ionic/react-router";
import { Route, Redirect, useHistory } from "react-router-dom";

// Core Ionic CSS
import "@ionic/react/css/core.css";
import "@ionic/react/css/normalize.css";
import "@ionic/react/css/structure.css";
import "@ionic/react/css/typography.css";

// DB
import { initializeDB } from "./database/dbService";

// Notification service (nuestro servicio robusto)
import {
  createNotificationChannels,
  scheduleDailyOutfitNotification,
  setupNotificationTapHandler,
  isDailyNotificationEnabled,
} from "./services/notificationService";

// Pages
import { Dashboard }      from "./pages/Dashboard";
import { Closet }         from "./pages/Closet";
import { Studio }         from "./pages/Studio";
import { FittingRoom }    from "./pages/FittingRoom";
import { Lookbook }       from "./pages/Lookbook";
import { DailyOutfit }    from "./pages/DailyOutfit";
import { OutfitCalendar } from "./pages/OutfitCalendar";
import { StyleAdvisor }   from "./pages/StyleAdvisor";

setupIonicReact();

// ─── Splash / Loading Screen ──────────────────────────────────────────────────

const SPLASH_STYLES = `
  @keyframes splashFadeIn {
    from { opacity: 0; transform: scale(0.92); }
    to   { opacity: 1; transform: scale(1); }
  }
  @keyframes splashPulse {
    0%, 100% { opacity: 0.5; transform: scale(1); }
    50%       { opacity: 1;   transform: scale(1.08); }
  }
  @keyframes splashBar {
    from { width: 0%; }
    to   { width: 100%; }
  }
  @keyframes splashFadeOut {
    from { opacity: 1; }
    to   { opacity: 0; pointer-events: none; }
  }
  .splash-screen {
    position: fixed; inset: 0; z-index: 9999;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    background: linear-gradient(160deg, #0f0c29 0%, #302b63 55%, #24243e 100%);
    animation: splashFadeIn 0.5s cubic-bezier(0.22,1,0.36,1) both;
  }
  .splash-screen.hiding {
    animation: splashFadeOut 0.45s ease forwards;
  }
  .splash-icon {
    width: 88px; height: 88px;
    border-radius: 28px;
    background: linear-gradient(135deg, #667eea, #764ba2);
    display: flex; align-items: center; justify-content: center;
    font-size: 44px;
    box-shadow: 0 16px 48px rgba(102,126,234,0.5);
    margin-bottom: 20px;
    animation: splashPulse 2s ease-in-out infinite;
  }
  .splash-title {
    font-size: 28px; font-weight: 800;
    color: white; letter-spacing: -0.5px;
    margin-bottom: 4px;
  }
  .splash-subtitle {
    font-size: 13px; font-weight: 500;
    color: rgba(255,255,255,0.45);
    margin-bottom: 48px;
    letter-spacing: 0.5px;
  }
  .splash-bar-track {
    width: 160px; height: 3px; border-radius: 2px;
    background: rgba(255,255,255,0.08);
    overflow: hidden;
  }
  .splash-bar-fill {
    height: 100%; border-radius: 2px;
    background: linear-gradient(90deg, #667eea, #a5b4fc);
    animation: splashBar 1.6s cubic-bezier(0.4,0,0.2,1) forwards;
  }
  .splash-step {
    margin-top: 16px;
    font-size: 11px; font-weight: 600;
    color: rgba(255,255,255,0.3);
    letter-spacing: 0.8px;
    text-transform: uppercase;
    min-height: 16px;
    transition: opacity 0.3s ease;
  }
`;

const SplashScreen: React.FC<{ step: string; hiding: boolean }> = ({ step, hiding }) => (
  <>
    <style>{SPLASH_STYLES}</style>
    <div className={`splash-screen${hiding ? " hiding" : ""}`}>
      <div className="splash-icon">👔</div>
      <p className="splash-title">ClosetSync</p>
      <p className="splash-subtitle">Tu armario inteligente</p>
      <div className="splash-bar-track">
        <div className="splash-bar-fill" />
      </div>
      <p className="splash-step">{step}</p>
    </div>
  </>
);

// ─── Router-aware inner app (needed for tap handler navigation) ───────────────

const AppRoutes: React.FC = () => {
  const history = useHistory();

  // Register notification tap → navigate to daily outfit
  useEffect(() => {
    setupNotificationTapHandler(() => {
      history.push("/daily-outfit");
    });
  }, [history]);

  return (
    <IonRouterOutlet animated>
      {/* Root redirect */}
      <Route exact path="/">
        <Redirect to="/dashboard" />
      </Route>

      {/* Core pages */}
      <Route exact path="/dashboard">
        <Dashboard />
      </Route>
      <Route exact path="/closet">
        <Closet />
      </Route>
      <Route exact path="/studio">
        <Studio />
      </Route>
      <Route exact path="/fitting-room">
        <FittingRoom />
      </Route>
      <Route exact path="/lookbook">
        <Lookbook />
      </Route>

      {/* Feature pages */}
      <Route exact path="/daily-outfit">
        <DailyOutfit />
      </Route>
      <Route exact path="/outfit-calendar">
        <OutfitCalendar />
      </Route>
      <Route exact path="/style-advisor">
        <StyleAdvisor />
      </Route>

      {/* Catch-all — redirect unknown routes to dashboard */}
      <Route>
        <Redirect to="/dashboard" />
      </Route>
    </IonRouterOutlet>
  );
};

// ─── Root App ─────────────────────────────────────────────────────────────────

const App: React.FC = () => {
  const [isReady,  setIsReady]  = useState(false);
  const [isHiding, setIsHiding] = useState(false);
  const [stepMsg,  setStepMsg]  = useState("Iniciando...");

  useEffect(() => {
    const boot = async () => {
      try {
        // ── Step 1: SQLite / DB ─────────────────────────────────────────────
        setStepMsg("Cargando armario...");
        await initializeDB();

        // ── Step 2: Notification channel (Android only, safe on iOS/web) ───
        setStepMsg("Configurando notificaciones...");
        await createNotificationChannels();

        // ── Step 3: Schedule daily 7am notification if previously enabled ──
        // Only re-schedules if the user had it active (persisted in localStorage)
        if (isDailyNotificationEnabled()) {
          await scheduleDailyOutfitNotification();
        }

      } catch (err) {
        // Non-fatal: log and continue — app works without notifications
        console.error("[App] Boot error (non-fatal):", err);
      } finally {
        // ── Animate splash out, then unmount ────────────────────────────────
        setStepMsg("¡Listo!");
        // Small pause so "¡Listo!" is visible
        await new Promise((r) => setTimeout(r, 400));
        setIsHiding(true);
        // Wait for fade-out animation (450ms) before removing splash
        await new Promise((r) => setTimeout(r, 460));
        setIsReady(true);
      }
    };

    boot();
  }, []);

  return (
    <IonApp>
      {!isReady && <SplashScreen step={stepMsg} hiding={isHiding} />}

      <IonReactRouter>
        <AppRoutes />
      </IonReactRouter>
    </IonApp>
  );
};

export default App;