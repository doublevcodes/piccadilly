const fs = require('fs');
const path = require('path');
const equal = require('fast-deep-equal');
const { grantToken, getCommands, registerCommand, updateCommand, removeCommand } = require('../utils/discord');

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
        newCmd.options && newCmd.options.map(consistentCommandOption),
    ),
});

const updatedCommandPatch = (cmd, diff) => Object.keys(cmd)
    .filter(key => key in diff && diff[key])
    .reduce((obj, key) => {
        obj[key] = cmd[key];
        return obj;
    }, {});

module.exports.getCommands = () => {
    const commands = [];

    const commandDirectory = path.join(__dirname, '..', 'commands');
    const commandFiles = fs.readdirSync(commandDirectory);

    for (const commandFile of commandFiles) {
        if (!commandFile.endsWith('.js')) continue;
        const commandData = require(path.join(commandDirectory, commandFile));


        if (!('name' in commandData)) continue;
        if (!('execute' in commandData)) continue;

        delete commandData.execute;
        commandData.file = commandFile;

        commands.push(commandData);
    }

    return commands;
};

module.exports.registerCommands = async commands => {
    const token = await grantToken();
    console.log(`💳 Received grant token from Discord with scope: ${token.scope}`)

    const discordCommands = await getCommands(process.env.CLIENT_ID, token.access_token, token.token_type);
    console.log(`🌍 Retrieved existing commands from GitHub. There ${discordCommands.length === 1 ? 'was' : 'were'} ${discordCommands.length} existing.`)

    for (const command of discordCommands) {
        console.log(`🗑️  Removing command: /${command.name}`)
        if (commands.find(cmd => cmd.name === command.name)) continue;
        await removeCommand(process.env.CLIENT_ID, token.access_token, token.token_type, command.id);
        await new Promise(resolve => setTimeout(resolve, 250));
    }

    const commandData = [];
    for (const command of commands) {
        console.log(`Currently registering command: /${command.name}`)
        const discordCommand = discordCommands.find(cmd => cmd.name === command.name);

        if (discordCommand) {
            console.log(`Command /${command.name} already existed on Discord... patching command to latest version now`)
            const cmdDiff = updatedCommandProps(discordCommand, command);

            if (Object.values(cmdDiff).includes(true)) {
                const cmdPatch = updatedCommandPatch(command, cmdDiff);
                const data = await updateCommand(process.env.CLIENT_ID, token.access_token, token.token_type, discordCommand.id, cmdPatch);
                await new Promise(resolve => setTimeout(resolve, 250));
                commandData.push({ ...command, ...data });
                continue;
            }

            console.log(`No command data for /${command.name} was changed. Re-registering existing command`)
            commandData.push({ ...discordCommand, ...command });
            continue;
        }

        console.log(`The command /${command.name} did not exist before; registering the command now`)
        const data = await registerCommand(process.env.CLIENT_ID, token.access_token, token.token_type, command);
        await new Promise(resolve => setTimeout(resolve, 250));
        commandData.push({ ...command, ...data });
    }

    console.log("Returning updated and registered commands for dispatch to Discord")
    return commandData;
};
