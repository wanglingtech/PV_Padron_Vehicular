import React, { useState, useEffect } from 'react';
import {
  Users,
  Shield,
  CheckCircle2,
  AlertCircle,
  Key,
  UserCheck,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Lock,
  Unlock,
  Eye,
  SlidersHorizontal,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Check,
  X,
  FileCheck2,
  Building2,
  Car,
  User,
  GraduationCap,
  CalendarClock,
  FileSpreadsheet,
  Camera,
  History,
  Settings,
  LayoutDashboard,
  LogIn,
  EyeOff,
  Copy,
  Database,
  MessageCircle,
} from 'lucide-react';
import {
  useAuth,
  SYSTEM_MODULES_CONFIG,
} from '../context/AuthContext.tsx';
import {
  RoleDefinition,
  SystemModuleId,
  ModulePermissionMode,
  UserAccount,
} from '../types/index.ts';
import { PersonAvatar } from '../components/common/PersonAvatar.tsx';
import { ConfirmModal } from '../components/common/ConfirmModal.tsx';
import { useToast } from '../components/common/Toast.tsx';

// Mapeo de iconos para cada módulo
const MODULE_ICONS: Record<SystemModuleId, React.ComponentType<{ size?: number; className?: string }>> = {
  'portal-inicio': Sparkles,
  dashboard: LayoutDashboard,
  padron: Car,
  nuevo: Plus,
  personas: UserCheck,
  'curso-vial': GraduationCap,
  'directorio-contacto': MessageCircle,
  vencimientos: CalendarClock,
  'importar-exportar': FileSpreadsheet,
  'operario-portal': Camera,
  historial: History,
  usuarios: Users,
  configuracion: Settings,
  'gestion-portal': SlidersHorizontal,
  'backup-migracion': Database,
};

