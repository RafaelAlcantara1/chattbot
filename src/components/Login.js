import React, { useState } from 'react';
import './Login.css';

function Login() {
  const [nome, setNome] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    alert('Login de administrador (somente UI). Função será habilitada futuramente.');
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <header className="login-header">
          <div className="login-avatar">CB</div>
          <h1>Acesso do Administrador</h1>
          <p className="login-subtitle">Acesso restrito</p>
        </header>
        <form className="login-form" onSubmit={handleSubmit}>
          <p className="admin-note">Login do MegaChef</p>

          <label className="login-label" htmlFor="nome">Nome</label>
          <input
            id="nome"
            type="text"
            className="login-input"
            placeholder="Seu nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
          />

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
            />
            <button
              type="button"
              className="toggle-password"
              onClick={() => setMostrarSenha(!mostrarSenha)}
              aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {mostrarSenha ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>

          <button type="submit" className="login-button">Entrar</button>
        </form>
        <footer className="login-footer">
          <a href="/" className="login-link">Voltar ao chat</a>
        </footer>
      </div>
    </div>
  );
}

export default Login;


