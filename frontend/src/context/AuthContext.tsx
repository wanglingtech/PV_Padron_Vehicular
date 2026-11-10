import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  CurrentUser,
  RoleDefinition,
  SystemModuleId,
  ModulePermissionMode,
  UserAccount,
} from '../types/index.ts';
import { api } from '../api/client.ts';
import {
  DEFAULT_ROLES,
  DEFAULT_USER_ACCOUNTS,
  DEMO_USERS,
  isPrivilegedRole,
} from '../../../shared/roles.ts';

// Re-exportamos el catálogo para mantener compatibilidad con las vistas que
// ya importaban estos símbolos desde AuthContext.
export {
  DEFAULT_ROLES,
  DEFAULT_USER_ACCOUNTS,
  DEMO_USERS,
  SYSTEM_MODULES_CONFIG,
  ROLE_DEFINITIONS,
  isPrivilegedRole,
} from '../../../shared/roles.ts';

export type NavigationTab =
  | 'portal-inicio'
  | 'dashboard'
  | 'padron'
  | 'personas'
  | 'nuevo'
  | 'curso-vial'
  | 'operario-portal'
  | 'vencimientos'
  | 'importar-exportar'
  | 'historial'
  | 'directorio-contacto'
  | 'usuarios'
  | 'configuracion'
  | 'gestion-portal'
  | 'backup-migracion';

// El catálogo de módulos, roles y helpers vive en `shared/roles.ts`.