export const UsersView: React.FC = () => {
  const {
    currentUser,
    isAdmin,
    roles,
    userAccounts,
    saveRole,
    deleteRole,
    updateRolePermissions,
    saveUserAccount,
    deleteUserAccount,
    toggleUserStatus,
    switchUserSession,
  } = useAuth();

  const { showToast } = useToast();

  // Pestaña activa: 'accounts' (Cuentas) o 'roles' (Roles & Permisos)
  const [activeTab, setActiveTab] = useState<'accounts' | 'roles'>('accounts');

  // Filtros de cuentas
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modales
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<UserAccount | null>(null);

  // Estados de visibilidad de contraseñas (solo admin puede ver/modificar)
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  const [showModalPassword, setShowModalPassword] = useState(false);

  const togglePasswordVisibility = (accountId: string) => {
    setRevealedPasswords((prev) => ({
      ...prev,
      [accountId]: !prev[accountId],
    }));
  };

  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleDefinition | null>(null);

  const [permissionsModalOpen, setPermissionsModalOpen] = useState(false);
  const [selectedRoleForPermissions, setSelectedRoleForPermissions] = useState<RoleDefinition | null>(null);
  const [tempPermissions, setTempPermissions] = useState<Record<SystemModuleId, ModulePermissionMode> | null>(null);

  // Modal de confirmación de eliminación
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    type: 'user' | 'role';
    id: string;
    name: string;
  }>({
    isOpen: false,
    type: 'user',
    id: '',
    name: '',
  });

  // Bloquear scroll de fondo cuando cualquier modal esté activo
  useEffect(() => {
    const isAnyModalOpen = accountModalOpen || roleModalOpen || permissionsModalOpen || deleteModalState.isOpen;
    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [accountModalOpen, roleModalOpen, permissionsModalOpen, deleteModalState.isOpen]);

  // Filtrado de cuentas
  const filteredAccounts = userAccounts.filter((account) => {
    const matchSearch =
      account.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      account.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (account.assignedPadron && account.assignedPadron.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchRole = roleFilter === 'ALL' || account.role === roleFilter;
    const matchStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && account.isActive) ||
      (statusFilter === 'INACTIVE' && !account.isActive);

    return matchSearch && matchRole && matchStatus;
  });

  // Paginación para la tabla de cuentas de usuarios
  const [accountsPage, setAccountsPage] = useState(1);
  const [accountsPageSize, setAccountsPageSize] = useState(10);

  // Paginación para la lista de roles
  const [rolesPage, setRolesPage] = useState(1);
  const [rolesPageSize, setRolesPageSize] = useState(6);

  // Resetear a la página 1 cuando cambian los filtros
  useEffect(() => {
    setAccountsPage(1);
  }, [searchQuery, roleFilter, statusFilter]);

  const totalAccounts = filteredAccounts.length;
  const totalAccountPages = Math.max(1, Math.ceil(totalAccounts / accountsPageSize));
  const paginatedAccounts = filteredAccounts.slice(
    (accountsPage - 1) * accountsPageSize,
    accountsPage * accountsPageSize
  );

  const totalRoles = roles.length;
  const totalRolePages = Math.max(1, Math.ceil(totalRoles / rolesPageSize));
  const paginatedRoles = roles.slice(
    (rolesPage - 1) * rolesPageSize,
    rolesPage * rolesPageSize
  );

  // Manejo de guardado de cuenta
  const handleSaveAccount = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = (formData.get('name') as string).trim();
    const email = (formData.get('email') as string).trim();
    const role = (formData.get('role') as string).trim();
    const password = (formData.get('password') as string)?.trim() || '123456';
    const assignedPadron = (formData.get('assignedPadron') as string)?.trim() || undefined;
    const isActive = formData.get('isActive') === 'on';

    if (!name || !email || !role) {
      showToast('Error', 'Todos los campos obligatorios deben ser completados.', 'error');
      return;
    }

    saveUserAccount({
      id: editingAccount ? editingAccount.id : undefined,
      uid: editingAccount ? editingAccount.uid : undefined,
      name,
      email,
      role,
      password,
      assignedPadron: assignedPadron ? assignedPadron.toUpperCase() : undefined,
      isActive,
    });

    showToast(
      'Cuenta Guardada',
      editingAccount
        ? `Se actualizó la cuenta de ${name} y su clave correctamente.`
        : `Cuenta para ${name} creada exitosamente.`,
      'success'
    );

    setAccountModalOpen(false);
    setEditingAccount(null);
    setShowModalPassword(false);
  };

  // Manejo de guardado de rol (creación o edición)
  const handleSaveRole = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = (formData.get('name') as string).trim();
    const id = editingRole
      ? editingRole.id
      : (formData.get('id') as string).trim().toLowerCase().replace(/\s+/g, '_');
    const description = (formData.get('description') as string).trim();
    const badgeColor = (formData.get('badgeColor') as string) || (editingRole?.badgeColor || 'emerald');
    const baseTemplate = (formData.get('baseTemplate') as string) || 'read_only';

    if (!name || !id) {
      showToast('Error', 'El nombre y código del rol son requeridos.', 'error');
      return;
    }

    // Si se está editando un rol existente
    if (editingRole) {
      const updatedRole: RoleDefinition = {
        ...editingRole,
        name,
        description,
        badgeColor,
      };
      saveRole(updatedRole);
      showToast('Rol Actualizado', `El rol "${name}" se actualizó correctamente.`, 'success');
      setRoleModalOpen(false);
      setEditingRole(null);
      return;
    }

    // Si es un nuevo rol: inicializar permisos según la plantilla seleccionada
    const initialPerms: Record<SystemModuleId, ModulePermissionMode> = {
      'portal-inicio': 'read',
      dashboard: 'read',
      padron: 'read',
      nuevo: 'none',
      personas: 'read',
      'curso-vial': 'read',
      vencimientos: 'read',
      'importar-exportar': 'none',
      'operario-portal': 'none',
      historial: 'none',
      'directorio-contacto': 'read',
      usuarios: 'none',
      configuracion: 'none',
      'gestion-portal': 'none',
      'backup-migracion': 'none',
    };

    if (baseTemplate === 'admin') {
      SYSTEM_MODULES_CONFIG.forEach((m) => {
        initialPerms[m.id] = 'write';
      });
    } else if (baseTemplate === 'operator') {
      initialPerms['operario-portal'] = 'write';
    } else if (baseTemplate === 'tesorero') {
      initialPerms['importar-exportar'] = 'write';
      initialPerms['configuracion'] = 'read';
    }

    const newRole: RoleDefinition = {
      id,
      name,
      description,
      badgeColor,
      isSystem: false,
      permissions: initialPerms,
    };

    saveRole(newRole);
    showToast('Rol Creado', `El rol "${name}" se creó correctamente. Ahora puedes afinar sus permisos.`, 'success');

    setRoleModalOpen(false);
    setEditingRole(null);
    // Abrir automáticamente el modal de permisos para este nuevo rol
    openPermissionsModal(newRole);
  };

  // Abrir modal de permisos
  const openPermissionsModal = (role: RoleDefinition) => {
    setSelectedRoleForPermissions(role);
    setTempPermissions({ ...role.permissions });
    setPermissionsModalOpen(true);
  };

  // Cambiar permiso de un módulo en el modal
  const handlePermissionChange = (moduleId: SystemModuleId, mode: ModulePermissionMode) => {
    if (!tempPermissions) return;
    setTempPermissions((prev) => ({
      ...prev!,
      [moduleId]: mode,
    }));
  };

  // Aplicar acción masiva en permisos
  const handleBulkPermissionChange = (mode: ModulePermissionMode) => {
    if (!tempPermissions) return;
    const updated = { ...tempPermissions };
    SYSTEM_MODULES_CONFIG.forEach((m) => {
      // Si el rol es admin, no permitir bloquear usuarios o padrón
      updated[m.id] = mode;
    });
    setTempPermissions(updated);
  };

  // Guardar matriz de permisos
  const handleSavePermissions = () => {
    if (!selectedRoleForPermissions || !tempPermissions) return;

    updateRolePermissions(selectedRoleForPermissions.id, tempPermissions);
    showToast(
      'Permisos Actualizados',
      `Matriz de permisos para el rol "${selectedRoleForPermissions.name}" guardada y activa en el sistema.`,
      'success'
    );
    setPermissionsModalOpen(false);
    setSelectedRoleForPermissions(null);
    setTempPermissions(null);
  };

  // Confirmar eliminación
  const handleConfirmDelete = () => {
    if (deleteModalState.type === 'user') {
      deleteUserAccount(deleteModalState.id);
      showToast('Usuario Eliminado', `La cuenta de ${deleteModalState.name} fue eliminada.`, 'info');
    } else if (deleteModalState.type === 'role') {
      const ok = deleteRole(deleteModalState.id);
      if (ok) {
        showToast('Rol Eliminado', `El rol ${deleteModalState.name} fue eliminado correctamente.`, 'info');
      } else {
        showToast('Acción Bloqueada', 'Los roles maestros del sistema no se pueden eliminar.', 'error');
      }
    }
    setDeleteModalState({ isOpen: false, type: 'user', id: '', name: '' });
  };

  return (
    <div className="space-y-6">
      {/* Encabezado Principal */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
              <Users size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight sm:text-2xl">
                Cuentas de Acceso & Matriz de Roles
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
                Control de acceso escalable (RBAC) con permisos de lectura y escritura por módulo
              </p>
            </div>
          </div>
        </div>

        {/* Acciones principales de cabecera: siempre disponibles para máxima claridad */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setEditingRole(null);
              setRoleModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition-colors cursor-pointer"
          >
            <Shield size={15} />
            <span>+ Crear Nuevo Rol</span>
          </button>
          <button
            onClick={() => {
              setEditingAccount(null);
              setAccountModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition-colors cursor-pointer"
          >
            <Plus size={16} />
            <span>+ Crear Nueva Cuenta</span>
          </button>
        </div>
      </div>

      {/* Aviso si la sesión no es de Administrador */}
      {!isAdmin && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/40 p-4 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-3">
          <AlertCircle size={18} className="shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div>
            <p className="font-bold">Sesión en Modo Operativo / Consulta</p>
            <p className="mt-0.5">
              Estás visualizando este módulo con el rol <strong>{currentUser?.role}</strong>. Solo los administradores pueden crear nuevos roles o modificar permisos globales.
            </p>
          </div>
        </div>
      )}

      {/* Selector de Pestañas Principales */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('accounts')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition-colors ${
            activeTab === 'accounts'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <UserCheck size={16} />
          <span>Cuentas de Usuarios ({userAccounts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('roles')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition-colors ${
            activeTab === 'roles'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Shield size={16} />
          <span>Roles & Matriz de Permisos ({roles.length})</span>
        </button>
      </div>

      {/* CONTENIDO 1: GESTIÓN DE CUENTAS */}
      {activeTab === 'accounts' && (
        <div className="space-y-4">
          {/* Barra de Búsqueda y Filtros */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
            <div className="relative sm:col-span-5">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por nombre, correo o padrón asignado..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-2.5 pl-10 pr-4 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:border-blue-500 focus:outline-none shadow-2xs"
              />
            </div>

            <div className="sm:col-span-4 flex items-center gap-1.5">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-2.5 px-3 text-xs text-slate-800 dark:text-slate-100 focus:border-blue-500 focus:outline-none shadow-2xs"
              >
                <option value="ALL">Todos los Roles ({roles.length})</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  setEditingRole(null);
                  setRoleModalOpen(true);
                }}
                className="inline-flex items-center gap-1 shrink-0 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 px-2.5 py-2.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 transition-colors shadow-2xs cursor-pointer"
                title="Crear un nuevo rol personalizado"
              >
                <Plus size={14} />
                <span className="hidden xl:inline text-[11px]">Nuevo Rol</span>
              </button>
            </div>

            <div className="sm:col-span-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-2.5 px-3 text-xs text-slate-800 dark:text-slate-100 focus:border-blue-500 focus:outline-none shadow-2xs"
              >
                <option value="ALL">Todos los Estados</option>
                <option value="ACTIVE">Solo Cuentas Activas</option>
                <option value="INACTIVE">Solo Cuentas Inactivas</option>
              </select>
            </div>
          </div>

          {/* Listado de Cuentas en Tarjetas / Tabla */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-3.5">Usuario / Personal</th>
                    <th className="px-4 py-3.5">Rol Asignado</th>
                    <th className="px-4 py-3.5">Contraseña</th>
                    <th className="px-4 py-3.5">Padrón Asignado</th>
                    <th className="px-4 py-3.5">Estado</th>
                    <th className="px-4 py-3.5">Permisos Activos</th>
                    <th className="px-4 py-3.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredAccounts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 dark:text-slate-500">
                        No se encontraron cuentas con los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    paginatedAccounts.map((account) => {
                      const roleDef = roles.find((r) => r.id === account.role);
                      const isCurrentActiveSession = currentUser?.email === account.email;

                      // Contar módulos permitidos para este rol
                      const writeCount = roleDef
                        ? Object.values(roleDef.permissions).filter((p) => p === 'write').length
                        : 0;
                      const readCount = roleDef
                        ? Object.values(roleDef.permissions).filter((p) => p === 'read').length
                        : 0;

                      return (
                        <tr
                          key={account.id}
                          className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors ${
                            isCurrentActiveSession ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                          }`}
                        >
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-3">
                              <PersonAvatar
                                name={account.name}
                                dni={account.email}
                                size="sm"
                                clickable={false}
                              />
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-900 dark:text-white">
                                    {account.name}
                                  </span>
                                  {isCurrentActiveSession && (
                                    <span className="rounded-full bg-blue-100 dark:bg-blue-900/80 px-2 py-0.2 text-[9px] font-extrabold text-blue-700 dark:text-blue-300">
                                      Tú (Sesión Activa)
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">{account.email}</p>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3.5">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold ${
                                account.role === 'admin'
                                  ? 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                                  : account.role === 'operator'
                                  ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                  : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              }`}
                            >
                              <Shield size={12} />
                              <span>{roleDef ? roleDef.name : account.role}</span>
                            </span>
                          </td>

                          {/* Contraseña visible solo para el Administrador */}
                          <td className="px-4 py-3.5">
                            {isAdmin ? (
                              <div className="flex items-center gap-1.5 font-mono text-xs">
                                <span className="font-semibold text-slate-800 dark:text-slate-200 select-all">
                                  {revealedPasswords[account.id] ? (account.password || '123456') : '••••••••'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => togglePasswordVisibility(account.id)}
                                  title={revealedPasswords[account.id] ? 'Ocultar contraseña' : 'Ver contraseña'}
                                  className="rounded-md p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                >
                                  {revealedPasswords[account.id] ? <EyeOff size={13} /> : <Eye size={13} />}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(account.password || '123456');
                                    showToast('Clave copiada', 'Contraseña copiada al portapapeles', 'info');
                                  }}
                                  title="Copiar contraseña"
                                  className="rounded-md p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                >
                                  <Copy size={12} />
                                </button>
                              </div>
                            ) : (
                              <span className="font-mono text-xs text-slate-400">••••••••</span>
                            )}
                          </td>

                          <td className="px-4 py-3.5">
                            {account.assignedPadron ? (
                              <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 font-mono font-bold text-slate-700 dark:text-slate-200">
                                {account.assignedPadron}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px]">Todos los padrones</span>
                            )}
                          </td>

                          <td className="px-4 py-3.5">
                            <button
                              onClick={() => toggleUserStatus(account.id)}
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold transition-colors ${
                                account.isActive
                                  ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                              }`}
                              title="Haga clic para cambiar estado"
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  account.isActive ? 'bg-emerald-500' : 'bg-slate-400'
                                }`}
                              />
                              <span>{account.isActive ? 'Activo' : 'Inactivo'}</span>
                            </button>
                          </td>

                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2 text-[11px]">
                              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                {writeCount} escritura
                              </span>
                              <span className="text-slate-300 dark:text-slate-700">·</span>
                              <span className="font-semibold text-amber-600 dark:text-amber-400">
                                {readCount} lectura
                              </span>
                            </div>
                          </td>

                          <td className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Botón Simular Sesión */}
                              <button
                                onClick={() => {
                                  switchUserSession(account);
                                  showToast(
                                    'Sesión Cambiada',
                                    `Ahora estás navegando como "${account.name}" (${roleDef?.name || account.role}).`,
                                    'info'
                                  );
                                }}
                                title="Iniciar sesión como este usuario para comprobar sus permisos"
                                className="flex h-8 items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 px-2 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                              >
                                <LogIn size={13} />
                                <span className="hidden sm:inline">Simular</span>
                              </button>

                              {/* Botón Editar Cuenta */}
                              <button
                                onClick={() => {
                                  setEditingAccount(account);
                                  setAccountModalOpen(true);
                                }}
                                title="Editar datos de cuenta"
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                              >
                                <Edit2 size={14} />
                              </button>

                              {/* Botón Eliminar Cuenta */}
                              <button
                                onClick={() =>
                                  setDeleteModalState({
                                    isOpen: true,
                                    type: 'user',
                                    id: account.id,
                                    name: account.name,
                                  })
                                }
                                disabled={isCurrentActiveSession || account.email === 'admin@transporte.pe'}
                                title="Eliminar cuenta"
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-400 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Barra de Paginación de Cuentas */}
            <div className="pagination-bar-contrast flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 text-xs rounded-b-2xl shadow-inner">
              <div className="flex items-center gap-2.5">
                <span className="font-bold">
                  Mostrando <strong>{totalAccounts === 0 ? 0 : (accountsPage - 1) * accountsPageSize + 1}</strong> a{' '}
                  <strong>
                    {Math.min(accountsPage * accountsPageSize, totalAccounts)}
                  </strong>{' '}
                  de <strong>{totalAccounts}</strong> cuentas
                </span>

                <span className="opacity-40 font-black">|</span>

                <div className="flex items-center gap-1.5 font-bold">
                  <span>Filas:</span>
                  <select
                    value={accountsPageSize}
                    onChange={(e) => {
                      setAccountsPageSize(Number(e.target.value));
                      setAccountsPage(1);
                    }}
                    className="rounded-lg px-2.5 py-1 text-xs font-black shadow-2xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => setAccountsPage((p) => Math.max(1, p - 1))}
                  disabled={accountsPage <= 1}
                  className="pagination-btn-blue inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all shadow-sm cursor-pointer"
                >
                  <ChevronLeft size={16} />
                  <span>Anterior</span>
                </button>

                <span className="pagination-page-badge px-3 py-1 font-mono text-xs rounded-lg shadow-2xs">
                  {accountsPage} / {totalAccountPages}
                </span>

                <button
                  type="button"
                  onClick={() => setAccountsPage((p) => Math.min(totalAccountPages, p + 1))}
                  disabled={accountsPage >= totalAccountPages}
                  className="pagination-btn-blue inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all shadow-sm cursor-pointer"
                >
                  <span>Siguiente</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONTENIDO 2: GESTIÓN DE ROLES & MATRIZ DE PERMISOS */}
      {activeTab === 'roles' && (
        <div className="space-y-6">
          {/* Banner Principal de Gestión y Creación de Roles */}
          <div className="rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-r from-indigo-50/80 via-white to-blue-50/80 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/40 p-5 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400 font-bold text-xs uppercase tracking-wider">
                <Shield size={16} />
                <span>Gestión de Roles & Matriz de Seguridad (RBAC)</span>
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Crea y Personaliza Perfiles de Acceso a Medida
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 max-w-2xl">
                Define roles específicos para tu asociación (ej. Tesorero, Fiscalizador de Ruta, Secretaría, Auditor, Delegado) y asigna permisos granulares de lectura o escritura en cada módulo del sistema.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setEditingRole(null);
                setRoleModalOpen(true);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 text-xs font-bold transition-all shadow-md shrink-0 cursor-pointer hover:shadow-indigo-500/20"
            >
              <Plus size={16} />
              <span>+ Crear Nuevo Rol Personalizado</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {paginatedRoles.map((role) => {
              const userCount = userAccounts.filter((u) => u.role === role.id).length;
              const writeModules = Object.entries(role.permissions).filter(([_, p]) => p === 'write').length;
              const readModules = Object.entries(role.permissions).filter(([_, p]) => p === 'read').length;
              const blockedModules = Object.entries(role.permissions).filter(([_, p]) => p === 'none').length;

              return (
                <div
                  key={role.id}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    {/* Cabecera del Rol */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-xl font-bold ${
                            role.id === 'admin'
                              ? 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300'
                              : role.id === 'operator'
                              ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300'
                              : 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300'
                          }`}
                        >
                          <Shield size={20} />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                            {role.name}
                          </h3>
                          <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">
                            ID: {role.id}
                          </span>
                        </div>
                      </div>

                      {role.isSystem ? (
                        <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-extrabold text-slate-600 dark:text-slate-300">
                          Sistema
                        </span>
                      ) : (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingRole(role);
                              setRoleModalOpen(true);
                            }}
                            title="Editar información de este rol"
                            className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 p-1 rounded transition-colors"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setDeleteModalState({
                                isOpen: true,
                                type: 'role',
                                id: role.id,
                                name: role.name,
                              })
                            }
                            title="Eliminar este rol personalizado"
                            className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1 rounded transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>

                    <p className="mt-3 text-xs text-slate-600 dark:text-slate-300 min-h-[36px]">
                      {role.description}
                    </p>

                    {/* Resumen de Módulos */}
                    <div className="mt-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3 text-xs space-y-1.5">
                      <div className="flex items-center justify-between font-semibold">
                        <span className="text-slate-500 dark:text-slate-400">Usuarios con este rol:</span>
                        <span className="font-bold text-slate-800 dark:text-white">{userCount} usuario(s)</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-emerald-700 dark:text-emerald-400 font-medium">Lectura y Escritura:</span>
                        <span className="font-bold text-emerald-700 dark:text-emerald-400">{writeModules} módulos</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-amber-700 dark:text-amber-400 font-medium">Solo Lectura:</span>
                        <span className="font-bold text-amber-700 dark:text-amber-400">{readModules} módulos</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400 font-medium">Sin Acceso (Bloqueados):</span>
                        <span className="font-bold text-slate-400">{blockedModules} módulos</span>
                      </div>
                    </div>
                  </div>

                  {/* Botón Configurar Permisos del Rol */}
                  <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => openPermissionsModal(role)}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-3 py-2.5 text-xs font-bold transition-colors shadow-2xs cursor-pointer"
                    >
                      <SlidersHorizontal size={15} />
                      <span>Configurar Permisos de Módulos</span>
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Tarjeta de Acción Rápida para Crear Nuevo Rol */}
            <button
              type="button"
              onClick={() => {
                setEditingRole(null);
                setRoleModalOpen(true);
              }}
              className="rounded-2xl border-2 border-dashed border-indigo-300 dark:border-indigo-800/80 hover:border-indigo-500 dark:hover:border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/20 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/40 p-6 flex flex-col items-center justify-center text-center transition-all group min-h-[280px] cursor-pointer"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md group-hover:scale-110 transition-transform mb-3">
                <Plus size={24} />
              </div>
              <h4 className="font-bold text-sm text-indigo-900 dark:text-indigo-200">
                Crear Nuevo Rol Personalizado
              </h4>
              <p className="mt-1 text-xs text-indigo-700/80 dark:text-indigo-300/80 max-w-xs">
                Crea un perfil con nombre a medida y ajusta sus accesos de lectura/escritura módulo por módulo.
              </p>
            </button>
          </div>

          {/* Barra de Paginación de Roles */}
          {totalRoles > 0 && (
            <div className="pagination-bar-contrast flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl p-4 text-xs shadow-sm">
              <div className="flex items-center gap-2">
                <span className="font-bold">
                  Mostrando <strong>{(rolesPage - 1) * rolesPageSize + 1}</strong> a{' '}
                  <strong>
                    {Math.min(rolesPage * rolesPageSize, totalRoles)}
                  </strong>{' '}
                  de <strong>{totalRoles}</strong> roles registrados
                </span>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => setRolesPage((p) => Math.max(1, p - 1))}
                  disabled={rolesPage <= 1}
                  className="pagination-btn-blue inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all shadow-sm cursor-pointer"
                >
                  <ChevronLeft size={16} />
                  <span>Anterior</span>
                </button>

                <span className="pagination-page-badge px-3 py-1 font-mono text-xs rounded-lg shadow-2xs">
                  {rolesPage} / {totalRolePages}
                </span>

                <button
                  type="button"
                  onClick={() => setRolesPage((p) => Math.min(totalRolePages, p + 1))}
                  disabled={rolesPage >= totalRolePages}
                  className="pagination-btn-blue inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all shadow-sm cursor-pointer"
                >
                  <span>Siguiente</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: CONFIGURAR PERMISOS DEL ROL (SOLICITADO ESPECÍFICAMENTE)         */}
      {/* ========================================================================= */}
      {permissionsModalOpen && selectedRoleForPermissions && tempPermissions && (
        <div
          onClick={() => setPermissionsModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-3xl rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden my-auto"
          >
            {/* Cabecera del Modal */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                  <SlidersHorizontal size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Matriz de Permisos: Rol {selectedRoleForPermissions.name}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Configura el nivel de acceso (Sin Acceso, Solo Lectura, Lectura y Escritura) para cada módulo
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPermissionsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            {/* Acciones Masivas Rápidas */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 bg-slate-100/70 dark:bg-slate-800/30 border-b border-slate-200 dark:border-slate-800 text-xs">
              <span className="font-semibold text-slate-600 dark:text-slate-300">Acciones Rápidas:</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleBulkPermissionChange('write')}
                  className="rounded-lg bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 px-2.5 py-1 text-[11px] font-bold hover:bg-emerald-100 transition-colors"
                >
                  🟢 Todo Escritura
                </button>
                <button
                  type="button"
                  onClick={() => handleBulkPermissionChange('read')}
                  className="rounded-lg bg-amber-50 dark:bg-amber-950/80 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 px-2.5 py-1 text-[11px] font-bold hover:bg-amber-100 transition-colors"
                >
                  🟡 Todo Solo Lectura
                </button>
                <button
                  type="button"
                  onClick={() => handleBulkPermissionChange('none')}
                  className="rounded-lg bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 px-2.5 py-1 text-[11px] font-bold hover:bg-rose-100 transition-colors"
                >
                  🔴 Bloquear Todo
                </button>
              </div>
            </div>

            {/* Lista de Módulos para Configurar */}
            <div className="flex-1 overflow-y-auto p-5 divide-y divide-slate-100 dark:divide-slate-800 space-y-3">
              {SYSTEM_MODULES_CONFIG.map((module) => {
                const Icon = MODULE_ICONS[module.id] || Car;
                const currentMode = tempPermissions[module.id] || 'none';

                return (
                  <div
                    key={module.id}
                    className="pt-3 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 mt-0.5">
                        <Icon size={18} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white text-xs">
                            {module.name}
                          </span>
                          <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 text-[9px] font-semibold text-slate-500 uppercase">
                            {module.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                          {module.description}
                        </p>
                      </div>
                    </div>

                    {/* Selector de 3 Estados (Sin Acceso / Lectura / Escritura) */}
                    <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0 self-start sm:self-auto">
                      {/* Sin Acceso */}
                      <button
                        type="button"
                        onClick={() => handlePermissionChange(module.id, 'none')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                          currentMode === 'none'
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                      >
                        Sin Acceso
                      </button>

                      {/* Solo Lectura */}
                      <button
                        type="button"
                        onClick={() => handlePermissionChange(module.id, 'read')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                          currentMode === 'read'
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                      >
                        Solo Lectura
                      </button>

                      {/* Lectura y Escritura */}
                      <button
                        type="button"
                        onClick={() => handlePermissionChange(module.id, 'write')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                          currentMode === 'write'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                      >
                        Lectura y Escritura
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer con Botones de Guardado */}
            <div className="flex items-center justify-between p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50">
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Los cambios se aplicarán de forma inmediata a todos los usuarios con este rol.
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPermissionsModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSavePermissions}
                  className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 text-xs font-bold shadow-sm transition-colors"
                >
                  Guardar Matriz de Permisos
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: CREAR / EDITAR CUENTA DE USUARIO                                 */}
      {/* ========================================================================= */}
      {accountModalOpen && (
        <div
          onClick={() => setAccountModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto"
          >
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                  <User size={18} />
                </div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  {editingAccount ? 'Editar Cuenta de Usuario' : 'Crear Nueva Cuenta'}
                </h2>
              </div>
              <button
                onClick={() => setAccountModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveAccount} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Nombre Completo del Personal *
                </label>
                <input
                  name="name"
                  defaultValue={editingAccount?.name || ''}
                  required
                  placeholder="Ej. Rosa Quispe Flores"
                  className="mt-1 block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Correo Electrónico / Usuario *
                </label>
                <input
                  name="email"
                  type="email"
                  defaultValue={editingAccount?.email || ''}
                  required
                  placeholder="personal@transporte.pe"
                  className="mt-1 block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Campo Contraseña de Acceso (Solo Administrador puede ver y modificar) */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Contraseña de Acceso *
                  </label>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => setShowModalPassword(!showModalPassword)}
                      className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {showModalPassword ? (
                        <>
                          <EyeOff size={12} /> Ocultar
                        </>
                      ) : (
                        <>
                          <Eye size={12} /> Ver Contraseña
                        </>
                      )}
                    </button>
                  )}
                </div>
                <div className="relative mt-1">
                  <input
                    name="password"
                    type={showModalPassword ? 'text' : 'password'}
                    defaultValue={editingAccount?.password || '123456'}
                    required
                    placeholder="Mínimo 6 caracteres"
                    className="block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 pr-10 text-xs text-slate-900 dark:text-white font-mono focus:border-blue-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowModalPassword(!showModalPassword)}
                    tabIndex={-1}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showModalPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                  {isAdmin
                    ? 'Como Administrador, tienes el control de ver y cambiar la clave asignada.'
                    : 'Solo el Administrador tiene autorización para ver y modificar contraseñas.'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Rol Asignado *
                </label>
                <select
                  name="role"
                  defaultValue={editingAccount?.role || 'operator'}
                  required
                  className="mt-1 block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.description})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Padrón Asignado (Opcional si es Operario de Unidad)
                </label>
                <input
                  name="assignedPadron"
                  defaultValue={editingAccount?.assignedPadron || ''}
                  placeholder="Ej. PAD-004 (Dejar vacío para acceso general)"
                  className="mt-1 block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white uppercase focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActive"
                  name="isActive"
                  defaultChecked={editingAccount ? editingAccount.isActive : true}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="isActive" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Cuenta Activa y Habilitada para Iniciar Sesión
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setAccountModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 text-xs font-bold shadow-sm"
                >
                  {editingAccount ? 'Guardar Cambios' : 'Crear Cuenta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: CREAR NUEVO ROL (EJ. TESORERO, FISCALIZADOR, ETC.)              */}
      {/* ========================================================================= */}
      {roleModalOpen && (
        <div
          onClick={() => setRoleModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto"
          >
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                  <Shield size={18} />
                </div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  {editingRole ? `Editar Rol: ${editingRole.name}` : 'Crear Nuevo Rol del Sistema'}
                </h2>
              </div>
              <button
                onClick={() => {
                  setRoleModalOpen(false);
                  setEditingRole(null);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveRole} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Nombre del Rol *
                </label>
                <input
                  name="name"
                  required
                  defaultValue={editingRole?.name || ''}
                  placeholder="Ej. Tesorero, Fiscalizador, Auditor, Secretaría"
                  className="mt-1 block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Código Identificador Único *
                </label>
                <input
                  name="id"
                  required
                  defaultValue={editingRole?.id || ''}
                  disabled={!!editingRole}
                  placeholder="Ej. tesorero, fiscalizador, auditor_externo"
                  className={`mt-1 block w-full rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs lowercase focus:border-indigo-500 focus:outline-none ${
                    editingRole
                      ? 'bg-slate-100 dark:bg-slate-800/50 text-slate-400 cursor-not-allowed'
                      : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white'
                  }`}
                />
                {editingRole && (
                  <p className="mt-1 text-[10px] text-slate-400">
                    El identificador único no se puede modificar una vez creado para preservar la integridad de los accesos.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Descripción / Propósito del Rol
                </label>
                <textarea
                  name="description"
                  rows={2}
                  defaultValue={editingRole?.description || ''}
                  placeholder="Describe qué funciones desempeña este perfil en la asociación..."
                  className="mt-1 block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {!editingRole && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Plantilla Base de Permisos
                  </label>
                  <select
                    name="baseTemplate"
                    defaultValue="read_only"
                    className="mt-1 block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="read_only">Solo Lectura en Operaciones (Recomendado)</option>
                    <option value="tesorero">Tesorero / Finanzas (Lectura Flota + Escritura Reportes)</option>
                    <option value="operator">Operativo (Similar a Operario de Turno)</option>
                    <option value="admin">Administrativo (Copia de permisos de Administrador)</option>
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setRoleModalOpen(false);
                    setEditingRole(null);
                  }}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 text-xs font-bold shadow-sm cursor-pointer"
                >
                  {editingRole ? 'Guardar Cambios del Rol' : 'Crear y Configurar Permisos'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN */}
      <ConfirmModal
        isOpen={deleteModalState.isOpen}
        title={deleteModalState.type === 'user' ? 'Eliminar Cuenta' : 'Eliminar Rol'}
        message={
          deleteModalState.type === 'user'
            ? `¿Estás seguro de que deseas eliminar permanentemente la cuenta de "${deleteModalState.name}"? Esta acción no se puede deshacer.`
            : `¿Estás seguro de que deseas eliminar el rol "${deleteModalState.name}"? Los usuarios asociados pasarán automáticamente a tener rol de Operario.`
        }
        confirmText="Sí, Eliminar"
        cancelText="Cancelar"
        confirmVariant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteModalState({ isOpen: false, type: 'user', id: '', name: '' })}
      />
    </div>
  );
};
