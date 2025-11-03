import React, { useState } from 'react';
import './Login.css';

const API_BASE_URL = 'https://mega-chef-api.onrender.com';

function Login() {
  const [nome, setNome] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isRegister, setIsRegister] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: nome, password: senha })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao fazer login');
      }

      // Salvar token e informações do usuário
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      // Redirecionar para o chat
      window.location.href = '/';
    } catch (err) {
      setError(err.message || 'Erro ao processar requisição');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <header className="login-header">
          <div className="login-avatar">
            <span>🔐</span>
          </div>
          <h1>{isRegister ? 'Criar Conta' : 'Login'}</h1>
          <p className="login-subtitle">{isRegister ? 'Crie sua conta para personalizar o bot' : 'Acesso à personalização'}</p>
        </header>
        <form className="login-form" onSubmit={handleSubmit}>
          {error && (
            <div className="login-error" style={{ 
              color: '#d32f2f', 
              backgroundColor: '#ffebee', 
              padding: '12px', 
              borderRadius: '8px', 
              marginBottom: '16px',
              fontSize: '0.9rem'
            }}>
              {error}
            </div>
          )}

          <div>
            <label className="login-label" htmlFor="nome">Nome de Usuário</label>
            <input
              id="nome"
              type="text"
              className="login-input"
              placeholder="Digite seu nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="login-label" htmlFor="senha">Senha</label>
            <div className="password-wrapper">
              <input
                id="senha"
                type={mostrarSenha ? 'text' : 'password'}
                className="login-input"
                placeholder="••••••••"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
                minLength={6}
                disabled={loading}
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setMostrarSenha(!mostrarSenha)}
                aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                disabled={loading}
              >
                {mostrarSenha ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            className="login-button"
            disabled={loading || !nome || !senha}
          >
            {loading ? (isRegister ? 'Criando...' : 'Entrando...') : (isRegister ? 'Criar Conta' : 'Entrar')}
          </button>
        </form>
        <footer className="login-footer">
          <button
            type="button"
            onClick={() => setIsRegister(!isRegister)}
            style={{
              background: 'none',
              border: 'none',
              color: '#FF1493',
              cursor: 'pointer',
              textDecoration: 'underline',
              marginBottom: '8px',
              fontSize: '0.9rem'
            }}
          >
            {isRegister ? 'Já tem conta? Faça login' : 'Não tem conta? Registre-se'}
          </button>
          <a href="/" className="login-link">← Voltar ao chat</a>
        </footer>
      </div>
    </div>
  );
}

export default Login;

