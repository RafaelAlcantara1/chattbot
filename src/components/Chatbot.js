import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import ReactMarkdown from 'react-markdown';
import './Chatbot.css';
import { RxAvatar } from "react-icons/rx";
import { FiSend, FiAlertCircle } from "react-icons/fi";

// Usando variável de ambiente para API key
const API_KEY = process.env.REACT_APP_GEMINI_API_KEY || "AIzaSyC3Zzlv5are_c7qayolflfgbRI7WXISadc";
const WEATHER_API_KEY = process.env.REACT_APP_WEATHER_API_KEY || "236c471e864a13bfe824100061a58d23";
const API_BASE_URL = 'https://mega-chef-api.onrender.com';

// Constantes para configuração
const MODELO_IA = "gemini-2.0-flash";
const MAX_HISTORICO = 10; // Manter histórico maior para melhor contexto
const MENSAGEM_ERRO_API = "Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente mais tarde.";
const MENSAGEM_ERRO_REDE = "Parece que você está offline. Verifique sua conexão e tente novamente.";
const STORAGE_KEY = "megaChef_conversationHistory"; // Chave para armazenar no localStorage
const CONVERSATION_ID_KEY = "megaChef_conversationId"; // ID da conversa no backend

const CONTEXTO_INICIAL = `Você é um assistente culinário virtual chamado Mega Chef da Computaria. Seu principal objetivo é ajudar as pessoas com receitas e dicas culinárias.

Você deve:
1. Focar principalmente em ajudar com receitas, ingredientes e técnicas culinárias
2. Perguntar sobre restrições alimentares e ingredientes disponíveis
3. Oferecer sugestões de receitas baseadas nos ingredientes que a pessoa tem
4. Dar dicas de preparo e truques culinários
5. Adaptar receitas para diferentes restrições alimentares
6. Sugerir harmonizações de pratos e bebidas
7. Compartilhar dicas para melhorar habilidades culinárias

Sobre o clima e horário:
- Só forneça informações sobre o clima quando o usuário explicitamente perguntar
- Só forneça informações sobre data/hora quando o usuário explicitamente perguntar
- Use as informações do clima para sugerir receitas apropriadas
- Não inicie conversas sobre clima ou horário, foque em culinária

Mantenha um tom amigável e profissional, sempre priorizando o tema culinário.`;