interface AuthContextType {
  currentUser: CurrentUser | null;
  isLoggedIn: boolean;
  isAuthLoading: boolean;
  isAdmin: boolean;
  isOperator: boolean;
  roles: RoleDefinition[];
  userAccounts: UserAccount[];
  currentRoleDef: RoleDefinition;
  login: (email: string, password: string) => Promise<CurrentUser>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  hasModuleAccess: (moduleId: NavigationTab) => boolean;
  getModulePermission: (moduleId: NavigationTab) => ModulePermissionMode;
  canWrite: (moduleId: NavigationTab) => boolean;
  canRead: (moduleId: NavigationTab) => boolean;
  saveRole: (role: RoleDefinition) => void;
  deleteRole: (roleId: string) => boolean;
  updateRolePermissions: (
    roleId: string,
    permissions: Record<SystemModuleId, ModulePermissionMode>
  ) => void;
  saveUserAccount: (
    account: Partial<UserAccount> & { email: string; name: string; role: string; password?: string }
  ) => void;
  deleteUserAccount: (id: string) => void;
  toggleUserStatus: (id: string) => void;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  isLoggedIn: false,
  isAuthLoading: true,
  isAdmin: false,
  isOperator: false,
  roles: DEFAULT_ROLES,
  userAccounts: [],
  currentRoleDef: DEFAULT_ROLES[0],
  login: async () => {
    throw new Error('AuthProvider no inicializado');
  },
  logout: async () => {},
  changePassword: async () => {},
  hasModuleAccess: () => false,
  getModulePermission: () => 'none',
  canWrite: () => false,
  canRead: () => false,
  saveRole: () => {},
  deleteRole: () => false,
  updateRolePermissions: () => {},
  saveUserAccount: () => {},
  deleteUserAccount: () => {},
  toggleUserStatus: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Roles del sistema (caché local para pintar el menú sin esperar la API).
  const [roles, setRoles] = useState<RoleDefinition[]>(() => {
    const saved = localStorage.getItem('padron_system_roles');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {
        // Se usa el catálogo por defecto.
      }
    }
    return DEFAULT_ROLES;
  });

  useEffect(() => {
    localStorage.setItem('padron_system_roles', JSON.stringify(roles));
  }, [roles]);

  // 2. Cuentas de usuario (solo se cargan si el rol puede ver el módulo).
  const [userAccounts, setUserAccounts] = useState<UserAccount[]>([]);

  // 3. Sesión actual. La cookie HttpOnly es la fuente de verdad.
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    api
      .me()
      .then(({ user }) => {
        if (!cancelled) setCurrentUser(user);
      })
      .catch(() => {
        if (!cancelled) setCurrentUser(null);
      })
      .finally(() => {
        if (!cancelled) setIsAuthLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const isLoggedIn = currentUser !== null;
  const currentRoleDef: RoleDefinition =
    roles.find((r) => r.id === (currentUser?.role || 'operator')) || DEFAULT_ROLES[0];
  const isAdmin = isPrivilegedRole(currentUser?.role);
  const isOperator = currentUser?.role === 'operator';

  // Verificación de permisos en el cliente (el backend vuelve a validar).
  const getModulePermission = (moduleId: NavigationTab): ModulePermissionMode => {
    if (!currentUser) return 'none';
    if (isPrivilegedRole(currentUser.role)) return 'write';
    const roleDef = roles.find((r) => r.id === currentUser.role);
    if (!roleDef) return 'none';
    return roleDef.permissions[moduleId as SystemModuleId] || 'none';
  };

  const hasModuleAccess = (moduleId: NavigationTab): boolean => {
    if (isAdmin) return true;
    return getModulePermission(moduleId) !== 'none';
  };

  const canWrite = (moduleId: NavigationTab): boolean => {
    if (isAdmin) return true;
    return getModulePermission(moduleId) === 'write';
  };

  const canRead = (moduleId: NavigationTab): boolean => {
    if (isAdmin) return true;
    const perm = getModulePermission(moduleId);
    return perm === 'read' || perm === 'write';
  };

  // Carga roles y, si hay permiso, la lista de usuarios desde PostgreSQL.
  const refreshRolesAndUsersFromDB = async () => {
    try {
      const canReadUsers = getModulePermission('usuarios') !== 'none';
      const [dbRoles, dbUsers] = await Promise.all([
        api.getRoles().catch(() => null),
        canReadUsers ? api.getUsers().catch(() => null) : Promise.resolve(null),
      ]);

      if (dbRoles && Array.isArray(dbRoles) && dbRoles.length > 0) {
        const formattedRoles: RoleDefinition[] = dbRoles.map((r: any) => {
          let permissions = r.permissions;
          if (typeof permissions === 'string') {
            try {
              permissions = JSON.parse(permissions);
            } catch {
              permissions = {};
            }
          }
          return {
            id: r.id,
            name: r.name,
            description: r.description || '',
            badgeColor: r.badgeColor || 'indigo',
            isSystem: Boolean(r.isSystem),
            permissions: permissions || {},
          };
        });
        setRoles(formattedRoles);
      }

      if (dbUsers && Array.isArray(dbUsers) && dbUsers.length > 0) {
        const formattedUsers: UserAccount[] = dbUsers.map((u: any) => ({
          id: String(u.id),
          uid: u.uid,
          name: u.name,
          email: u.email,
          role: u.role,
          // La API nunca devuelve la contraseña ni su hash.
          password: undefined,
          assignedPadron: u.assignedPadron || undefined,
          isActive: Boolean(u.isActive),
          createdAt: u.createdAt
            ? new Date(u.createdAt).toISOString()
            : new Date().toISOString(),
          lastLogin: 'Registrado en BD',
        }));
        setUserAccounts(formattedUsers);
      }
    } catch (err) {
      console.warn('Sincronización inicial con PostgreSQL:', err);
    }
  };

  useEffect(() => {
    if (!currentUser) return;
    refreshRolesAndUsersFromDB();
    // Se vuelve a sincronizar al cambiar de rol para cargar las cuentas
    // cuando el nuevo rol sí tiene acceso al módulo de usuarios.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.role]);

  // Operaciones de roles
  const saveRole = (newRole: RoleDefinition) => {
    const exists = roles.some((r) => r.id === newRole.id);
    setRoles((prev) => {
      const idx = prev.findIndex((r) => r.id === newRole.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = newRole;
        return updated;
      }
      return [...prev, newRole];
    });

    if (exists) {
      api
        .updateRole(newRole.id, {
          name: newRole.name,
          description: newRole.description,
          badgeColor: newRole.badgeColor,
          permissions: newRole.permissions as any,
        })
        .catch((e) => console.error('Error al actualizar rol en BD:', e));
    } else {
      api
        .createRole({
          id: newRole.id,
          name: newRole.name,
          description: newRole.description,
          badgeColor: newRole.badgeColor,
          permissions: newRole.permissions as any,
        })
        .catch((e) => console.error('Error al crear rol en BD:', e));
    }
  };

  const deleteRole = (roleId: string): boolean => {
    const roleToDelete = roles.find((r) => r.id === roleId);
    if (!roleToDelete || roleToDelete.isSystem) return false;

    setRoles((prev) => prev.filter((r) => r.id !== roleId));
    setUserAccounts((prev) =>
      prev.map((u) => (u.role === roleId ? { ...u, role: 'operator' } : u))
    );
    if (currentUser?.role === roleId) {
      setCurrentUser((prev) => (prev ? { ...prev, role: 'operator' } : null));
    }
    api.deleteRole(roleId).catch((e) => console.error('Error al eliminar rol en BD:', e));
    return true;
  };

  const updateRolePermissions = (
    roleId: string,
    permissions: Record<SystemModuleId, ModulePermissionMode>
  ) => {
    setRoles((prev) => prev.map((r) => (r.id === roleId ? { ...r, permissions } : r)));
    api
      .updateRole(roleId, { permissions: permissions as any })
      .catch((e) => console.error('Error al persistir permisos en PostgreSQL:', e));
  };

  // Operaciones de cuentas de usuario
  const saveUserAccount = (
    data: Partial<UserAccount> & { email: string; name: string; role: string; password?: string }
  ) => {
    if (data.id && !data.id.startsWith('usr-temp')) {
      setUserAccounts((prev) => prev.map((u) => (u.id === data.id ? { ...u, ...data } : u)));
      api
        .updateUser(data.id, {
          name: data.name,
          email: data.email,
          role: data.role,
          password: data.password,
          assignedPadron: data.assignedPadron,
          isActive: data.isActive,
        })
        .catch((e) => console.error('Error actualizando usuario en BD:', e));
    } else {
      const tempId = `usr-${Date.now().toString(36)}`;
      const newAcc: UserAccount = {
        id: tempId,
        uid: `uid-${Date.now().toString(36)}`,
        name: data.name,
        email: data.email,
        role: data.role,
        assignedPadron: data.assignedPadron,
        isActive: data.isActive !== undefined ? data.isActive : true,
        createdAt: new Date().toISOString(),
        lastLogin: 'Pendiente primer ingreso',
      };
      setUserAccounts((prev) => [newAcc, ...prev]);

      api
        .createUser({
          name: data.name,
          email: data.email,
          role: data.role,
          password: data.password,
          assignedPadron: data.assignedPadron,
          isActive: data.isActive,
        })
        .then((created) => {
          if (created?.id) {
            setUserAccounts((prev) =>
              prev.map((u) =>
                u.id === tempId ? { ...u, id: String(created.id), uid: created.uid } : u
              )
            );
          }
        })
        .catch((e) => console.error('Error creando usuario en BD:', e));
    }
  };

  const deleteUserAccount = (id: string) => {
    setUserAccounts((prev) => prev.filter((u) => u.id !== id));
    api.deleteUser(id).catch((e) => console.error('Error eliminando usuario en BD:', e));
  };

  const toggleUserStatus = (id: string) => {
    let nextStatus = false;
    setUserAccounts((prev) =>
      prev.map((u) => {
        if (u.id === id) {
          nextStatus = !u.isActive;
          return { ...u, isActive: nextStatus };
        }
        return u;
      })
    );
    api
      .updateUser(id, { isActive: nextStatus })
      .catch((e) => console.error('Error actualizando estado en BD:', e));
  };

  // Autenticación real
  const login = async (email: string, password: string): Promise<CurrentUser> => {
    const { user, token } = await api.login(email, password);
    api.setAuthToken(token);
    setCurrentUser(user);
    return user;
  };

  const logout = async (): Promise<void> => {
    try {
      await api.logout();
    } catch {
      // Aunque falle la API, limpiamos la sesión local.
    }
    api.setAuthToken(null);
    setCurrentUser(null);
    setUserAccounts([]);
  };

  const changePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
    await api.changePassword(currentPassword, newPassword);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isLoggedIn,
        isAuthLoading,
        isAdmin,
        isOperator,
        roles,
        userAccounts,
        currentRoleDef,
        login,
        logout,
        changePassword,
        hasModuleAccess,
        getModulePermission,
        canWrite,
        canRead,
        saveRole,
        deleteRole,
        updateRolePermissions,
        saveUserAccount,
        deleteUserAccount,
        toggleUserStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
