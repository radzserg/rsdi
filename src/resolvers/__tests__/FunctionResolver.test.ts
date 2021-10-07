import FunctionResolver from "../FunctionResolver";
import { diUse } from "../../resolversShorthands";
import DIContainer from "../../DIContainer";

describe(FunctionResolver.name, () => {
    test("it accepts references as parameters", () => {
        class Logger {
            public info(message: string) {
                // do nothing
            }
        }
        class Task {}
        function createProcessTask(logger: Logger) {
            return (task: Task) => {
                logger.info("Finished ${task.id}");
                return "Done";
            };
        }

        const definition = new FunctionResolver(
            createProcessTask,
            diUse(Logger)
        );
        const container = new DIContainer();
        container.add({
            Logger: new Logger(),
        });
        const processTask = definition.resolve(container);
        expect(processTask(new Task())).toEqual("Done");
    });
});
