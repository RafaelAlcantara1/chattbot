import React, { useState } from 'react';
import './Login.css';

function Login() {
  const [nome, setNome] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Simular delay de processamento
    setTimeout(() => {
      alert('Login de administrador (somente UI). Função será habilitada futuramente.');
      setLoading(false);
    }, 500);
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <header className="login-header">
          <div className="login-avatar">
            <span>🔐</span>
          </div>
          <h1>Painel do Administrador</h1>
          <p className="login-subtitle">Acesso restrito</p>
        </header>
        <form className="login-form" onSubmit={handleSubmit}>
          <p className="admin-note">Faça login para continuar</p>

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
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
        <footer className="login-footer">
          <a href="/" className="login-link">← Voltar ao chat</a>
        </footer>
      </div>
    </div>
  );
}

export default Login;

