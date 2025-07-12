import type { User, AuthToken } from '../types';
export declare function generateTenantToken(userId: string, tenantId?: string): Promise<string>;
export declare function verifyToken(token: string): Promise<AuthToken>;
export declare function updateUser(userId: string, updates: Partial<User>): Promise<User>;
//# sourceMappingURL=auth-actions.d.ts.map