module.exports.createEmbed = (title, description, footer = '') => ({
    title: `Picaddilly: ${title}`,
    description: description,
    colour: 0xfea500,
    timestamp: (new Date).toISOString(),
    footer: footer ? {
        text: footer
    } : null,
});