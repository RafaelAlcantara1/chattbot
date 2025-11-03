const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const morgan = require('morgan');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Mongo connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mega-chef';
mongoose
  .connect(MONGODB_URI, { autoIndex: true })
  .then(() => console.log('MongoDB conectado'))
  .catch((err) => console.error('Erro ao conectar no MongoDB:', err));

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'mega-chef-secret-key-change-in-production';

// Schemas
const MessageSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ['user', 'assistant'], required: true },
    text: { type: String, required: true }
  },
  { _id: false, timestamps: true }
);

const ConversationSchema = new mongoose.Schema(
  {
    title: { type: String },
    messages: { type: [MessageSchema], default: [] },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
  },
  { timestamps: true }
);

const UserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },
    isAdmin: { type: Boolean, default: false }
  },
  { timestamps: true }
);

const PersonalitySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // null = global/admin
    personality: { type: String, required: true },
    isGlobal: { type: Boolean, default: false } // true = personalidade global do admin
  },
  { timestamps: true }
);

const Conversation = mongoose.model('Conversation', ConversationSchema);
const User = mongoose.model('User', UserSchema);
const Personality = mongoose.model('Personality', PersonalitySchema);

// Middleware de autenticação
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token inválido' });
    req.user = user;
    next();
  });
};

// --- Helpers ---
function generateConversationTitle(messages) {
  try {
    if (!Array.isArray(messages) || messages.length === 0) return null;
    // Prefer the most recent user message
    let candidate = null;
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i] && messages[i].role === 'user' && typeof messages[i].text === 'string') {
        candidate = messages[i].text.trim();
        break;
      }
    }
    if (!candidate) {
      const last = messages[messages.length - 1];
      candidate = last && typeof last.text === 'string' ? last.text.trim() : '';
    }
    if (!candidate) return null;

    const text = candidate.toLowerCase();

    // Weather intent
    const weatherPatterns = [
      /\b(previs[ãa]o do tempo|clima|tempo|temperatura)\b/,
      /\bvai chover|chuva|ensolarado|nublado|umidade\b/
    ];
    if (weatherPatterns.some((r) => r.test(text))) {
      const m = candidate.match(/(?:em|de|na|no)\s+([\p{L} .'-]{2,})/iu);
      const city = m && m[1] ? m[1].trim() : null;
      return city ? `Clima em ${city}` : 'Consulta de clima';
    }

    // Date/time intent
    const timePatterns = [
      /\b(que horas|que dia|qual hor[áa]rio|qual data|data atual|hor[áa]rio atual)\b/,
      /\b(horas?|hor[áa]rio|data|dia)\s+(em|de|na|no)\s+[^?!.]+/
    ];
    if (timePatterns.some((r) => r.test(text))) {
      const m = candidate.match(/(?:em|de|na|no)\s+([\p{L} .'-]{2,})/iu);
      const city = m && m[1] ? m[1].trim() : null;
      return city ? `Hora em ${city}` : 'Consulta de data/horário';
    }

    // "Como fazer X" pattern
    const howMatch = candidate.match(/como\s+fazer\s+(.{3,60})/i);
    if (howMatch && howMatch[1]) {
      const item = howMatch[1].replace(/[?.!]+$/, '').trim();
      return `Como fazer ${item}`;
    }

    // Common culinary keywords → category titles
    const foodKeywords = [
      'receita', 'ingrediente', 'cozinhar', 'assar', 'forno', 'temperar', 'marinar', 'molho', 'massa',
      'frango', 'carne', 'peixe', 'ovo', 'arroz', 'feij', 'salada', 'sopa', 'risoto', 'macarr', 'bolo', 'torta'
    ];
    if (foodKeywords.some((k) => text.includes(k))) {
      // Try to pick a main ingredient keyword for the title
      const main = ['frango','carne','peixe','ovo','arroz','feij','salada','sopa','risoto','macarr','bolo','torta']
        .find((k) => text.includes(k));
      if (main) {
        const map = {
          frango: 'frango', carne: 'carne', peixe: 'peixe', ovo: 'ovos', arroz: 'arroz', feij: 'feijão',
          salada: 'saladas', sopa: 'sopas', risoto: 'risotos', macarr: 'massas', bolo: 'bolos', torta: 'tortas'
        };
        const word = Object.keys(map).find((k) => main.includes(k));
        return word ? `Receitas com ${map[word]}` : 'Sugestões de receitas';
      }
      return 'Sugestões de receitas';
    }

    // Default fallbacks
    return 'Conversa culinária';
  } catch (_) {
    return 'Conversa culinária';
  }
}

// Routes
app.get('/', (req, res) => {
  res.json({
    service: 'mega-chef-api',
    status: 'ok',
    docs: '/api/health',
    endpoints: [
      'GET /api/health',
      'GET /api/conversations',
      'POST /api/conversations',
      'GET /api/conversations/:id',
      'POST /api/conversations/:id/messages',
      'PUT /api/conversations/:id/messages',
      'PATCH /api/conversations/:id',
      'DELETE /api/conversations/:id'
    ]
  });
});
app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

// List conversations (basic metadata) - opcionalmente filtrado por userId
app.get('/api/conversations', async (req, res) => {
  try {
    // Tentar obter userId do token, mas não falhar se não houver
    let userId = null;
    try {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];
      if (token) {
        const decoded = jwt.verify(token, JWT_SECRET);
        userId = decoded.userId;
      }
    } catch (_) {
      // Token inválido ou ausente, continuar sem userId
    }

    const query = userId ? { userId: userId } : { $or: [{ userId: null }, { userId: { $exists: false } }] };
    const conversations = await Conversation.find(query)
      .sort({ updatedAt: -1 })
      .lean();

    const result = conversations.map((c) => {
      const lastMessage = Array.isArray(c.messages) && c.messages.length > 0
        ? c.messages[c.messages.length - 1]
        : null;
      return {
        id: c._id.toString(),
        title: c.title || 'Nova conversa',
        updatedAt: c.updatedAt,
        lastMessage: lastMessage
          ? { role: lastMessage.role, text: (lastMessage.text || '').slice(0, 120) }
          : null
      };
    });

    res.json({ conversations: result });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao listar conversas' });
  }
});

// Create new conversation
app.post('/api/conversations', async (req, res) => {
  try {
    // Tentar obter userId do token, mas não falhar se não houver
    let userId = null;
    try {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];
      if (token) {
        const decoded = jwt.verify(token, JWT_SECRET);
        userId = decoded.userId;
      }
    } catch (_) {
      // Token inválido ou ausente, continuar sem userId
    }

    const { initialMessages = [], title } = req.body || {};
    let computedTitle = title;
    if ((!computedTitle || !computedTitle.trim()) && Array.isArray(initialMessages) && initialMessages.length > 0) {
      computedTitle = generateConversationTitle(initialMessages) || null;
    }
    const conv = await Conversation.create({ title: computedTitle, messages: initialMessages, userId });
    res.status(201).json({ id: conv._id.toString() });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao criar conversa' });
  }
});

// Get conversation by id
app.get('/api/conversations/:id', async (req, res) => {
  try {
    const conv = await Conversation.findById(req.params.id).lean();
    if (!conv) return res.status(404).json({ error: 'Conversa não encontrada' });
    res.json({ id: conv._id.toString(), messages: conv.messages });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao buscar conversa' });
  }
});

// Append message
app.post('/api/conversations/:id/messages', async (req, res) => {
  try {
    const { role, text } = req.body || {};
    if (!role || !text) return res.status(400).json({ error: 'role e text são obrigatórios' });
    const conv = await Conversation.findById(req.params.id);
    if (!conv) return res.status(404).json({ error: 'Conversa não encontrada' });
    conv.messages.push({ role, text });
    // Auto-title if missing
    if (!conv.title) {
      const newTitle = generateConversationTitle(conv.messages);
      if (newTitle) conv.title = newTitle;
    }
    await conv.save();
    res.status(201).json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao adicionar mensagem' });
  }
});

// Replace all messages (optional)
app.put('/api/conversations/:id/messages', async (req, res) => {
  try {
    const { messages } = req.body || {};
    if (!Array.isArray(messages)) return res.status(400).json({ error: 'messages deve ser um array' });
    const conv = await Conversation.findById(req.params.id);
    if (!conv) return res.status(404).json({ error: 'Conversa não encontrada' });
    conv.messages = messages;
    await conv.save();
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao substituir mensagens' });
  }
});

// Delete conversation
app.delete('/api/conversations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Conversation.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ error: 'Conversa não encontrada' });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao excluir conversa' });
  }
});

