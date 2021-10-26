const { InteractionType, InteractionResponseType, MessageFlags } = require("discord-api-types/payloads/v9");
const WorkersSentry = require("workers-sentry/worker")
const verify = require("./utils/verify");
const Privacy = require("./utils/privacy");
const commands = require("../tmp/commands.json");

const jsonResponse = obj => new Response(JSON.stringify(obj), {
    headers: {
        "Content-Type": "application/json"
    },
});

const redirectResponse = url => new Response(null, {
    status: 301,
    headers: {
        Location: url
    },
});

const handleCommandInteraction = async ({ body, wait, sentry }) => {
    const commandData = commands[body.data.id];
    if (!commandData) return new Response(null, { status: 404 })

    try {
        const command = require(`./commands/${commandData.file}`);

        return await command.execute({ interaction: body, response: jsonResponse, wait, sentry })
    } catch(err) {
        console.log(body);
        console.error(err);
        sentry.captureException(err);

        return jsonResponse({
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
                content: "An unexpected error occurred when executing the command.",
                flags: MessageFlags.Ephemeral
            }
        })
    }
}

const handleComponentInteraction = async ({ body, wait, sentry }) => {
    try {
        const component = require(`./components/${body.data.custom_id}.js`);

        return await component.execute({ interaction: body, response: jsonResponse, wait, sentry });
    } catch (err) {
        if (err.code === "MODULE_NOT_FOUND") return new Response(null, { status: 404 })

        console.log(body);
        console.error(err);
        sentry.captureException(err)

        return new Response(null, {  status: 500 })
    }
}

const handleInteraction = async ({ request, wait, sentry }) => {
    const bodyText = await request.text();
    sentry.setRequestBody(bodyText)

    if (!await verify(request, bodyText)) return new Response(null, { status: 401 })

    const body = JSON.parse(bodyText);
    sentry.setRequestBody(body)

    switch(body.type) {
        case InteractionType.Ping:
            return jsonResponse({
                type: InteractionResponseType.Pong,
            });
        
        case InteractionType.ApplicationCommand:
            return handleCommandInteraction({ body, wait, sentry })

        case InteractionType.MessageComponent:
            return handleComponentInteraction({ body, wait, sentry })

        default:
            return new Response(null, { status: 501 })
    }
}

const handleRequest = async ({ request, wait, sentry }) => {
    const url = new URL(request.url);

    if (request.method === 'POST' && url.pathname === '/interactions')
        return await handleInteraction({ request, wait, sentry });
}

addEventListener('fetch', event => {
    const sentry = new WorkersSentry(event, process.env.SENTRY_DSN);

    return event.respondWith(handleRequest({
        request: event.request,
        wait: event.waitUntil.bind(event),
        sentry,
    }).catch(err => {
        console.error(err);
        sentry.captureException(err);
        throw err;
    }));
});