const Chatbot = () => {
  // Estado para armazenar mensagens, entrada, carregamento e erros
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [genAI, setGenAI] = useState(null);
  const [weatherCity, setWeatherCity] = useState(null);
  const [userCity, setUserCity] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [supportsConversationList, setSupportsConversationList] = useState(true);
  
  // Referências para auto-rolagem e input
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  
  // Carregar/sincronizar mensagens com o backend quando o componente montar
  useEffect(() => {
    const init = async () => {
      const savedMessages = localStorage.getItem(STORAGE_KEY);
      let localMessages = [];
      if (savedMessages) {
        try {
          localMessages = JSON.parse(savedMessages);
        } catch (error) {
          console.error('Erro ao carregar mensagens salvas:', error);
          localStorage.removeItem(STORAGE_KEY);
        }
      }

      const existingId = localStorage.getItem(CONVERSATION_ID_KEY);
      try {
        if (existingId) {
          const remote = await fetch(`${API_BASE_URL}/api/conversations/${existingId}`).then(r => r.ok ? r.json() : null);
          if (remote && Array.isArray(remote.messages)) {
            const uiMessages = remote.messages.map(m => ({ text: m.text, isUser: m.role === 'user' }));
            setMessages(uiMessages);
            // carrega lista de conversas (se suportado)
            if (supportsConversationList) fetchConversations();
            return;
          }
        }
        // Se não há conversa, cria uma com as mensagens locais (se houver) convertidas para {role, text}
        const initialMessages = Array.isArray(localMessages)
          ? localMessages.map(m => ({ role: m.isUser ? 'user' : 'assistant', text: m.text }))
          : [];
        const created = await fetch(`${API_BASE_URL}/api/conversations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initialMessages })
        }).then(r => r.ok ? r.json() : null);
        if (created && created.id) {
          localStorage.setItem(CONVERSATION_ID_KEY, created.id);
        }
        if (localMessages.length > 0) {
          setMessages(localMessages);
        }
        if (supportsConversationList) fetchConversations();
      } catch (e) {
        // Backend indisponível: segue com localStorage
        if (localMessages.length > 0) {
          setMessages(localMessages);
        }
      }
    };
    init();
  }, []);
  
  // Salvar mensagens no localStorage sempre que o estado messages mudar
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages]);
  
  // Auto-ajuste da altura do textarea
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  };
  
  // Inicializar API Gemini quando o componente montar
  useEffect(() => {
    try {
      setGenAI(new GoogleGenerativeAI(API_KEY));
    } catch (error) {
      console.error('Erro ao inicializar a API Gemini:', error);
      setError('Falha ao inicializar o chatbot. Verifique a configuração da API.');
    }

    // Define background image via body style to avoid CSS bundler path resolution
    const lightBg = "/imagens/bg.png"; // place file under public/imagens
    const darkBg = "/imagens/bg-dark.png"; // optional dark variant
    const applyBackground = () => {
      const isDark = document.body.classList.contains('dark-mode');
      document.body.style.backgroundImage = `url(${isDark ? darkBg : lightBg})`;
      document.body.style.backgroundSize = 'cover';
      document.body.style.backgroundPosition = 'center';
      document.body.style.backgroundRepeat = 'no-repeat';
      document.body.style.backgroundAttachment = 'fixed';
    };
    applyBackground();

    const observer = new MutationObserver(applyBackground);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Rolagem automática para a mensagem mais recente
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // Ajustar altura do textarea quando o input muda
  useEffect(() => {
    adjustTextareaHeight();
  }, [input]);

  // Verificar conexão de rede
  const isOnline = () => {
    return navigator.onLine;
  };

  // Função para extrair nome da cidade da mensagem
  const extractCityFromMessage = (message) => {
    const lowerMessage = message.toLowerCase();
    
    // Padrões para extrair cidade
    const patterns = [
      /(?:horas|hora|horário|data|dia|tempo|clima|temperatura) (?:em|de|na|no|em|para) ([^,.!?]+)/i,
      /(?:que horas|que dia|qual horário|qual data) (?:em|de|na|no|em|para) ([^,.!?]+)/i,
      /(?:clima|tempo|temperatura) (?:em|de|na|no|em|para) ([^,.!?]+)/i,
      /^([^,.!?]+)$/ // Se a mensagem for apenas uma palavra/frase
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return null;
  };

  // Função para formatar a data em português
  const formatarData = (date, timezone) => {
    const options = {
      timeZone: timezone,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    };

    const dataFormatada = date.toLocaleString('pt-BR', options);
    
    // Capitalizar primeira letra de cada palavra
    return dataFormatada.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  // Função para obter data e hora baseada na cidade
  const getCityDateTime = async (city) => {
    try {
      // Primeiro, obter as coordenadas da cidade
      const geoResponse = await fetch(
        `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${WEATHER_API_KEY}`
      );
      
      if (!geoResponse.ok) {
        throw new Error('Cidade não encontrada');
      }
      
      const geoData = await geoResponse.json();
      if (!geoData || geoData.length === 0) {
        throw new Error('Cidade não encontrada');
      }

      const { lat, lon, name, country } = geoData[0];

      // Obter o fuso horário da cidade
      const timezoneResponse = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}`
      );
      
      if (!timezoneResponse.ok) {
        throw new Error('Erro ao obter fuso horário');
      }
      
      const timezoneData = await timezoneResponse.json();
      const timezone = timezoneData.timezone;

      // Obter a data atual
      const date = new Date();
      const dataFormatada = formatarData(date, timezone);

      // Calcular diferença de fuso horário com UTC
      const utcOffset = date.getTimezoneOffset();
      const cityOffset = new Date(date.toLocaleString('en-US', { timeZone: timezone })).getTimezoneOffset();
      const diffHours = Math.abs(utcOffset - cityOffset) / 60;
      const diffSign = utcOffset > cityOffset ? '+' : '-';

      // Informações adicionais
      const diaSemana = date.toLocaleString('pt-BR', { timeZone: timezone, weekday: 'long' });
      const mes = date.toLocaleString('pt-BR', { timeZone: timezone, month: 'long' });
      const dia = date.getDate();
      const ano = date.getFullYear();
      
      return `Em ${name}, ${country}:\n\n` +
             `📅 Data: ${diaSemana}, ${dia} de ${mes} de ${ano}\n` +
             `⏰ Horário: ${dataFormatada.split(' ').slice(-1)[0]}\n` +
             `🌍 Fuso Horário: UTC${diffSign}${diffHours}:00\n\n` +
             `Agora são ${dataFormatada} no fuso horário local.`;
    } catch (error) {
      console.error('Erro ao obter data/hora:', error);
      throw new Error(`Não foi possível obter a data e hora para ${city}. Verifique se o nome da cidade está correto.`);
    }
  };

  // Identifica se o contexto é claramente culinário, para evitar confusão com "tempo" e "temperatura"
  const isCulinaryContext = (message) => {
    const m = message.toLowerCase();
    const culinaryKeywords = [
      'receita', 'ingrediente', 'cozinhar', 'cozimento', 'cozinhe', 'preparo',
      'assar', 'assado', 'forno', 'pré-aquecer', 'preaquecer', 'temperatura do forno',
      'purê', 'massa', 'molho', 'refogar', 'saltear', 'temperar', 'marinar',
      'minuto', 'minutos', 'hora', 'horas', 'colher', 'xícara', 'ml', 'grama', 'kg'
    ];
    return culinaryKeywords.some(k => m.includes(k));
  };

  // Função para verificar se a mensagem é sobre data/hora (no sentido de relógio/data, não "tempo de forno")
  const isDateTimeQuery = (message) => {
    const m = message.toLowerCase();
    // Se parecer contexto culinário, não tratar como data/hora
    if (isCulinaryContext(m)) return false;
    const patterns = [
      /\b(que horas|que dia|qual hor[áa]rio|qual data|data atual|hor[áa]rio atual)\b/,
      /\b(horas?|hor[áa]rio|data|dia)\s+(em|de|na|no)\s+[^?!.]+/
    ];
    return patterns.some(p => p.test(m));
  };

  // Função para verificar se a mensagem é sobre clima (evitando confundir "tempo de cozimento")
  const isWeatherQuery = (message) => {
    const m = message.toLowerCase();
    // Se parecer contexto culinário, não tratar como clima
    if (isCulinaryContext(m)) return false;
    const patterns = [
      /\bprevis[aã]o do tempo\b/,
      /\bcomo est[áa]\s+(o\s+)?(clima|tempo)\b/,
      /\b(clima|tempo|temperatura)\s+(em|de|na|no)\s+[^?!.]+/,
      /\b(vai chover|chuva|ensolarado|nublado|temperatura atual|sens[aã]o t[eé]rmica|umidade)\b/
    ];
    return patterns.some(p => p.test(m));
  };

  // Função para verificar se a mensagem é apenas um nome de cidade
  const isJustCityName = (message) => {
    // Remove espaços extras e converte para minúsculas
    const cleanMessage = message.trim().toLowerCase();
    // Verifica se a mensagem tem menos de 50 caracteres e não contém espaços
    return cleanMessage.length < 50 && !cleanMessage.includes(' ');
  };

  // -------- Integração com Backend para histórico --------
  const ensureConversation = async () => {
    let id = localStorage.getItem(CONVERSATION_ID_KEY);
    if (id) return id;
    try {
      const created = await fetch(`${API_BASE_URL}/api/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initialMessages: [] })
      }).then(r => r.ok ? r.json() : null);
      if (created && created.id) {
        localStorage.setItem(CONVERSATION_ID_KEY, created.id);
        id = created.id;
      }
    } catch (e) {
      // Ignorar se offline/erro
    }
    return id;
  };

  const createConversationWithMessages = async (initialMessages) => {
    try {
      const created = await fetch(`${API_BASE_URL}/api/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initialMessages })
      }).then(r => r.ok ? r.json() : null);
      if (created && created.id) {
        localStorage.setItem(CONVERSATION_ID_KEY, created.id);
        return created.id;
      }
    } catch (_) {}
    return null;
  };

  const appendMessageRemote = async (role, text) => {
    try {
      let id = await ensureConversation();
      if (!id) return false;

      const postMessage = async (convId) => {
        return fetch(`${API_BASE_URL}/api/conversations/${convId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role, text })
        });
      };

      let resp = await postMessage(id);
      if (resp && resp.status === 404) {
        // ID inválido/expirado: cria nova conversa e tenta novamente
        localStorage.removeItem(CONVERSATION_ID_KEY);
        const created = await fetch(`${API_BASE_URL}/api/conversations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initialMessages: [] })
        }).then(r => r.ok ? r.json() : null);
        if (created && created.id) {
          localStorage.setItem(CONVERSATION_ID_KEY, created.id);
          id = created.id;
          resp = await postMessage(id);
        }
      }

      if (supportsConversationList) fetchConversations();
      return resp && resp.ok;
    } catch (e) {
      // Ignorar erros silenciosamente para não quebrar UX
      return false;
    }
  };

  const MENSAGEM_BOAS_VINDAS = `Olá! Sou o Mega Chef da Computaria, seu assistente culinário virtual, pronto para te ajudar com:

- Sugestões de receitas com os ingredientes que você tem.
- Dicas de preparo e truques para acertar no prato.
- Adaptações conforme suas restrições ou preferências alimentares.
- Harmonizações entre comidas e bebidas.
- Segredos para melhorar suas habilidades na cozinha.
- Informações sobre o clima para ajudar no planejamento das suas refeições.

Para começar, me conte se tem alguma restrição alimentar ou preferência, e o que tem disponível na sua despensa. Vamos cozinhar juntos... com dados!`;

  // Função para obter o clima de uma cidade
  const getWeather = async (city) => {
    try {
      // Primeiro, obter as coordenadas da cidade
      const geoResponse = await fetch(
        `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${WEATHER_API_KEY}`
      );
      
      if (!geoResponse.ok) {
        throw new Error('Cidade não encontrada');
      }
      
      const geoData = await geoResponse.json();
      if (!geoData || geoData.length === 0) {
        throw new Error('Cidade não encontrada');
      }

      const { lat, lon, name, country } = geoData[0];

      // Agora obter o clima usando as coordenadas
      const weatherResponse = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}&units=metric&lang=pt_br`
      );
      
      if (!weatherResponse.ok) {
        throw new Error('Erro ao obter dados do clima');
      }
      
      const data = await weatherResponse.json();
      const temp = Math.round(data.main.temp);
      const description = data.weather[0].description;
      const humidity = data.main.humidity;
      
      // Sugestões de receitas baseadas no clima
      let recipeSuggestion = '';
      if (temp < 15) {
        recipeSuggestion = 'Com esse clima mais frio, que tal preparar um caldo quentinho? Posso te sugerir uma sopa reconfortante ou um feijão tropeiro bem temperado.';
      } else if (temp < 25) {
        recipeSuggestion = 'O clima está agradável! Que tal um risoto cremoso ou uma massa com molho ao sugo?';
      } else {
        recipeSuggestion = 'Com esse calor, que tal uma salada refrescante ou um ceviche? Posso te ajudar a preparar algo leve e saboroso.';
      }

      if (description.includes('chuva') || description.includes('nublado')) {
        recipeSuggestion += ' E já que está chovendo, podemos fazer algo que aqueça o coração.';
      } else if (description.includes('ensolarado') || description.includes('céu limpo')) {
        recipeSuggestion += ' Com esse sol, podemos preparar algo que combine com um dia bonito.';
      }
      
      return `Em ${name}, ${country}, a temperatura atual é de ${temp}°C, ${description}. Umidade do ar: ${humidity}%.\n\n${recipeSuggestion}\n\nMe diga se você tem alguma restrição alimentar ou ingredientes específicos em casa, e eu posso te dar sugestões mais personalizadas!`;
    } catch (error) {
      console.error('Erro ao obter clima:', error);
      throw new Error(`Não foi possível obter informações do clima para ${city}. Verifique se o nome da cidade está correto.`);
    }
  };

  // Função para enviar mensagem para a API do Gemini
  const sendMessageToGemini = async (message) => {
    if (!isOnline()) {
      throw new Error(MENSAGEM_ERRO_REDE);
    }
    
    if (!genAI) {
      throw new Error("API Gemini não inicializada corretamente.");
    }
    
    try {
      // Se estiver esperando uma cidade (seja para clima ou horário)
      if (userCity === 'pending') {
        const city = message.trim();
        setUserCity(city);
        try {
          // Se a última mensagem era sobre clima, retorna o clima
          if (messages.length > 0 && isWeatherQuery(messages[messages.length - 1].text)) {
            return await getWeather(city);
          }
          // Se não, retorna o horário
          return await getCityDateTime(city);
        } catch (error) {
          setUserCity(null);
          return error.message;
        }
      }

      // Verificar se é uma consulta de clima
      if (isWeatherQuery(message)) {
        // Se não tiver a cidade do usuário salva, perguntar
        if (!userCity) {
          setUserCity('pending');
          return "Para te informar sobre o clima, preciso saber em qual cidade você mora. Pode me dizer?";
        }

        // Se já tiver a cidade do usuário, usar ela
        try {
          return await getWeather(userCity);
        } catch (error) {
          setUserCity(null);
          return error.message;
        }
      }

      // Verificar se é uma consulta de data/hora
      if (isDateTimeQuery(message)) {
        // Se não tiver a cidade do usuário salva, perguntar
        if (!userCity) {
          setUserCity('pending');
          return "Para te informar a hora correta, preciso saber em qual cidade você mora. Pode me dizer?";
        }

        // Se já tiver a cidade do usuário, usar ela
        try {
          return await getCityDateTime(userCity);
        } catch (error) {
          setUserCity(null);
          return error.message;
        }
      }

      // Se não for consulta de clima ou data/hora, resetar os estados
      if (weatherCity !== null) {
        setWeatherCity(null);
      }

      // Se chegou aqui, é uma mensagem normal para o Gemini
      const model = genAI.getGenerativeModel({ model: MODELO_IA });
      
      // Preparar histórico de conversa para contexto
      let historicoConversa = '';
      
      // Usar mais mensagens para melhor contexto
      const mensagensRecentes = messages.slice(-MAX_HISTORICO);
      if (mensagensRecentes.length > 0) {
        historicoConversa = 'Histórico da conversa:\n';
        mensagensRecentes.forEach(msg => {
          historicoConversa += `${msg.isUser ? 'Usuário' : 'Assistente'}: ${msg.text}\n`;
        });
      }
      
      const promptComContexto = `${CONTEXTO_INICIAL}\n\n${historicoConversa}\nPergunta atual do usuário: ${message}`;
      
      const result = await model.generateContent(promptComContexto);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      throw error;
    }
  };

  // Função para limpar a conversa
  const handleClearChat = () => {
    const currentId = localStorage.getItem(CONVERSATION_ID_KEY);
    setMessages([]);
    setError(null);
    localStorage.removeItem(STORAGE_KEY);
    if (currentId) {
      // tentar excluir conversa atual e criar nova
      fetch(`${API_BASE_URL}/api/conversations/${currentId}`, { method: 'DELETE' })
        .finally(async () => {
          try {
            const created = await fetch(`${API_BASE_URL}/api/conversations`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ initialMessages: [] })
            }).then(r => r.ok ? r.json() : null);
            if (created && created.id) {
              localStorage.setItem(CONVERSATION_ID_KEY, created.id);
            } else {
              localStorage.removeItem(CONVERSATION_ID_KEY);
            }
          } finally {
            fetchConversations();
          }
        });
    } else {
      localStorage.removeItem(CONVERSATION_ID_KEY);
    }
  };

  // Função para manter foco no textarea
  const focusTextarea = () => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  // Efeito para manter foco no textarea quando o componente montar
  useEffect(() => {
    focusTextarea();
  }, []);

  // Efeito para manter foco após cada mensagem
  useEffect(() => {
    focusTextarea();
  }, [messages]);

  // Função para enviar mensagem
  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    setError(null);
    
    // Adicionar mensagem do usuário
    const newUserMessage = { text: userMessage, isUser: true };
    setMessages(prev => [...prev, newUserMessage]);
    // salvar no backend: se não existir conversa ainda, cria já com a primeira mensagem
    let convId = localStorage.getItem(CONVERSATION_ID_KEY);
    if (!convId) {
      convId = await createConversationWithMessages([{ role: 'user', text: userMessage }]);
      fetchConversations();
    } else {
      await appendMessageRemote('user', userMessage);
    }
    
    setIsLoading(true);

    // Resetar a altura do textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      const response = await sendMessageToGemini(userMessage);
      // Adicionar resposta do bot
      const newBotMessage = { text: response, isUser: false };
      setMessages(prev => [...prev, newBotMessage]);
      // salvar no backend imediatamente (com retry)
      await appendMessageRemote('assistant', response);
    } catch (error) {
      console.error('Erro capturado:', error);
      setError(error.message || MENSAGEM_ERRO_API);
    } finally {
      setIsLoading(false);
      // Forçar foco no textarea após um pequeno delay
      setTimeout(focusTextarea, 100);
    }
  };

  // Manipular teclas pressionadas
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  // ------- Histórico: listar, selecionar, criar, excluir -------
  const fetchConversations = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/conversations`);
      if (res.status === 404) {
        // backend sem endpoint de listagem; desabilita chamadas futuras
        setSupportsConversationList(false);
        return;
      }
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.conversations)) setConversations(data.conversations);
    } catch (_) {
      // silencioso offline
    }
  };

  const selectConversation = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/conversations/${id}`);
      if (!res.ok) return;
      const data = await res.json();
      const uiMessages = (data.messages || []).map(m => ({ text: m.text, isUser: m.role === 'user' }));
      setMessages(uiMessages);
      localStorage.setItem(CONVERSATION_ID_KEY, id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(uiMessages));
    } catch (_) {
      // silencioso
    }
  };

  const createNewConversation = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initialMessages: [] })
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data && data.id) {
        localStorage.setItem(CONVERSATION_ID_KEY, data.id);
        setMessages([]);
        localStorage.removeItem(STORAGE_KEY);
        fetchConversations();
      }
    } catch (_) {}
  };

  const deleteConversation = async (id) => {
    try {
      await fetch(`${API_BASE_URL}/api/conversations/${id}`, { method: 'DELETE' });
    } finally {
      const currentId = localStorage.getItem(CONVERSATION_ID_KEY);
      if (currentId === id) {
        await createNewConversation();
      }
      fetchConversations();
    }
  };

  return (
    <div className={`chat-container ${isDarkMode ? 'dark-mode' : ''}`}>
      <div className="chat-header">
        <img alt="logo" src='/imagens/logo.png' className="avatar"/>
        <h1>Mega Chef da Computaria</h1>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button className="theme-toggle" onClick={toggleTheme}>
            {isDarkMode ? '☀️' : '🌙'}
          </button>
          <button
            className="history-toggle"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            title="Mostrar/ocultar histórico"
          >
            🗂️
          </button>
          <button 
            className="clear-button" 
            onClick={handleClearChat}
            title="Limpar conversa"
          >
            Limpar
          </button>
        </div>
      </div>
      
      <div className="chat-body">
        {isSidebarOpen && (
          <aside className="sidebar">
            <div className="sidebar-header">
              <span>Histórico</span>
              <button className="new-chat" onClick={createNewConversation}>+ Nova</button>
            </div>
            <div className="sidebar-list">
              {conversations.length === 0 && (
                <div className="sidebar-empty">Sem conversas</div>
              )}
              {conversations.map((c) => (
                <div key={c.id} className="sidebar-item">
                  <button className="item-main" onClick={() => selectConversation(c.id)}>
                    <div className="item-title">{c.title || 'Conversa'}</div>
                    {c.lastMessage && (() => {
                      const full = c.lastMessage.text || '';
                      const max = 60;
                      const short = full.length > max ? `${full.slice(0, max)}…` : full;
                      return (
                        <div className="item-sub" title={full}>{short}</div>
                      );
                    })()}
                  </button>
                  <button className="item-delete" onClick={() => deleteConversation(c.id)} title="Excluir">✕</button>
                  <button className="item-delete" onClick={async () => {
                    const novoTitulo = window.prompt('Novo nome da conversa:', c.title || '');
                    if (novoTitulo === null) return; // cancelado
                    const title = novoTitulo.trim();
                    if (!title) return;
                    try {
                      await fetch(`${API_BASE_URL}/api/conversations/${c.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ title })
                      });
                    } finally {
                      fetchConversations();
                    }
                  }} title="Renomear">✎</button>
                </div>
              ))}
            </div>
          </aside>
        )}

        <div className="messages-container">
          {messages.length === 0 && (
            <div className="message bot">
              <img alt="logo" src='/imagens/logo.png' className="avatar"/>
              <div className="message-content">
                <ReactMarkdown>
                  {MENSAGEM_BOAS_VINDAS}
                </ReactMarkdown>
              </div>
            </div>
          )}
          
          {messages.map((message, index) => (
            <div key={index} className={`message ${message.isUser ? 'user' : 'bot'}`}>
              <div className="avatar">
                {message.isUser ? <RxAvatar size={30}/> : <img alt="logo" className="avatar" src='/imagens/logo.png'/>}
              </div>
              <div className="message-content">
                <ReactMarkdown>
                  {message.text}
                </ReactMarkdown>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="typing-indicator">
              <img alt="logo" src='/imagens/logo.png' className="avatar"/>
              <div className="message-content">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}
          
          {error && (
            <div className="error-message">
              <FiAlertCircle className="error-icon" />
              <p>{error}</p>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>
      
      <div className="input-container">
        <textarea
          ref={textareaRef}
          className="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Digite sua mensagem..."
          disabled={isLoading}
          rows={1}
          autoFocus
          onBlur={focusTextarea}
        />
        <button 
          className="send-button" 
          onClick={handleSend}
          disabled={isLoading || !input.trim()}
          aria-label="Enviar mensagem"
        >
          {isLoading ? (
            <div className="loader"></div>
          ) : (
            <FiSend size={18} />
          )}
        </button>
      </div>
    </div>
  );
};

export default Chatbot;