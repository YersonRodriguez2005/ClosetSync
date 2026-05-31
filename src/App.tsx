// src/App.tsx
import React, { useEffect, useState } from 'react';
import { IonApp, IonLoading, IonRouterOutlet, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { Route, Redirect } from 'react-router-dom';

// Servicios
import { initializeDB } from './database/dbService';

// Páginas
import { Dashboard } from './pages/Dashboard';
import { Closet } from './pages/Closet';
import { Studio } from './pages/Studio';
import { FittingRoom } from './pages/FittingRoom';
import { Lookbook } from './pages/Lookbook';
import { DailyOutfit } from './pages/DailyOutfit';
import { OutfitCalendar } from './pages/OutfitCalendar';
import { StyleAdvisor } from './pages/StyleAdvisor';
import { createNotificationChannels, setupNotificationTapHandler } from './services/notificationService';

// Importación de estilos base de Ionic
import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

setupIonicReact();

const App: React.FC = () => {
  const [isDbReady, setIsDbReady] = useState(false);

  useEffect(() => {
    const setupDatabase = async () => {
      createNotificationChannels();
      setupNotificationTapHandler(() => { /* handle notification tap */ });
      try {
        await initializeDB();
      } catch (err) {
        console.error("Fallo crítico inicializando los datos:", err);
      } finally {
        setIsDbReady(true);
      }
    };
    setupDatabase();
  }, []);

  return (
    <IonApp>
      {/* El Loading siempre pertenece al árbol, pero Ionic gestiona su cierre suavemente */}
      <IonLoading 
        isOpen={!isDbReady} 
        message="Preparando tu armario..." 
        spinner="crescent" 
      />

      {/* Solo montamos el enrutador cuando la base de datos ha terminado de cargar */}
      {isDbReady && (
        <IonReactRouter>
          <IonRouterOutlet>
            <Route exact path="/dashboard">
              <Dashboard />
            </Route>
            
            <Route exact path="/">
              <Redirect to="/dashboard" />
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

            <Route exact path="/daily-outfit">
              <DailyOutfit />
            </Route>

            <Route exact path="/outfit-calendar">
              <OutfitCalendar />
            </Route>

            <Route exact path="/style-advisor">
              <StyleAdvisor />
            </Route>
          </IonRouterOutlet>
        </IonReactRouter>
      )}
    </IonApp>
  );
};

export default App;