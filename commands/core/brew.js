const { brewerRoleId, brewChannelId, urlAllowlist } = require('../../config.json');
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
	ButtonStyle,
	ChannelType
} = require('discord.js');

module.exports = {
	category: 'core',
	data: {
		name: 'brew',
		description: 'Create a new brew'
	},
	async execute(interaction) {

		// Check for forum channel
		const forum = interaction.guild.channels.cache.get(brewChannelId);
		if (!forum || forum.type !== ChannelType.GuildForum) {
			interaction.reply({
				content: 'The specified forum channel for brews is missing or invalid - please contact the server administrators',
				flags: MessageFlags.Ephemeral
			});
			return;
		}

		// Create modal
		const modal = new ModalBuilder()
			.setCustomId(`brewModal-${interaction.user.id}`)
			.setTitle('Brew Forum Submission');

		// Add components
		const brewNameInput = new TextInputBuilder()
			.setCustomId('brewNameInput')
			.setLabel('Title:')
			.setStyle(TextInputStyle.Short)
			.setPlaceholder('Insufferable Squirrel')
			.setMaxLength(60)
			.setRequired(true);

		const brewLinkInput = new TextInputBuilder()
			.setCustomId('brewLinkInput')
			.setLabel('Link:')
			.setStyle(TextInputStyle.Short)
			.setPlaceholder('Link to Moxfield deck, EDHREC, Scryfall, etc.')
			.setRequired(true);

		const brewInfoInput = new TextInputBuilder()
			.setCustomId('brewInfoInput')
			.setLabel('Information:')
			.setStyle(TextInputStyle.Paragraph)
			.setPlaceholder('Tell us about your brew, your Scryfall search terms, or interesting stats on EDHREC!')
			.setRequired(true);

		// Add inputs to the modal
		const firstActionRow = new ActionRowBuilder().addComponents(brewNameInput);
		const secondActionRow = new ActionRowBuilder().addComponents(brewLinkInput);
		const thirdActionRow = new ActionRowBuilder().addComponents(brewInfoInput);
		modal.addComponents(firstActionRow, secondActionRow, thirdActionRow);

		// Show modal
		await interaction.showModal(modal);

		// Wait for submission
		const filter = (interaction) => interaction.customId === `brewModal-${interaction.member.id}`;
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
						content: `To prevent abuse, SquirrelStack only allows links to preapproved sites. Please resubmit your brew using one of the following services:${domainList}\n**For your convenience, your brew info is below:**\n${brewInfo}`,
						flags: MessageFlags.Ephemeral
					});
					return;
				}

				// Create message components
				const titleComponent = new TextDisplayBuilder().setContent(`# ${brewName}`);
				const authorComponent = new TextDisplayBuilder().setContent(`Poster: ${interaction.member}`);
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
					.setCustomId('editBrew')
					.setLabel('Edit')
					.setStyle(ButtonStyle.Danger);
				const editButtonActionRowComponent = new ActionRowBuilder().addComponents(editButtonComponent);
				
				// Create forum post
				forum.threads.create({
					name: `${interaction.member.displayName} - ${brewName}`,
					message: ({
						flags: MessageFlags.IsComponentsV2,
						components: [containerComponent, editButtonActionRowComponent]
					})
				});

				modalInteraction.reply({
					content: 'Your post has been created - now go apply tags!',
					flags: MessageFlags.Ephemeral
				});
			})
			.catch((err) => {
				console.log(`Error: ${err}`);
			})
	},
};
