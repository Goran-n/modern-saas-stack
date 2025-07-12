import postgres from 'postgres';
import * as schema from './schemas';
export type DrizzleClient = ReturnType<typeof createDrizzleClient>;
export declare function createDrizzleClient(connectionString: string): import("drizzle-orm/postgres-js").PostgresJsDatabase<typeof schema> & {
    $client: postgres.Sql<{}>;
};
export { schema };
//# sourceMappingURL=client.d.ts.map