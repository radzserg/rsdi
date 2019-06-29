export interface IDIContainer {
  get: <T>(serviceName: string) => T;
  // set: (serviceName: string, value: any) => IDIContainer;
  // registerClass: (className: object) => IDIContainer;
}

export default class DIContainer implements IDIContainer {
  private definitions = {};

  get<T>(serviceName: string): T {
    return null;
  };

  register(value: any, name: string = undefined): void {
    const typeofValue = typeof value;
    if (typeofValue === "function") {
      if (this.isConstructor(value)) {
        console.log("constructor")
      }
    }
    // console.log(value.name);
  }

  registerConstructor(value: any, name: string = undefined) {

  }

  private isConstructor(obj: any) {
    return !!obj.prototype && !!obj.prototype.constructor.name;
  }


  /**
  set(key: any, value: any) {
    // @ts-ignore
    this.deps[key] = value;
    return this;
  }

  get(key: any) {
    // @ts-ignore
    if (!this.deps[key]) {
      throw new Error(`Missing dependency: ${key}`);
    }
    // @ts-ignore
    return this.deps[key];
  }
   */
}

