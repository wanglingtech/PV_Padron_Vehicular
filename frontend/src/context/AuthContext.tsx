import React, { createContext, useContext, useEffect, useState } from 'react';
import { CurrentUser, RoleDefinition, SystemModuleId, ModulePermissionMode, UserAccount } from '../types/index.ts';
import { api } from '../api/client.ts';
import { auth, googleAuthProvider } from '../lib/firebase.ts';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import {
  DEFAULT_ROLES,
  DEFAULT_USER_ACCOUNTS,
  DEMO_USERS,
  isPrivilegedRole,
} from '../config/roles.ts';

// Re-exportamos el catálogo para mantener compatibilidad con las vistas que
// ya importaban estos símbolos desde AuthContext.
export {
  DEFAULT_ROLES,
  DEFAULT_USER_ACCOUNTS,
  DEMO_USERS,
  SYSTEM_MODULES_CONFIG,
  ROLE_DEFINITIONS,
  isPrivilegedRole,
} from '../config/roles.ts';

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

// El catálogo de módulos, roles, cuentas demo y helpers vive en
// frontend/src/config/roles.ts y se re-exporta arriba.

interface AuthContextType {
  currentUser: CurrentUser | null;
  isLoggedIn: boolean;
  isAdmin: boolean;
  isOperator: boolean;
  roles: RoleDefinition[];
  userAccounts: UserAccount[];
  currentRoleDef: RoleDefinition;
  login: (email: string, role: string, name?: string) => void;
  logout: () => void;
  switchRole: (role: string) => void;
  switchUserSession: (account: UserAccount | CurrentUser) => void;
  signInGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  hasModuleAccess: (moduleId: NavigationTab) => boolean;
  getModulePermission: (moduleId: NavigationTab) => ModulePermissionMode;
  canWrite: (moduleId: NavigationTab) => boolean;
  canRead: (moduleId: NavigationTab) => boolean;
  saveRole: (role: RoleDefinition) => void;
  deleteRole: (roleId: string) => boolean;
  updateRolePermissions: (roleId: string, permissions: Record<SystemModuleId, ModulePermissionMode>) => void;
  saveUserAccount: (account: Partial<UserAccount> & { email: string; name: string; role: string; password?: string }) => void;
  deleteUserAccount: (id: string) => void;
  toggleUserStatus: (id: string) => void;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: {
    uid: 'admin-dev-01',
    email: 'admin@transporte.pe',
    name: 'Carlos Mendoza (Administrador)',
    role: 'admin',
  },
  isLoggedIn: true,
  isAdmin: true,
  isOperator: false,
  roles: DEFAULT_ROLES,
  userAccounts: DEFAULT_USER_ACCOUNTS,
  currentRoleDef: DEFAULT_ROLES[0],
  login: () => {},
  logout: () => {},
  switchRole: () => {},
  switchUserSession: () => {},
  signInGoogle: async () => {},
  signOutUser: async () => {},
  hasModuleAccess: () => true,
  getModulePermission: () => 'write',
  canWrite: () => true,
  canRead: () => true,
  saveRole: () => {},
  deleteRole: () => false,
  updateRolePermissions: () => {},
  saveUserAccount: () => {},
  deleteUserAccount: () => {},
  toggleUserStatus: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Roles del Sistema
  const [roles, setRoles] = useState<RoleDefinition[]>(() => {
    const saved = localStorage.getItem('padron_system_roles');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        // fallback
      }
    }
    return DEFAULT_ROLES;
  });

  // Guardar roles en localStorage
  useEffect(() => {
    localStorage.setItem('padron_system_roles', JSON.stringify(roles));
  }, [roles]);

  // 2. Cuentas de Usuario
  const [userAccounts, setUserAccounts] = useState<UserAccount[]>(() => {
    const saved = localStorage.getItem('padron_user_accounts');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        // fallback
      }
    }
    return DEFAULT_USER_ACCOUNTS;
  });

  // Guardar cuentas de usuario en localStorage
  useEffect(() => {
    localStorage.setItem('padron_user_accounts', JSON.stringify(userAccounts));
  }, [userAccounts]);

  // 3. Usuario actual en sesión
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(() => {
    const saved = localStorage.getItem('padron_user_session');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    return {
      uid: 'admin-dev-01',
      email: 'admin@transporte.pe',
      name: 'Carlos Mendoza (Administrador)',
      role: 'admin',
    };
  });

  const isLoggedIn = currentUser !== null;

  useEffect(() => {
    if (currentUser) {
      api.setCurrentUser(currentUser);
      localStorage.setItem('padron_user_session', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('padron_user_session');
    }
  }, [currentUser]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const email = firebaseUser.email || 'usuario@transporte.pe';
        const role = email.includes('admin') ? 'admin' : (currentUser?.role || 'operator');
        const updated: CurrentUser = {
          uid: firebaseUser.uid,
          email,
          name: firebaseUser.displayName || email.split('@')[0],
          role,
        };
        setCurrentUser(updated);
      }
    });
    return () => unsubscribe();
  }, [currentUser?.role]);

  // Definición del rol actual
  const currentRoleDef: RoleDefinition =
    roles.find((r) => r.id === (currentUser?.role || 'operator')) ||
    DEFAULT_ROLES[0];

  const isAdmin = isPrivilegedRole(currentUser?.role);
  const isOperator = currentUser?.role === 'operator';

  // Verificación de Permisos Dinámica
  const getModulePermission = (moduleId: NavigationTab): ModulePermissionMode => {
    if (!currentUser) return 'none';
    // Admin, programador y gerente tienen acceso total.
    if (isPrivilegedRole(currentUser.role)) return 'write';
    const roleDef = roles.find((r) => r.id === currentUser.role);
    if (!roleDef) return 'none';
    return roleDef.permissions[moduleId as SystemModuleId] || 'none';
  };

  const hasModuleAccess = (moduleId: NavigationTab): boolean => {
    if (isAdmin) return true;
    const perm = getModulePermission(moduleId);
    return perm !== 'none';
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

  // Cargar roles y usuarios desde la Base de Datos PostgreSQL.
  // El catálogo de roles es público; la lista de usuarios solo se consulta
  // cuando el rol actual tiene permiso de lectura sobre "usuarios" para no
  // provocar 403 innecesarios en la consola del navegador.
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
            } catch (e) {
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
          password: u.password || '123456',
          assignedPadron: u.assignedPadron || undefined,
          isActive: Boolean(u.isActive),
          createdAt: u.createdAt ? new Date(u.createdAt).toISOString() : new Date().toISOString(),
          lastLogin: 'Registrado en BD',
        }));
        setUserAccounts(formattedUsers);
      }
    } catch (err) {
      console.warn('Sincronización inicial con PostgreSQL:', err);
    }
  };

  useEffect(() => {
    refreshRolesAndUsersFromDB();
    // Se vuelve a sincronizar al cambiar de rol para cargar las cuentas
    // cuando el nuevo rol sí tiene acceso al módulo de usuarios.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.role]);

  // Operaciones de Roles
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

    // Guardar dinámicamente en PostgreSQL
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
    // Proteger todos los roles institucionales (isSystem), no solo admin/operator.
    const roleToDelete = roles.find((r) => r.id === roleId);
    if (!roleToDelete || roleToDelete.isSystem) return false;
    setRoles((prev) => prev.filter((r) => r.id !== roleId));
    // Reasignar usuarios de este rol a 'operator'
    setUserAccounts((prev) =>
      prev.map((u) => (u.role === roleId ? { ...u, role: 'operator' } : u))
    );
    if (currentUser?.role === roleId) {
      setCurrentUser((prev) => (prev ? { ...prev, role: 'operator' } : null));
    }
    // Eliminar en PostgreSQL
    api.deleteRole(roleId).catch((e) => console.error('Error al eliminar rol en BD:', e));
    return true;
  };

  const updateRolePermissions = (
    roleId: string,
    permissions: Record<SystemModuleId, ModulePermissionMode>
  ) => {
    setRoles((prev) =>
      prev.map((r) => (r.id === roleId ? { ...r, permissions } : r))
    );
    // Persistir dinámicamente en PostgreSQL
    api
      .updateRole(roleId, {
        permissions: permissions as any,
      })
      .catch((e) => console.error('Error al persistir permisos en PostgreSQL:', e));
  };

  // Operaciones de Cuentas de Usuario en Base de Datos
  const saveUserAccount = (
    data: Partial<UserAccount> & { email: string; name: string; role: string; password?: string }
  ) => {
    if (data.id && !data.id.startsWith('usr-temp')) {
      // Actualizar existente
      setUserAccounts((prev) =>
        prev.map((u) => (u.id === data.id ? { ...u, ...data } : u))
      );
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
      // Crear nuevo
      const tempId = `usr-${Date.now().toString(36)}`;
      const newAcc: UserAccount = {
        id: tempId,
        uid: `uid-${Date.now().toString(36)}`,
        name: data.name,
        email: data.email,
        role: data.role,
        password: data.password || '123456',
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
          password: data.password || '123456',
          assignedPadron: data.assignedPadron,
          isActive: data.isActive,
        })
        .then((created) => {
          if (created?.id) {
            setUserAccounts((prev) =>
              prev.map((u) => (u.id === tempId ? { ...u, id: String(created.id), uid: created.uid } : u))
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
    api.updateUser(id, { isActive: nextStatus }).catch((e) =>
      console.error('Error actualizando estado en BD:', e)
    );
  };

  const switchUserSession = (account: UserAccount | CurrentUser) => {
    const user: CurrentUser = {
      uid: account.uid,
      email: account.email,
      name: account.name,
      role: account.role,
      assignedPadron: (account as any).assignedPadron,
    };
    setCurrentUser(user);
  };

  const switchRole = (role: string) => {
    // Encontrar la primera cuenta que tenga este rol o simular una sesión
    const matchingAccount = userAccounts.find((u) => u.role === role);
    if (matchingAccount) {
      switchUserSession(matchingAccount);
      return;
    }
    const roleDef = roles.find((r) => r.id === role);
    const roleName = roleDef ? roleDef.name : role;
    setCurrentUser({
      uid: `${role}-sim-uid`,
      email: `${role}@transporte.pe`,
      name: `Usuario de Prueba (${roleName})`,
      role,
    });
  };

  const login = (email: string, role: string, name?: string) => {
    const user: CurrentUser = {
      uid: `${role}-${Date.now()}`,
      email,
      name: name || `Usuario (${role})`,
      role,
    };
    setCurrentUser(user);
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const signInGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      if (result.user) {
        const email = result.user.email || 'usuario@transporte.pe';
        const role = email.includes('admin') ? 'admin' : 'operator';
        setCurrentUser({
          uid: result.user.uid,
          email,
          name: result.user.displayName || email.split('@')[0],
          role,
        });
      }
    } catch (error: any) {
      console.warn('Google Sign-In note:', error.message);
    }
  };

  const signOutUser = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      // ignore
    }
    logout();
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isLoggedIn,
        isAdmin,
        isOperator,
        roles,
        userAccounts,
        currentRoleDef,
        login,
        logout,
        switchRole,
        switchUserSession,
        signInGoogle,
        signOutUser,
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
