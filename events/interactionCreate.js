const { Events, MessageFlags } = require('discord.js');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {

        if (interaction.isButton()) {
            const button = interaction.client.buttons.get(interaction.customId);
            if (!button) {
                await interaction.reply({ content: 'This button does nothing', flags: MessageFlags.Ephemeral });
                return;
            }

            try {
                await button.execute(interaction, client);
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: 'There was an error while executing this button', flags: MessageFlags.Ephemeral });
            }
            return;
        }

        if (interaction.isChatInputCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);
            if (!command) {
                console.error(`No command matching ${interaction.commandName} was found.`);
                return;
            }

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(error);
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: 'There was an error while executing this command', flags: MessageFlags.Ephemeral });
                } else {
                    await interaction.reply({ content: 'There was an error while executing this command', flags: MessageFlags.Ephemeral });
                }
            }
        }
    },
};
