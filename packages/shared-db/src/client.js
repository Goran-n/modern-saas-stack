import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schemas';
export function createDrizzleClient(connectionString) {
    const queryClient = postgres(connectionString);
    return drizzle(queryClient, { schema });
}
export { schema };
//# sourceMappingURL=client.js.map