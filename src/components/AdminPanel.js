import React, { useState, useEffect } from 'react';
import './AdminPanel.css';

const API_BASE_URL = 'https://mega-chef-api.onrender.com';

const AdminPanel = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Estados para personalidade
  const [personality, setPersonality] = useState('');
  const [isSavingPersonality, setIsSavingPersonality] = useState(false);
  
  // Estados para configurações
  const [botAvatar, setBotAvatar] = useState('🍳');
  const [botBackground, setBotBackground] = useState('default');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  
  // Emojis de animais disponíveis
  const animalEmojis = [
    '🍳', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁',
    '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🦆', '🦅', '🦉', '🐺',
    '🐶', '🐱', '🐴', '🦄', '🐝', '🦋', '🐢', '🐍', '🦎', '🐙'
  ];
  
  // Fundos disponíveis
  const backgrounds = [
    { id: 'default', name: 'Padrão (Rosa)', gradient: 'linear-gradient(135deg, #FFB6D9 0%, #FF69B4 50%, #FF1493 100%)' },
    { id: 'gradient1', name: 'Gradiente Azul', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
    { id: 'gradient2', name: 'Gradiente Verde', gradient: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' },
    { id: 'gradient3', name: 'Gradiente Laranja', gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
    { id: 'gradient4', name: 'Gradiente Roxo', gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
    { id: 'solid1', name: 'Sólido Rosa', gradient: 'linear-gradient(135deg, #FF69B4 0%, #FF69B4 100%)' },
    { id: 'solid2', name: 'Sólido Azul', gradient: 'linear-gradient(135deg, #667eea 0%, #667eea 100%)' }
  ];
  
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('authToken');
      const savedUser = localStorage.getItem('user');
      
      if (!token || !savedUser) {
        window.location.href = '/login';
        return;
      }
      
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);
        
        // Verificar se é admin
        if (!userData.isAdmin) {
          setError('Acesso negado. Apenas administradores podem acessar este painel.');
          setLoading(false);
          return;
        }
        
        // Carregar personalidade global
        const personalityRes = await fetch(`${API_BASE_URL}/api/personality/global`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (personalityRes.ok) {
          const personalityData = await personalityRes.json();
          setPersonality(personalityData.personality);
        }
        
        // Carregar configurações
        const settingsRes = await fetch(`${API_BASE_URL}/api/settings`);
        if (settingsRes.ok) {
          const settingsData = await settingsRes.json();
          setBotAvatar(settingsData.botAvatar || '🍳');
          setBotBackground(settingsData.botBackground || 'default');
        }
        
        setLoading(false);
      } catch (e) {
        console.error('Erro ao carregar dados:', e);
        setError('Erro ao carregar dados do painel.');
        setLoading(false);
      }
    };
    
    checkAuth();
  }, []);
  
  const handleSavePersonality = async () => {
    const token = localStorage.getItem('authToken');
    if (!token) return;
    
    setIsSavingPersonality(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/personality/global`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ personality })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao salvar personalidade');
      }
      
      alert('Personalidade salva com sucesso!');
    } catch (e) {
      setError('Erro ao salvar personalidade: ' + e.message);
    } finally {
      setIsSavingPersonality(false);
    }
  };
  
  const handleSaveAvatar = async (emoji) => {
    const token = localStorage.getItem('authToken');
    if (!token) return;
    
    setIsSavingSettings(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/settings/botAvatar`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ value: emoji })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao salvar avatar');
      }
      
      setBotAvatar(emoji);
      alert('Avatar atualizado com sucesso!');
    } catch (e) {
      setError('Erro ao salvar avatar: ' + e.message);
    } finally {
      setIsSavingSettings(false);
    }
  };
  
  const handleSaveBackground = async (backgroundId) => {
    const token = localStorage.getItem('authToken');
    if (!token) return;
    
    setIsSavingSettings(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/settings/botBackground`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ value: backgroundId })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao salvar fundo');
      }
      
      setBotBackground(backgroundId);
      alert('Fundo atualizado com sucesso!');
    } catch (e) {
      setError('Erro ao salvar fundo: ' + e.message);
    } finally {
      setIsSavingSettings(false);
    }
  };
  
  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    window.location.href = '/';
  };
  
  if (loading) {
    return (
      <div className="admin-loading">
        <div className="admin-loader">Carregando...</div>
      </div>
    );
  }
  
  if (error && !user) {
    return (
      <div className="admin-error">
        <div className="admin-error-card">
          <h2>Erro</h2>
          <p>{error}</p>
          <a href="/login">Fazer Login</a>
        </div>
      </div>
    );
  }
  
  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>🎛️ Painel de Administração</h1>
        <div className="admin-header-actions">
          <span className="admin-welcome">Olá, {user?.username}</span>
          <button onClick={handleLogout} className="admin-logout-btn">Sair</button>
          <a href="/" className="admin-back-btn">← Voltar ao Chat</a>
        </div>
      </div>
      
      {error && (
        <div className="admin-alert-error">
          {error}
        </div>
      )}
      
      <div className="admin-content">
        {/* Seção de Personalidade */}
        <section className="admin-section">
          <h2>📝 Personalidade do Bot</h2>
          <p className="admin-description">
            Defina como o bot se comporta e responde. Esta personalidade será usada por todos os usuários que não possuem uma personalização própria.
          </p>
          <textarea
            className="admin-textarea"
            value={personality}
            onChange={(e) => setPersonality(e.target.value)}
            placeholder="Digite as instruções de personalidade do bot..."
            rows={15}
          />
          <button
            onClick={handleSavePersonality}
            disabled={isSavingPersonality}
            className="admin-save-btn"
          >
            {isSavingPersonality ? 'Salvando...' : '💾 Salvar Personalidade'}
          </button>
        </section>
        
        {/* Seção de Avatar */}
        <section className="admin-section">
          <h2>🖼️ Avatar do Bot</h2>
          <p className="admin-description">
            Escolha o emoji que aparecerá como avatar do bot. O avatar atual é: <span className="current-avatar">{botAvatar}</span>
          </p>
          <div className="emoji-grid">
            {animalEmojis.map((emoji) => (
              <button
                key={emoji}
                className={`emoji-btn ${botAvatar === emoji ? 'selected' : ''}`}
                onClick={() => handleSaveAvatar(emoji)}
                disabled={isSavingSettings}
                title={`Usar ${emoji} como avatar`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </section>
        
        {/* Seção de Fundo */}
        <section className="admin-section">
          <h2>🎨 Fundo da Página</h2>
          <p className="admin-description">
            Escolha o fundo que será exibido na página do chat. O fundo atual está destacado.
          </p>
          <div className="background-grid">
            {backgrounds.map((bg) => (
              <div
                key={bg.id}
                className={`background-card ${botBackground === bg.id ? 'selected' : ''}`}
                onClick={() => handleSaveBackground(bg.id)}
              >
                <div
                  className="background-preview"
                  style={{ background: bg.gradient }}
                ></div>
                <p className="background-name">{bg.name}</p>
                {botBackground === bg.id && (
                  <span className="background-check">✓</span>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default AdminPanel;

