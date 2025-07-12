# Permissions Architecture Style Guide

## Overview
This document explains the permission handling architecture for the Kibly platform, specifically how permissions should be structured across different layers of the system.

## Core Principle: Multi-Layered Permission Architecture

### **Key Rule: Permissions are enforced at the API layer, NOT in domain packages**

## Architecture Layers

### 1. **tRPC Router Layer (Application Layer)**
**Role**: Permission enforcement and request handling
**Responsibilities**:
- Authenticate users and validate sessions
- Check permissions using middleware
- Enforce tenant isolation
- Handle authorization errors
- Call domain services with validated context

**Example**:
```typescript
// apps/api/src/routers/files.ts
export const filesRouter = createTRPCRouter({
  upload: protectedProcedure
    .use(withTeamPermissionMiddleware)           // ✅ Tenant validation
    .use(withScopeMiddleware(['files.write']))   // ✅ Permission check
    .input(uploadFileSchema)
    .mutation(async ({ input, ctx: { db, teamId, user, supabase } }) => {
      // ✅ Permissions validated - safe to call domain service
      return uploadFile(supabase, input.file, {
        ...input,
        tenantId: teamId,
        uploadedBy: user.id
      }, db);
    }),
});
```

### 2. **Domain Package Layer (Business Logic)**
**Role**: Pure business logic and data operations
**Responsibilities**:
- Implement file operations (upload, download, delete)
- Handle file metadata and storage
- Manage business rules and validation
- Assume permissions are already validated

**Example**:
```typescript
// packages/file-manager/src/operations.ts
export async function uploadFile(
  client: SupabaseClient,
  file: File,
  input: CreateFileInput, // ✅ Already contains validated tenantId
  db: Database
): Promise<string> {
  // ✅ Pure business logic - no permission checks
  // ✅ Assumes caller has validated access
  const sanitizedFileName = stripSpecialCharacters(file.name);
  const fullPath = [...input.pathTokens, sanitizedFileName];
  
  // Upload to storage and save metadata
  const publicUrl = await upload(client, { file, path: fullPath, bucket: input.bucket });
  const [record] = await db.insert(files).values({ ...input, fileName: sanitizedFileName, pathTokens: fullPath }).returning();
  
  return record.id;
}
```

## Permission System Components

### 1. **Scope-Based Permissions**
```typescript
// File-specific scopes
const fileScopes = [
  'files.read',      // View files
  'files.write',     // Upload/modify files
  'files.delete',    // Delete files
  'files.share',     // Share files with others
  'files.admin'      // Full file management
];
```

### 2. **Middleware Chain**
```typescript
// Permission middleware stack
export const fileProtectedProcedure = protectedProcedure
  .use(withTeamPermissionMiddleware)    // Tenant isolation
  .use(withScopeMiddleware)             // Permission validation
  .use(withFileAccessMiddleware);       // File-specific checks
```

### 3. **Tenant Isolation**
```typescript
// All file operations include tenant filtering
const fileQuery = db
  .select()
  .from(files)
  .where(eq(files.tenantId, ctx.teamId)); // ✅ Automatic tenant isolation
```

## Current Kibly Architecture Analysis

Based on the existing codebase patterns:

### **Existing Strengths**:
- ✅ JWT-based authentication with `@kibly/shared-auth`
- ✅ Tenant isolation through `tenantId` in user metadata
- ✅ tRPC middleware for protected procedures
- ✅ Scope-based permission system (from Midday reference)
- ✅ Multi-layered security architecture

### **Permission Flow**:
1. **Authentication**: JWT token validation
2. **Authorization**: Scope and team permission checks
3. **Tenant Isolation**: Automatic filtering by `tenantId`
4. **Domain Logic**: Pure business operations

## Best Practices

### ✅ **DO**:
- Enforce permissions at the tRPC router level
- Use middleware for consistent permission checks
- Keep domain packages permission-agnostic
- Validate tenant access on every request
- Cache permission checks for performance
- Use scopes for granular access control

### ❌ **DON'T**:
- Put permission logic in domain packages
- Bypass the middleware chain
- Assume permissions without validation
- Mix authentication with business logic
- Hardcode permission checks in services

## Security Considerations

### **Tenant Isolation**:
Every file operation must include tenant validation:
```typescript
// ✅ Correct
const file = await db.select().from(files)
  .where(and(eq(files.id, fileId), eq(files.tenantId, teamId)));

// ❌ Incorrect - missing tenant isolation
const file = await db.select().from(files)
  .where(eq(files.id, fileId));
```

### **Path-Based Security**:
```typescript
// Different permission levels for different paths
const pathPermissions = {
  '/integrations/xero/': ['files.read'],           // Read-only integration files
  '/uploads/': ['files.read', 'files.write'],     // User uploads
  '/shared/': ['files.read', 'files.share'],      // Shared files
};
```

## Error Handling

### **Permission Errors**:
```typescript
// Consistent error handling
if (!hasScope('files.read')) {
  throw new TRPCError({ 
    code: 'FORBIDDEN', 
    message: 'Insufficient permissions for file access' 
  });
}

if (!file || file.tenantId !== teamId) {
  throw new TRPCError({ 
    code: 'NOT_FOUND', 
    message: 'File not found' 
  });
}
```

## Testing Strategy

### **Unit Tests**:
- Test domain logic without authentication
- Mock validated contexts in domain tests
- Test permission middleware separately

### **Integration Tests**:
- Test full permission flow through tRPC
- Verify tenant isolation works correctly
- Test permission error scenarios

## Future Considerations

### **File Sharing**:
- Implement sharing scopes and temporary access
- Add file-specific permission overrides
- Support collaboration features

### **Audit Trail**:
- Log all file access attempts
- Track permission changes
- Monitor for security violations

### **Performance**:
- Cache permission checks with TTL
- Optimise database queries for tenant filtering
- Use read replicas for permission lookups

## Summary

The Kibly permission architecture follows a clear separation of concerns:
- **tRPC Layer**: Handles authentication, authorization, and request validation
- **Domain Layer**: Implements pure business logic with validated contexts
- **Infrastructure Layer**: Manages external dependencies and storage

This approach ensures security, maintainability, and testability while following established patterns in the codebase.