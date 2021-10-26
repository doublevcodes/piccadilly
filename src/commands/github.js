const { InteractionResponseType } = require('discord-api-types/payloads/v9');
const { createEmbed } = require('../utils/embed');

module.exports = {
    name: 'github',
    description: 'Get a link to the open-source GitHub repository for Piccadilly',
    execute: async ({ response }) => response({
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
            embeds: [
                createEmbed(
                    'GitHub',
                    'View the Piccadilly source code on GitHub at https://git.vivaanverma.com/piccadilly/',
                ),
            ],
        },
    }),
};