// Update conversation title
app.patch('/api/conversations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body || {};
    if (typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({ error: 'title inválido' });
    }
    const updated = await Conversation.findByIdAndUpdate(
      id,
      { $set: { title: title.trim() } },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Conversa não encontrada' });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao atualizar conversa' });
  }
});

// --- AUTENTICAÇÃO ---
// Registro de usuário
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'username e password são obrigatórios' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Senha deve ter no mínimo 6 caracteres' });
    }
    
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: 'Usuário já existe' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ username, password: hashedPassword });
    
    const token = jwt.sign({ userId: user._id.toString(), username: user.username }, JWT_SECRET, { expiresIn: '30d' });
    res.status(201).json({ token, user: { id: user._id.toString(), username: user.username, isAdmin: user.isAdmin } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao criar usuário' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'username e password são obrigatórios' });
    }
    
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: 'Usuário ou senha inválidos' });
    }
    
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Usuário ou senha inválidos' });
    }
    
    const token = jwt.sign({ userId: user._id.toString(), username: user.username, isAdmin: user.isAdmin }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: user._id.toString(), username: user.username, isAdmin: user.isAdmin } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
});

// Verificar token
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    res.json({ user: { id: user._id.toString(), username: user.username, isAdmin: user.isAdmin } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao verificar usuário' });
  }
});

