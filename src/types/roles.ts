// Role-Based Access Control (RBAC) Definitions
export type UserRole = 'client' | 'sports_therapist' | 'massage_therapist' | 'osteopath' | 'admin';

export type Permission = 
  // Client permissions
  | 'client:view_dashboard'
  | 'client:book_sessions'
  | 'client:view_sessions'
  | 'client:manage_profile'
  | 'client:view_payments'
  | 'client:send_messages'
  
  // Practitioner permissions
  | 'practitioner:view_dashboard'
  | 'practitioner:manage_clients'
  | 'practitioner:manage_schedule'
  | 'practitioner:create_notes'
  | 'practitioner:view_analytics'
  | 'practitioner:manage_billing'
  | 'practitioner:view_marketplace'
  | 'practitioner:manage_profile'
  
  // Admin permissions
  | 'admin:manage_users'
  | 'admin:view_analytics'
  | 'admin:manage_system';

export interface RolePermissions {
  [key: string]: Permission[];
}

// Define permissions for each role
export const ROLE_PERMISSIONS: RolePermissions = {
  client: [
    'client:view_dashboard',
    'client:book_sessions',
    'client:view_sessions',
    'client:manage_profile',
    'client:view_payments',
    'client:send_messages',
  ],
  
  sports_therapist: [
    'practitioner:view_dashboard',
    'practitioner:manage_clients',
    'practitioner:manage_schedule',
    'practitioner:create_notes',
    'practitioner:view_analytics',
    'practitioner:manage_billing',
    'practitioner:view_marketplace',
    'practitioner:manage_profile',
  ],
  
  massage_therapist: [
    'practitioner:view_dashboard',
    'practitioner:manage_clients',
    'practitioner:manage_schedule',
    'practitioner:create_notes',
    'practitioner:view_analytics',
    'practitioner:manage_billing',
    'practitioner:view_marketplace',
    'practitioner:manage_profile',
  ],
  
  osteopath: [
    'practitioner:view_dashboard',
    'practitioner:manage_clients',
    'practitioner:manage_schedule',
    'practitioner:create_notes',
    'practitioner:view_analytics',
    'practitioner:manage_billing',
    'practitioner:view_marketplace',
    'practitioner:manage_profile',
  ],
  
  admin: [
    'admin:manage_users',
    'admin:view_analytics',
    'admin:manage_system',
    'practitioner:view_dashboard',
    'practitioner:manage_clients',
    'practitioner:manage_schedule',
    'practitioner:create_notes',
    'practitioner:view_analytics',
    'practitioner:manage_billing',
    'practitioner:view_marketplace',
    'practitioner:manage_profile',
  ],
};

// Helper functions
export const isClient = (role: UserRole): boolean => role === 'client';
export const isPractitioner = (role: UserRole): boolean => 
  ['sports_therapist', 'massage_therapist', 'osteopath'].includes(role);
export const isAdmin = (role: UserRole): boolean => role === 'admin';

export const hasPermission = (userRole: UserRole, permission: Permission): boolean => {
  const rolePermissions = ROLE_PERMISSIONS[userRole] || [];
  return rolePermissions.includes(permission);
};

export const getRoleDisplayName = (role: UserRole): string => {
  const displayNames: Record<UserRole, string> = {
    client: 'Client',
    sports_therapist: 'Sports Therapist',
    massage_therapist: 'Massage Therapist',
    osteopath: 'Osteopath',
    admin: 'Administrator',
  };
  return displayNames[role];
};
