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
  constructor(name: string) {
    super(`Dependency resolver with name ${name} is not defined`);
    this.name = new.target.name;
  }
}

export class ForbiddenNameError extends Error {
  constructor(name: string) {
    super(`Dependency resolver with name ${name} is not allowed`);
    this.name = new.target.name;
  }
}
