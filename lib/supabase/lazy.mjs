export function createLazyProxy(factory) {
  let instance = null;

  const getInstance = () => {
    if (instance === null) {
      instance = factory();
    }

    return instance;
  };

  return new Proxy({}, {
    get(_target, property, receiver) {
      const target = getInstance();
      const value = Reflect.get(target, property, receiver);

      if (typeof value === "function") {
        return value.bind(target);
      }

      return value;
    },
    set(_target, property, value) {
      return Reflect.set(getInstance(), property, value);
    },
    has(_target, property) {
      return property in getInstance();
    },
    ownKeys() {
      return Reflect.ownKeys(getInstance());
    },
    getOwnPropertyDescriptor(_target, property) {
      return Object.getOwnPropertyDescriptor(getInstance(), property);
    },
  });
}
