const fs = require('fs')
const path = require('path')
const equal = require('fast-deep-equal')
const { grantToken, getCommands, registerCommand, updateCommand, removeCommand } = require("../utils/discord")

const consistentCommandOption = obj => ({
    type: obj.type,
    name: obj.name,
    description: obj.description,
    default: !!obj.default,
    required: !!obj.required,
    choices: obj.choices || [],
    options: obj.options || [],
});

const updatedCommandProps = (newCmd, oldCmd) => ({
    name: oldCmd.name !== newCmd.name,
    description: oldCmd.description !== newCmd.description,
    options: !equal(
        oldCmd.options && oldCmd.options.map(consistentCommandOption),
        newCmd.options && newCmd.options.map(consistentCommandOption)
    )
});

const updatedCommandPatch = (cmd, diff) => Object.keys(cmd)
    .filter(key => key in diff && diff[key])
    .reduce((obj, key) => {
        obj[key] = cmd[key];
        return obj;
    }, {});

module.exports.getCommands = () => {
    const commands = [];

    const commandDirectory = path.join(__dirname, "..", "commands");
    const commandFiles = fs.readdirSync(commandDirectory);

    for (const commandFile of commandFiles) {
        if (!commandFile.endsWith(".js")) continue;
        const commandData = require(path.join(commandDirectory, commandFile));


        if (!("name" in commandData)) continue;
        if (!("execute" in commandData)) continue;

        delete commandData.execute;
        commandData.file = commandFile;

        commands.push(commandData);
    }

    return commands;
}

module.exports.registerCommands = async commands => {
    const token = await grantToken();

    const discordCommands = await getCommands(process.env.CLIENT_ID, token.access_token, token.token_type, process.env.TEST_GUILD_ID);

    for (const command of discordCommands) {
        if (commands.find(cmd => cmd.name === command.name)) continue;
        await removeCommand(process.env.CLIENT_ID, token.access_token, token.token_type, command.id, process.env.TEST_GUILD_ID);
        await new Promise(resolve => setTimeout(resolve, 250))
    }

    const commandData = [];
    for (const command of commands) {
        const discordCommand = discordCommands.find(cmd => cmd.name === command.name);
        
        if (discordCommand) {
            const cmdDiff = updatedCommandProps(discordCommand, command);

            if (Object.values(cmdDiff).includes(true)) {
                const cmdPatch = updatedCommandPatch(command, cmdDiff);
                const data = await updateCommand(process.env.CLIENT_ID, token.access_token, token.token_type, discordCommand.id, cmdPatch, process.env.TEST_GUILD_ID);
                await new Promise(resolve => setTimeout(resolve, 250));
                commandData.push({ ...command, ...data });
                continue;
            }

            commandData.push({ ...discordCommand, ...command });
            continue;
        }

        const data = await registerCommand(process.env.CLIENT_ID, token.access_token, token.token_type, command, process.env.TEST_GUILD_ID);
        await new Promise(resolve => setTimeout(resolve, 250));
        commandData.push({ ...command, ...data });
    }

    return commandData;
}