import { CommandBuilder, Argv } from "yargs";

// demo application - CLI application that dispatches CLI actions/commands

export interface CliCommand<T = {}, U = {}> {
  name: string;
  description: string;
  buildOptions?: CommandBuilder<T, U>;
  handler: () => any;
}

// let's add some demo commands with dependencies
function DemoOneCommand(
  logger: Logger   // our demo dependencies
): CliCommand {
  return {
    name: "demo-command-1",
    description: "Shows demo 1",
    handler: async (): Promise<void> => {
      logger.info(`Demo 1 Command`);
    },
  };
}

function DemoTwoCommand(
  logger: Logger   // our demo dependencies
): CliCommand {
  return {
    name: "demo-command-2",
    description: "Shows demo 2",
    handler: async (): Promise<void> => {
      logger.info(`Demo 2 Command`);
    },
  };
}

// this main command that dispatches all other commands
type IMainCommand = CliCommand & {
  addCommand: (comonad: CliCommand) => void;
};

export default function MainCommand(): IMainCommand {
  const commands: CliCommand[] = [];
  const buildOptions = (ya: Argv) => {
    ya.scriptName("yarn do")
      .usage("Usage: yarn do <command>")
      .strictCommands()
      .demandCommand(1)
      .help();
    commands.map((c) => {
      ya.command({
        command: c.name,
        describe: c.description,
        builder: c.buildOptions,
        handler: c.handler,
      });
    });
    return ya;
  };
  return {
    name: "do",
    description: "main command",
    addCommand: (command: CliCommand) => {
      commands.push(command);
    },

    buildOptions,

    handler: async () => {},
  };
}

// cli.ts - entry point

// pacjake.json
// {
//   "scripts": {
//     "do": "ts-node src/cli.ts",


// #!/usr/bin/env node
import yargs from "yargs";

const diContainer = configureDI();
const mainCommand = diContainer.get(MainCommand);

(async () => {
  try {
    // @ts-ignore
    await mainCommand.buildOptions(yargs).argv;
  } catch (e) {
    // Deal with the fact the chain failed
  } finally {
    // your tear down functionality
  }
})();



// yarn do --help
// yarn do demo-command-1