const { brewerRoleId, urlAllowlist } = require('../config.json');
const {
    ActionRowBuilder,
    ContainerBuilder,
    MessageFlags,
    ModalBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    TextDisplayBuilder,
    TextInputBuilder,
    TextInputStyle,
    roleMention,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

module.exports = {
    data: { name: 'editBrew' },
    async execute(interaction) {
        const message = interaction.message;
        const thread = interaction.channel;
        if (!message || !thread) {
            await interaction.reply({ content: 'There was an error editing this post.', flags: MessageFlags.Ephemeral });
            return;
        }

        // Confirm user is OP
        if (!interaction.message.mentions.has(interaction.user.id)) {
            await interaction.reply({ content: 'Only the original poster can edit this post.', flags: MessageFlags.Ephemeral });
            return;
        }

        // Create modal
        const now = new Date().toISOString();
        const modal = new ModalBuilder()
            .setCustomId(`editBrewModal-${interaction.member.id}-${now}`)
            .setTitle('Brew Forum Submission');

        // Add components
        const brewNameInput = new TextInputBuilder()
            .setCustomId('brewNameInput')
            .setLabel('Title:')
            .setStyle(TextInputStyle.Short)
            .setValue(message.components[0].components[0].content.slice(2))
            .setMaxLength(60)
            .setRequired(true);

        const brewLinkInput = new TextInputBuilder()
            .setCustomId('brewLinkInput')
            .setLabel('Link:')
            .setValue(message.components[0].components[2].components[0].url)
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const brewInfoInput = new TextInputBuilder()
            .setCustomId('brewInfoInput')
            .setLabel('Information:')
            .setValue(message.components[0].components[4].content)
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        // Add inputs to the modal
        const firstActionRow = new ActionRowBuilder().addComponents(brewNameInput);
        const secondActionRow = new ActionRowBuilder().addComponents(brewLinkInput);
        const thirdActionRow = new ActionRowBuilder().addComponents(brewInfoInput);
        modal.addComponents(firstActionRow, secondActionRow, thirdActionRow);

        // Show modal
        await interaction.showModal(modal);

        // Wait for submission
        const filter = (interaction) => interaction.customId === `editBrewModal-${interaction.member.id}-${now}`;
        interaction
            .awaitModalSubmit({ filter, time: 600_000 })
            .then((modalInteraction) => {
                // Get modal inputs
                const brewName = modalInteraction.fields.getTextInputValue('brewNameInput');
                const brewLink = modalInteraction.fields.getTextInputValue('brewLinkInput');
                const brewInfo = modalInteraction.fields.getTextInputValue('brewInfoInput');

                // Set other constants
                const brewSite = new URL(brewLink).hostname;
                const role = roleMention(brewerRoleId);

                // Check if link is on allowlist
                const isDomainAllowed = urlAllowlist.some(allowedDomain => brewLink.toLowerCase().startsWith(allowedDomain.toLowerCase()));
                if (!isDomainAllowed) {
                    const domainList = "```" + urlAllowlist.join("\n") + "```"
                    modalInteraction.reply({
                        content: `To prevent abuse, SquirrelStack only allows links to preapproved sites. Please resubmit using one of the following services:${domainList}\n**For your convenience, your brew info is below:**\n${brewInfo}`,
                        flags: MessageFlags.Ephemeral
                    });
                    return;
                }

                // Create message components
                const titleComponent = new TextDisplayBuilder().setContent(`# ${brewName}`);
                const authorComponent = new TextDisplayBuilder().setContent(`Poster: ${modalInteraction.member}`);
                const linkButtonComponent = new ButtonBuilder()
                    .setLabel(`View on ${brewSite}`)
                    .setStyle(ButtonStyle.Link)
                    .setURL(brewLink);
                const linkButtonActionRowComponent = new ActionRowBuilder().addComponents(linkButtonComponent);
                const separatorComponent = new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large);
                const infoComponent = new TextDisplayBuilder().setContent(brewInfo);
                const mentionComponent = new TextDisplayBuilder().setContent(`\nTime to get to work ${role}!`);
                const containerComponent = new ContainerBuilder()
                    .addTextDisplayComponents(titleComponent, authorComponent)
                    .addActionRowComponents(linkButtonActionRowComponent)
                    .addSeparatorComponents(separatorComponent)
                    .addTextDisplayComponents(infoComponent, mentionComponent);
                const editButtonComponent = new ButtonBuilder()
                    .setCustomId(`editBrew`)
                    .setLabel('Edit')
                    .setStyle(ButtonStyle.Danger);
                const editButtonActionRowComponent = new ActionRowBuilder().addComponents(editButtonComponent);

                // Edit post
                const threadName = `${modalInteraction.member.displayName} - ${brewName}`
                if (thread.name !== threadName) { thread.setName(threadName) };
                message.edit({
                    flags: MessageFlags.IsComponentsV2,
                    components: [containerComponent, editButtonActionRowComponent]
                });

                modalInteraction.reply({
                    content: 'Your post has been edited',
                    flags: MessageFlags.Ephemeral
                });
            })
            .catch((err) => {
                console.log(`Error: ${err}`);
            })
    },
};
