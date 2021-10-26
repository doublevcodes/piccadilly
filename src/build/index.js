const path = require('path');
const fs = require('fs').promises;

const { getCommands, registerCommands } = require('./commands');

const mkdirSafe = path => fs.access(path).catch(() => fs.mkdir(path, { recursive: true }));

module.exports = async () => {
    const tmp = path.join('..', '..', 'tmp');
    await mkdirSafe(tmp);

    await fs.writeFile(path.join(tmp, 'commands.json'), JSON.stringify({}, null, 2));

    const commands = getCommands();

    const discordCommands = await registerCommands(commands);

    const discordCommandsObj = discordCommands.reduce((obj, cmd) => {
        obj[cmd.id] = cmd;
        return obj;
    }, {});
    await fs.writeFile(path.join(tmp, 'commands.json'), JSON.stringify(discordCommandsObj, null, 2));

    console.log('Command data successfully generated');
};
