import React, { useState, useEffect } from 'react';
import Chatbot from './components/Chatbot';
import Login from './components/Login';
import AdminPanel from './components/AdminPanel';
import './index.css';

function App() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Monitorar status da conexão
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const pathname = window.location.pathname;

  return (
    <div className="App">
      {!isOnline && (
        <div className="offline-notification">
          Você está offline. Algumas funcionalidades podem estar indisponíveis.
        </div>
      )}
      {pathname !== '/login' && pathname !== '/admin' && (
        <a href="/login" className="admin-access-button">Administrador</a>
      )}
      {pathname === '/login' ? (
        <Login />
      ) : pathname === '/admin' ? (
        <AdminPanel />
      ) : (
        <Chatbot />
      )}
    </div>
  );
}

export default App;