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
        title: c.title || (lastMessage ? (lastMessage.text || '').slice(0, 40) : 'Nova conversa'),
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
    const conv = await Conversation.create({ title, messages: initialMessages });
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

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});


