const { InteractionType, InteractionResponseType, MessageFlags } = require('discord-api-types/payloads/v9');
const verify = require('./utils/verify');
// const Privacy = require('./utils/privacy');
const commands = require('../tmp/commands.json');

const jsonResponse = obj => new Response(JSON.stringify(obj), {
    headers: {
        'Content-Type': 'application/json',
    },
});

// const redirectResponse = url => new Response(null, {
//     status: 301,
//     headers: {
//         Location: url,
//     },
// });

const handleCommandInteraction = async ({ body, wait }) => {
    const commandData = commands[body.data.id];
    if (!commandData) return new Response(null, { status: 404 });

    try {
        const command = require(`./commands/${commandData.file}`);

        return await command.execute({ interaction: body, response: jsonResponse, wait });
    } catch (err) {
        console.log(body);
        console.error(err);

        return jsonResponse({
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
                content: 'An unexpected error occurred when executing the command.',
                flags: MessageFlags.Ephemeral,
            },
        });
    }
};

const handleComponentInteraction = async ({ body, wait }) => {
    try {
        const component = require(`./components/${body.data.custom_id}.js`);

        return await component.execute({ interaction: body, response: jsonResponse, wait });
    } catch (err) {
        if (err.code === 'MODULE_NOT_FOUND') return new Response(null, { status: 404 });

        console.log(body);
        console.error(err);

        return new Response(null, {  status: 500 });
    }
};

const handleInteraction = async ({ request, wait }) => {
    const bodyText = await request.text();

    if (!await verify(request, bodyText)) return new Response(null, { status: 401 });

    const body = JSON.parse(bodyText);

    switch (body.type) {
        case InteractionType.Ping:
            return jsonResponse({
                type: InteractionResponseType.Pong,
            });

        case InteractionType.ApplicationCommand:
            return handleCommandInteraction({ body, wait });

        case InteractionType.MessageComponent:
            return handleComponentInteraction({ body, wait });

        default:
            return new Response(null, { status: 501 });
    }
};

const handleRequest = async ({ request, wait }) => {
    const url = new URL(request.url);

    if (request.method === 'POST' && url.pathname === '/interactions')
        return await handleInteraction({ request, wait });
};

addEventListener('fetch', event => {

    return event.respondWith(handleRequest({
        request: event.request,
        wait: event.waitUntil.bind(event),
    }).catch(err => {
        console.error(err);
        throw err;
    }));
});
