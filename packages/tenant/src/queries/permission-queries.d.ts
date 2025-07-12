import type { CheckPermissionInput, Permission } from '../types';
export declare function checkPermission(input: CheckPermissionInput): Promise<boolean>;
export declare function getUserPermissions(tenantId: string, userId: string): Promise<Permission[]>;
//# sourceMappingURL=permission-queries.d.ts.map