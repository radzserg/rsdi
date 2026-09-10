import { DIContainer } from '../../index.js';

// database.ts
export type Pool = { query: (sql: string) => Promise<unknown[]> };

export const buildDatabaseDependencies = async (createPool: () => Promise<Pool>) => {
  const pool = await createPool();
  return new DIContainer().add('databasePool', () => pool);
};

// dataAccess.ts
type DIWithPool = Awaited<ReturnType<typeof buildDatabaseDependencies>>;

export const addDataAccessDependencies = (container: DIWithPool) =>
  container.add('userRepository', ({ databasePool }) => ({
    findAll: () => databasePool.query('SELECT * FROM users'),
  }));

// services.ts
type DIWithDataAccess = ReturnType<typeof addDataAccessDependencies>;

export const addServices = (container: DIWithDataAccess) =>
  container.add('userService', ({ userRepository }) => ({
    listUsers: () => userRepository.findAll(),
  }));

// diContainer.ts — pass your database driver's async pool initializer here
export const configureDI = async (createPool: () => Promise<Pool>) => {
  const container = await buildDatabaseDependencies(createPool);
  return container.extend(addDataAccessDependencies).extend(addServices);
};
