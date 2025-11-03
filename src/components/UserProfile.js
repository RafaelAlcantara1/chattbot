import React, { useState, useEffect } from 'react';
import './UserProfile.css';

const API_BASE_URL = 'https://mega-chef-api.onrender.com';

const UserProfile = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Estados para personalidade
  const [personality, setPersonality] = useState('');
  const [isSavingPersonality, setIsSavingPersonality] = useState(false);
  
  // Estados para avatar
  const [userAvatar, setUserAvatar] = useState('👤');
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);
  
  // Emojis de animais disponíveis
  const animalEmojis = [
    '👤', '🍳', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁',
    '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🦆', '🦅', '🦉', '🐺',
    '🐶', '🐱', '🐴', '🦄', '🐝', '🦋', '🐢', '🐍', '🦎', '🐙',
    '😀', '😃', '😄', '😁', '😆', '😊', '😎', '🤩', '🥳', '😋'
  ];
  
  useEffect(() => {
    const loadUserData = async () => {
      const token = localStorage.getItem('authToken');
      const savedUser = localStorage.getItem('user');
      
      if (!token || !savedUser) {
        window.location.href = '/login';
        return;
      }
      
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);
        setUserAvatar(userData.avatar || '👤');
        
        // Carregar personalidade do usuário
        const personalityRes = await fetch(`${API_BASE_URL}/api/personality`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (personalityRes.ok) {
          const personalityData = await personalityRes.json();
          setPersonality(personalityData.personality || '');
        }
        
        setLoading(false);
      } catch (e) {
        console.error('Erro ao carregar dados:', e);
        setError('Erro ao carregar dados do perfil.');
        setLoading(false);
      }
    };
    
    loadUserData();
  }, []);
  
  const handleSavePersonality = async () => {
    const token = localStorage.getItem('authToken');
    if (!token) return;
    
    setIsSavingPersonality(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/personality/user`, {
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
    
    setIsSavingAvatar(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/user/avatar`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ avatar: emoji })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao salvar avatar');
      }
      
      const data = await response.json();
      setUserAvatar(emoji);
      
      // Atualizar localStorage com novo avatar
      const updatedUser = { ...user, avatar: emoji };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      
      alert('Avatar atualizado com sucesso!');
    } catch (e) {
      setError('Erro ao salvar avatar: ' + e.message);
    } finally {
      setIsSavingAvatar(false);
    }
  };
  
  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    window.location.href = '/';
  };
  
  if (loading) {
    return (
      <div className="profile-loading">
        <div className="profile-loader">Carregando...</div>
      </div>
    );
  }
  
  if (error && !user) {
    return (
      <div className="profile-error">
        <div className="profile-error-card">
          <h2>Erro</h2>
          <p>{error}</p>
          <a href="/login">Fazer Login</a>
        </div>
      </div>
    );
  }
  
  return (
    <div className="profile-container">
      <div className="profile-header">
        <h1>👤 Meu Perfil</h1>
        <div className="profile-header-actions">
          <span className="profile-welcome">Olá, {user?.username}</span>
          <button onClick={handleLogout} className="profile-logout-btn">Sair</button>
          <a href="/" className="profile-back-btn">← Voltar ao Chat</a>
        </div>
      </div>
      
      {error && (
        <div className="profile-alert-error">
          {error}
        </div>
      )}
      
      <div className="profile-content">
        {/* Seção de Avatar */}
        <section className="profile-section">
          <h2>🖼️ Meu Avatar</h2>
          <p className="profile-description">
            Escolha o emoji que aparecerá como seu avatar nas mensagens. Seu avatar atual é: <span className="current-avatar">{userAvatar}</span>
          </p>
          <div className="emoji-grid">
            {animalEmojis.map((emoji) => (
              <button
                key={emoji}
                className={`emoji-btn ${userAvatar === emoji ? 'selected' : ''}`}
                onClick={() => handleSaveAvatar(emoji)}
                disabled={isSavingAvatar}
                title={`Usar ${emoji} como avatar`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </section>
        
        {/* Seção de Personalidade */}
        <section className="profile-section">
          <h2>📝 Personalidade do Bot para Mim</h2>
          <p className="profile-description">
            Personalize como o bot se comporta nas suas conversas. Esta personalização será usada apenas para você e sobrepõe a configuração global.
          </p>
          <textarea
            className="profile-textarea"
            value={personality}
            onChange={(e) => setPersonality(e.target.value)}
            placeholder="Digite as instruções de personalidade do bot para você..."
            rows={15}
          />
          <button
            onClick={handleSavePersonality}
            disabled={isSavingPersonality}
            className="profile-save-btn"
          >
            {isSavingPersonality ? 'Salvando...' : '💾 Salvar Personalidade'}
          </button>
        </section>
        
        {/* Seção de Informações */}
        <section className="profile-section">
          <h2>ℹ️ Informações da Conta</h2>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Nome de Usuário:</span>
              <span className="info-value">{user?.username}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Tipo de Conta:</span>
              <span className="info-value">{user?.isAdmin ? 'Administrador' : 'Usuário'}</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default UserProfile;

