// Base de données en mémoire
const users = {};

// Statistiques partagées
const stats = {
  totalVisits: 0,
  currentVisitors: 0,
  totalRegistrations: 0,
  totalCodesSubmitted: 0,
  codesAccepted: 0,
  codesRejected: 0,
  lastVisit: null,
  lastRegistration: null,
  startTime: Date.now()
};

module.exports = { users, stats };