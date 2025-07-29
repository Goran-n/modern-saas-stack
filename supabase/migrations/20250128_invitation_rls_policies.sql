-- Enable RLS on all tenant-related tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Users table policies
-- Users can view their own record
CREATE POLICY "users_self_view" ON users
FOR SELECT USING (
  auth.uid()::text = id
);

-- Users can update their own record
CREATE POLICY "users_self_update" ON users
FOR UPDATE USING (
  auth.uid()::text = id
);

-- Tenants table policies
-- Tenant members can view their tenant
CREATE POLICY "tenant_members_view_own" ON tenants
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM tenant_members
    WHERE tenant_members.tenant_id = tenants.id
    AND tenant_members.user_id = auth.uid()::text
    AND tenant_members.status = 'active'
  )
);

-- Only owners can update tenant
CREATE POLICY "tenant_owners_update" ON tenants
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM tenant_members
    WHERE tenant_members.tenant_id = tenants.id
    AND tenant_members.user_id = auth.uid()::text
    AND tenant_members.role = 'owner'
    AND tenant_members.status = 'active'
  )
);

-- Tenant members table policies
-- Members can view other members in same tenant
CREATE POLICY "tenant_members_view_same_tenant" ON tenant_members
FOR SELECT USING (
  tenant_id IN (
    SELECT tenant_id FROM tenant_members tm
    WHERE tm.user_id = auth.uid()::text
    AND tm.status = 'active'
  )
);

-- Admins and owners can insert new members
CREATE POLICY "tenant_members_insert" ON tenant_members
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM tenant_members tm
    WHERE tm.tenant_id = tenant_members.tenant_id
    AND tm.user_id = auth.uid()::text
    AND tm.role IN ('admin', 'owner')
    AND tm.status = 'active'
  )
);

-- Admins and owners can update members (except owners can't be demoted by non-owners)
CREATE POLICY "tenant_members_update" ON tenant_members
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM tenant_members tm
    WHERE tm.tenant_id = tenant_members.tenant_id
    AND tm.user_id = auth.uid()::text
    AND tm.role IN ('admin', 'owner')
    AND tm.status = 'active'
  )
  AND (
    -- Can't demote an owner unless you're an owner
    tenant_members.role != 'owner' 
    OR EXISTS (
      SELECT 1 FROM tenant_members tm2
      WHERE tm2.tenant_id = tenant_members.tenant_id
      AND tm2.user_id = auth.uid()::text
      AND tm2.role = 'owner'
      AND tm2.status = 'active'
    )
  )
);

-- Admins and owners can delete members (except last owner)
CREATE POLICY "tenant_members_delete" ON tenant_members
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM tenant_members tm
    WHERE tm.tenant_id = tenant_members.tenant_id
    AND tm.user_id = auth.uid()::text
    AND tm.role IN ('admin', 'owner')
    AND tm.status = 'active'
  )
  -- Prevent deleting the last owner
  AND (
    tenant_members.role != 'owner'
    OR (
      SELECT COUNT(*) FROM tenant_members tm2
      WHERE tm2.tenant_id = tenant_members.tenant_id
      AND tm2.role = 'owner'
      AND tm2.status = 'active'
    ) > 1
  )
);

-- Invitations table policies
-- Admins and owners can view invitations for their tenant
CREATE POLICY "invitations_view" ON invitations
FOR SELECT USING (
  tenant_id IN (
    SELECT tenant_id FROM tenant_members
    WHERE user_id = auth.uid()::text
    AND role IN ('admin', 'owner')
    AND status = 'active'
  )
);

-- Admins and owners can create invitations
CREATE POLICY "invitations_insert" ON invitations
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM tenant_members
    WHERE tenant_members.tenant_id = invitations.tenant_id
    AND tenant_members.user_id = auth.uid()::text
    AND tenant_members.role IN ('admin', 'owner')
    AND tenant_members.status = 'active'
  )
);

-- Admins and owners can update invitations (for accepting)
CREATE POLICY "invitations_update" ON invitations
FOR UPDATE USING (
  -- Either admin/owner of the tenant
  EXISTS (
    SELECT 1 FROM tenant_members
    WHERE tenant_members.tenant_id = invitations.tenant_id
    AND tenant_members.user_id = auth.uid()::text
    AND tenant_members.role IN ('admin', 'owner')
    AND tenant_members.status = 'active'
  )
  -- Or the invited user accepting their own invitation
  OR (
    invitations.email = (
      SELECT email FROM auth.users 
      WHERE id = auth.uid()
      LIMIT 1
    )
  )
);

-- Admins and owners can delete invitations
CREATE POLICY "invitations_delete" ON invitations
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM tenant_members
    WHERE tenant_members.tenant_id = invitations.tenant_id
    AND tenant_members.user_id = auth.uid()::text
    AND tenant_members.role IN ('admin', 'owner')
    AND tenant_members.status = 'active'
  )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tenant_members_user_id ON tenant_members(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_members_tenant_id ON tenant_members(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_members_status ON tenant_members(status);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_tenant_id ON invitations(tenant_id);

-- Add composite unique constraint to prevent duplicate pending invitations
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_pending_invitation 
ON invitations(tenant_id, email) 
WHERE accepted_at IS NULL;