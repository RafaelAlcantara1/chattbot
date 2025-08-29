const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const morgan = require('morgan');
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
    messages: { type: [MessageSchema], default: [] }
  },
  { timestamps: true }
);

const Conversation = mongoose.model('Conversation', ConversationSchema);

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
app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

// List conversations (basic metadata)
app.get('/api/conversations', async (req, res) => {
  try {
    const conversations = await Conversation.find({})
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
    const { initialMessages = [], title } = req.body || {};
    let computedTitle = title;
    if ((!computedTitle || !computedTitle.trim()) && Array.isArray(initialMessages) && initialMessages.length > 0) {
      computedTitle = generateConversationTitle(initialMessages) || null;
    }
    const conv = await Conversation.create({ title: computedTitle, messages: initialMessages });
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

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});