// --- PERSONALIDADES ---
// Obter personalidade global (sem autenticação para usuários não logados)
app.get('/api/personality/public', async (req, res) => {
  try {
    let personality = await Personality.findOne({ isGlobal: true });
    
    if (!personality) {
      // Cria personalidade global padrão se não existir
      const defaultPersonality = `Você é um assistente culinário virtual chamado Mega Chef da Computaria. Seu principal objetivo é ajudar as pessoas com receitas e dicas culinárias.

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
      
      personality = await Personality.create({ 
        personality: defaultPersonality, 
        isGlobal: true 
      });
    }
    
    res.json({ personality: personality.personality });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao obter personalidade' });
  }
});

// Obter personalidade (do usuário ou global)
app.get('/api/personality', authenticateToken, async (req, res) => {
  try {
    // Primeiro tenta buscar personalidade do usuário
    let personality = await Personality.findOne({ userId: req.user.userId, isGlobal: false });
    
    if (!personality) {
      // Se não tem personalidade do usuário, busca a global
      personality = await Personality.findOne({ isGlobal: true });
      
      // Se não existe global, cria uma padrão
      if (!personality) {
        const defaultPersonality = `Você é um assistente culinário virtual chamado Mega Chef da Computaria. Seu principal objetivo é ajudar as pessoas com receitas e dicas culinárias.

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
        
        personality = await Personality.create({ 
          personality: defaultPersonality, 
          isGlobal: true 
        });
      }
    }
    
    res.json({ personality: personality.personality, isGlobal: personality.isGlobal });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao obter personalidade' });
  }
});

// Obter personalidade global (apenas admin)
app.get('/api/personality/global', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || !user.isAdmin) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    
    let personality = await Personality.findOne({ isGlobal: true });
    if (!personality) {
      // Cria personalidade global padrão se não existir
      const defaultPersonality = `Você é um assistente culinário virtual chamado Mega Chef da Computaria. Seu principal objetivo é ajudar as pessoas com receitas e dicas culinárias.

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
      
      personality = await Personality.create({ 
        personality: defaultPersonality, 
        isGlobal: true 
      });
    }
    
    res.json({ personality: personality.personality });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao obter personalidade global' });
  }
});

// Criar/Atualizar personalidade do usuário
app.put('/api/personality/user', authenticateToken, async (req, res) => {
  try {
    const { personality } = req.body || {};
    if (!personality || typeof personality !== 'string' || personality.trim().length === 0) {
      return res.status(400).json({ error: 'personality é obrigatória' });
    }
    
    const personalityDoc = await Personality.findOneAndUpdate(
      { userId: req.user.userId, isGlobal: false },
      { personality: personality.trim(), userId: req.user.userId, isGlobal: false },
      { upsert: true, new: true }
    );
    
    res.json({ ok: true, personality: personalityDoc.personality });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao salvar personalidade' });
  }
});

// Atualizar personalidade global (apenas admin)
app.put('/api/personality/global', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || !user.isAdmin) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    
    const { personality } = req.body || {};
    if (!personality || typeof personality !== 'string' || personality.trim().length === 0) {
      return res.status(400).json({ error: 'personality é obrigatória' });
    }
    
    const personalityDoc = await Personality.findOneAndUpdate(
      { isGlobal: true },
      { personality: personality.trim(), isGlobal: true },
      { upsert: true, new: true }
    );
    
    res.json({ ok: true, personality: personalityDoc.personality });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao atualizar personalidade global' });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Servidor rodando em https://mega-chef-api.onrender.com`);
});


