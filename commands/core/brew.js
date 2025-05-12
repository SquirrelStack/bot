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
	SectionBuilder
} = require('discord.js');

module.exports = {
	category: 'core',
	data: {
		name: 'brew',
		description: 'Create a new brew'
	},
	async execute(interaction) {
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

		const firstActionRow = new ActionRowBuilder().addComponents(brewNameInput);
		const secondActionRow = new ActionRowBuilder().addComponents(brewLinkInput);
		const thirdActionRow = new ActionRowBuilder().addComponents(brewInfoInput);

		// Add inputs to the modal
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

				// Get site name
				const siteName = new URL(brewLink).hostname;

				// Set role
				const role = roleMention(brewerRoleId);

				// Create message components
				//const brewImageComponent = new MediaGalleryBuilder().addItems([{ media: { url: metadata.image } }]);
				const brewTitleComponent = new TextDisplayBuilder().setContent(`# ${brewName}`);
				const brewAuthorComponent = new TextDisplayBuilder().setContent(`Poster: ${interaction.member}`);
				const brewLinkComponent = new TextDisplayBuilder().setContent(`**[View on ${siteName}](${brewLink})**`);
				const brewButtonComponent = new ButtonBuilder()
					.setLabel(`${siteName}`)
					.setStyle(ButtonStyle.Link)
					.setURL(brewLink)
				const sectionComponent = new SectionBuilder()
					.addTextDisplayComponents(brewTitleComponent, brewAuthorComponent, brewLinkComponent)
					.setButtonAccessory(brewButtonComponent)
				const brewSeparatorComponent = new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large);
				const brewInfoComponent = new TextDisplayBuilder().setContent(brewInfo);
				const brewMentionComponent = new TextDisplayBuilder().setContent(`\nTime to get to work ${role}!`);
				const brewContainerComponent = new ContainerBuilder()
					.addSectionComponents(sectionComponent)
					.addSeparatorComponents(brewSeparatorComponent)
					.addTextDisplayComponents(brewInfoComponent, brewMentionComponent)

				// Create forum post
				const forum = interaction.guild.channels.cache.get(brewChannelId);
				forum.threads.create({
					name: `${interaction.member.displayName} - ${brewName}`,
					message: ({
						flags: MessageFlags.IsComponentsV2,
						components: [brewContainerComponent]
					})
				});

				modalInteraction.reply({
					content: 'Your post has been created - Be sure to apply the appropriate tags to your post.',
					flags: MessageFlags.Ephemeral
				});
			})
			.catch((err) => {
				console.log(`Error: ${err}`);
			})
	},
};
