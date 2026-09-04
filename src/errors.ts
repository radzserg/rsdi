// Every error sets `name` from its constructor so a log line or stack trace reads
// `DependencyIsMissingError: …` rather than `Error: …`. `new.target.name` rather than a literal so
// a subclass reports itself and the two can never drift apart.
export class CircularDependencyError extends Error {
  constructor(path: readonly string[]) {
    super(`Circular dependency detected: ${path.join(' -> ')}`);
    this.name = new.target.name;
  }
}

export class DenyOverrideDependencyError extends Error {
  constructor(name: string) {
    super(`Dependency resolver with name ${name} is already defined, use update method instead`);
    this.name = new.target.name;
  }
}

export class DependencyIsMissingError extends Error {
  /**
   * @param name the name that was asked for
   * @param resolving the factories that were running at the time, outermost first — so a name a
   * factory destructured but no module provides is reported against the factory that asked
   */
  constructor(name: string, resolving: readonly string[] = []) {
    super(
      resolving.length === 0
        ? `Dependency resolver with name ${name} is not defined`
        : `Dependency resolver with name ${name} is not defined; requested while resolving ${resolving.join(' -> ')}`,
    );
    this.name = new.target.name;
  }
}

export class ForbiddenNameError extends Error {
  /**
   * @param name the rejected name
   * @param reason why, when it is not the default case of a reserved container member
   */
  constructor(name: string, reason = 'it is a reserved container member') {
    super(`Dependency resolver with name ${name} is not allowed: ${reason}`);
    this.name = new.target.name;
  }
}

export class InvalidContainerError extends Error {
  /**
   * @param method which entry point was called — the argument positions are the same in both
   * @param position the 1-based argument position in that call
   * @param received a description of what was passed instead — see `describeValue`
   */
  constructor(method: 'compose' | 'merge', position: number, received: string) {
    super(`${method} expects containers; argument ${position} is ${received}`);
    this.name = new.target.name;
  }
}

export class InvalidResolverError extends Error {
  constructor(name: string, received: unknown) {
    // `typeof null` is 'object', which would point at the wrong mistake.
    const kind = received === null ? 'null' : typeof received;
    super(
      `Dependency resolver with name ${name} must be a function, received ${kind}; wrap a value as () => value`,
    );
    this.name = new.target.name;
  }
}
