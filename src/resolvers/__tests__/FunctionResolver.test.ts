import FunctionResolver from "../FunctionResolver";
import { diUse } from "../../resolversShorthands";
import DIContainer from "../../DIContainer";

describe(FunctionResolver.name, () => {
    test("it accepts raw values as parameters", () => {
        function factoryA(s: string) {
            return s;
        }

        const resolver = new FunctionResolver(factoryA, "abc");
        expect(resolver.resolve(new DIContainer())).toEqual("abc");
    });

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

        const resolver = new FunctionResolver(createProcessTask, diUse(Logger));
        const container = new DIContainer();
        container.add({
            Logger: new Logger(),
        });
        const processTask = resolver.resolve(container);
        expect(processTask(new Task())).toEqual("Done");
    });

    test("it accepts raw and references as parameters", () => {
        function factoryA(s: string, n: number) {
            return s + n;
        }

        const container = new DIContainer();
        container.add({
            n: 3,
        });
        const resolver = new FunctionResolver(factoryA, "20", diUse("n"));
        expect(resolver.resolve(container)).toEqual("203");
    });
});
