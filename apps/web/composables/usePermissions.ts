export const usePermissions = () => {
  const supabaseUser = useSupabaseUser();
  const tenantStore = useTenantStore();

  // Get current member based on tenant selection
  const currentMember = computed(() => {
    if (!tenantStore.selectedTenantId || !supabaseUser.value) return null;
    
    const member = tenantStore.userTenants.find(
      ut => ut.tenantId === tenantStore.selectedTenantId && 
      ut.userId === supabaseUser.value.id
    );
    
    return member;
  });

  const role = computed(() => currentMember.value?.role || 'viewer');

  const isOwner = computed(() => role.value === 'owner');
  const isAdmin = computed(() => role.value === 'admin' || isOwner.value);
  const isMember = computed(() => role.value === 'member' || isAdmin.value);
  const isViewer = computed(() => ['viewer', 'member', 'admin', 'owner'].includes(role.value));

  const permissions = computed(() => {
    const rolePermissions: Record<string, string[]> = {
      owner: [
        'tenant:view',
        'tenant:update',
        'tenant:delete',
        'member:view',
        'member:invite',
        'member:update',
        'member:remove',
        'communication:view',
        'communication:send',
        'communication:manage',
        'integration:view',
        'integration:manage',
        'sync:view',
        'sync:execute',
        'sync:manage',
      ],
      admin: [
        'tenant:view',
        'tenant:update',
        'member:view',
        'member:invite',
        'member:update',
        'communication:view',
        'communication:send',
        'communication:manage',
        'integration:view',
        'integration:manage',
        'sync:view',
        'sync:execute',
        'sync:manage',
      ],
      member: [
        'tenant:view',
        'member:view',
        'communication:view',
        'communication:send',
        'integration:view',
        'sync:view',
        'sync:execute',
      ],
      viewer: [
        'tenant:view',
        'member:view',
        'communication:view',
        'integration:view',
        'sync:view',
      ],
    };

    return rolePermissions[role.value] || [];
  });

  const hasPermission = (permission: string): boolean => {
    return permissions.value.includes(permission);
  };

  const can = {
    // Tenant permissions
    viewTenant: computed(() => hasPermission('tenant:view')),
    updateTenant: computed(() => hasPermission('tenant:update')),
    deleteTenant: computed(() => hasPermission('tenant:delete')),
    
    // Member permissions
    viewMembers: computed(() => hasPermission('member:view')),
    inviteMembers: computed(() => hasPermission('member:invite')),
    updateMembers: computed(() => hasPermission('member:update')),
    removeMembers: computed(() => hasPermission('member:remove')),
    
    // Communication permissions
    viewCommunications: computed(() => hasPermission('communication:view')),
    sendCommunications: computed(() => hasPermission('communication:send')),
    manageCommunications: computed(() => hasPermission('communication:manage')),
    
    // Integration permissions
    viewIntegrations: computed(() => hasPermission('integration:view')),
    manageIntegrations: computed(() => hasPermission('integration:manage')),
    
    // Sync permissions
    viewSync: computed(() => hasPermission('sync:view')),
    executeSync: computed(() => hasPermission('sync:execute')),
    manageSync: computed(() => hasPermission('sync:manage')),
  };

  return {
    currentMember,
    role,
    isOwner,
    isAdmin,
    isMember,
    isViewer,
    permissions,
    hasPermission,
    can,
  };
};