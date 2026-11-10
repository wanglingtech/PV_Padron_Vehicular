import React, { useEffect, useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Users,
  Car,
  UserCheck,
  Phone,
  MapPin,
  Edit2,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
  CheckCircle2,
  X,
  Plus,
  Download,
} from 'lucide-react';
import { api } from '../api/client.ts';
import { useToast } from '../components/common/Toast.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { useDebounce } from '../hooks/useDebounce.ts';
import { Pagination } from '../components/common/Pagination.tsx';
import { exportPersonsDirectoryPDF } from '../utils/pdf-export.ts';
import { Alert } from '../utils/sweetalert.ts';
import { PersonAvatar } from '../components/common/PersonAvatar.tsx';
import type { Person } from '../types/index.ts';

interface PersonsViewProps {
  onSelectVehicle: (id: number) => void;
}

export const PersonsView: React.FC<PersonsViewProps> = ({ onSelectVehicle }) => {
  const { isAdmin } = useAuth();
  const { showToast } = useToast();

  const [persons, setPersons] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 350);
  const [roleFilter, setRoleFilter] = useState<'all' | 'owner' | 'driver' | 'both'>('all');

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Modal para editar persona
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [editForm, setEditForm] = useState({
    fullName: '',
    dni: '',
    phone: '',
    address: '',
    status: 'ACTIVO' as 'ACTIVO' | 'INACTIVO',
  });

  // Bloquear scroll de fondo cuando el modal esté abierto
  useEffect(() => {
    if (editingPerson) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [editingPerson]);
  const [isSaving, setIsSaving] = useState(false);

  const fetchPersons = async () => {
    try {
      setLoading(true);
      const data = await api.getPersons({ search: debouncedSearch });
      setPersons(data);
    } catch (err: any) {
      showToast(err.message || 'Error al cargar directorio de personas', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPersons();
    setCurrentPage(1);
  }, [debouncedSearch]);

  const openEditModal = (p: Person) => {
    setEditingPerson(p);
    setEditForm({
      fullName: p.fullName,
      dni: p.dni,
      phone: p.phone || '',
      address: p.address || '',
      status: p.status || 'ACTIVO',
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPerson) return;
    if (!editForm.fullName.trim() || !editForm.dni.trim()) {
      showToast('El DNI y Nombre Completo son obligatorios.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      await api.updatePerson(editingPerson.id, {
        fullName: editForm.fullName.trim(),
        dni: editForm.dni.trim(),
        phone: editForm.phone.trim() || undefined,
        address: editForm.address.trim() || undefined,
        status: editForm.status,
      });
      showToast('Datos de la persona actualizados exitosamente.', 'success');
      setEditingPerson(null);
      await fetchPersons();
    } catch (err: any) {
      showToast(err.message || 'Error al actualizar persona', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Filtrado por rol
  const filteredPersons = useMemo(() => {
    return persons.filter((p) => {
      if (roleFilter === 'owner') return p.ownedCount > 0;
      if (roleFilter === 'driver') return p.drivenCount > 0;
      if (roleFilter === 'both') return p.ownedCount > 0 && p.drivenCount > 0;
      return true;
    });
  }, [persons, roleFilter]);

  const totalPages = Math.ceil(filteredPersons.length / pageSize) || 1;
  const paginatedPersons = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPersons.slice(start, start + pageSize);
  }, [filteredPersons, currentPage, pageSize]);

  const handleDownloadPDF = () => {
    if (filteredPersons.length === 0) {
      Alert.error('Sin registros', 'No hay personas para generar el directorio en PDF.');
      return;
    }
    const label = `Filtro: ${roleFilter} (${filteredPersons.length} personas registradas)`;
    exportPersonsDirectoryPDF(filteredPersons, label);
    Alert.toast('Directorio descargado en PDF', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Cabecera Principal */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight sm:text-2xl">
            Directorio de Personas (Propietarios y Conductores)
          </h2>
          <p className="text-xs text-slate-500 sm:text-sm">
            Gestión de personas naturales vinculadas a las unidades del padrón vehicular.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadPDF}
            className="flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <Download size={15} className="text-blue-600" />
            <span>Descargar PDF</span>
          </button>

          <button
            onClick={fetchPersons}
            className="flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin text-blue-600' : ''} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* Nota de distinción conceptual */}
      <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4 text-xs text-blue-950">
        <p className="font-bold text-blue-900">Distinción Conceptual Importante</p>
        <p className="mt-1 text-blue-800">
          Las <strong>Personas</strong> registradas aquí son los propietarios y choferes importados o asociados al
          padrón. <em>No tienen acceso por contraseña al sistema</em> a menos que se les cree expresamente una cuenta en
          la pestaña <strong>Usuarios</strong>.
        </p>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por DNI, nombres, apellidos o número telefónico..."
            className="w-full min-h-[44px] rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-200 transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-400 font-medium flex items-center gap-1">
            <Filter size={13} />
            Filtrar rol:
          </span>
          <button
            onClick={() => setRoleFilter('all')}
            className={`rounded-full px-3 py-1.5 font-medium transition-colors ${
              roleFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos ({persons.length})
          </button>
          <button
            onClick={() => setRoleFilter('owner')}
            className={`rounded-full px-3 py-1.5 font-medium transition-colors ${
              roleFilter === 'owner'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            Propietarios ({persons.filter((p) => p.ownedCount > 0).length})
          </button>
          <button
            onClick={() => setRoleFilter('driver')}
            className={`rounded-full px-3 py-1.5 font-medium transition-colors ${
              roleFilter === 'driver'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            }`}
          >
            Conductores ({persons.filter((p) => p.drivenCount > 0).length})
          </button>
          <button
            onClick={() => setRoleFilter('both')}
            className={`rounded-full px-3 py-1.5 font-medium transition-colors ${
              roleFilter === 'both'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
            }`}
          >
            Ambos Roles ({persons.filter((p) => p.ownedCount > 0 && p.drivenCount > 0).length})
          </button>
        </div>
      </div>

      {/* Lista / Tabla de Personas */}
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs">
          <RefreshCw size={32} className="mx-auto animate-spin text-blue-600 mb-3" />
          <p className="text-sm font-medium text-slate-700">Cargando directorio de personas...</p>
        </div>
      ) : filteredPersons.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs">
          <Users size={40} className="mx-auto text-slate-300 mb-3" />
          <h3 className="text-base font-bold text-slate-800">No se encontraron personas</h3>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            {search ? 'No hay resultados que coincidan con la búsqueda.' : 'No hay personas registradas en el padrón.'}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/80 font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3.5">Persona / Foto & Nombre</th>
                  <th className="px-4 py-3.5">DNI</th>
                  <th className="px-4 py-3.5">Contacto</th>
                  <th className="px-4 py-3.5">Rol en Flota</th>
                  <th className="px-4 py-3.5">Unidades como Propietario</th>
                  <th className="px-4 py-3.5">Unidades como Conductor</th>
                  {isAdmin && <th className="px-4 py-3.5 text-right">Acción</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedPersons.map((p) => {
                  const isOwner = p.ownedCount > 0;
                  const isDriver = p.drivenCount > 0;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <PersonAvatar
                            name={p.fullName}
                            dni={p.dni}
                            size="md"
                            clickable={true}
                            badge={isOwner && isDriver ? 'bg-purple-500' : isOwner ? 'bg-blue-500' : 'bg-amber-500'}
                          />
                          <div className="min-w-0">
                            <span className="table-person-name inline-block rounded-md bg-slate-100 dark:bg-slate-200 px-2 py-0.5 font-bold text-slate-950 truncate max-w-xs shadow-2xs">
                              {p.fullName}
                            </span>
                            {p.address && <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-xs mt-0.5">{p.address}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-mono font-semibold text-slate-800 dark:text-slate-200">{p.dni}</td>
                      <td className="px-4 py-3.5 text-slate-600 dark:text-slate-400">
                        {p.phone ? (
                          <span className="flex items-center gap-1 font-mono text-slate-700 dark:text-slate-300">
                            <Phone size={12} className="text-slate-400" />
                            {p.phone}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Sin teléfono</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {isOwner && isDriver ? (
                          <span className="rounded-full bg-purple-100 dark:bg-purple-950/70 px-2.5 py-0.5 text-[11px] font-bold text-purple-800 dark:text-purple-300">
                            Propietario y Conductor
                          </span>
                        ) : isOwner ? (
                          <span className="rounded-full bg-blue-100 dark:bg-blue-950/70 px-2.5 py-0.5 text-[11px] font-bold text-blue-800 dark:text-blue-300">
                            Propietario ({p.ownedCount})
                          </span>
                        ) : isDriver ? (
                          <span className="rounded-full bg-amber-100 dark:bg-amber-950/70 px-2.5 py-0.5 text-[11px] font-bold text-amber-800 dark:text-amber-300">
                            Conductor ({p.drivenCount})
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-[11px] font-medium text-slate-600 dark:text-slate-400">
                            Sin unidad activa
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {p.ownedVehicles && p.ownedVehicles.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {p.ownedVehicles.map((ov) => (
                              <button
                                key={ov.vehicleId}
                                onClick={() => onSelectVehicle(ov.vehicleId)}
                                title="Ver ficha vehicular"
                                className="flex items-center gap-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
                              >
                                <span>P.{ov.padronNumber} ({ov.plate})</span>
                                <ExternalLink size={10} />
                              </button>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {p.drivenVehicles && p.drivenVehicles.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {p.drivenVehicles.map((dv) => (
                              <button
                                key={dv.vehicleId}
                                onClick={() => onSelectVehicle(dv.vehicleId)}
                                title="Ver ficha vehicular"
                                className="flex items-center gap-1 rounded-lg bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900 transition-colors"
                              >
                                <span>P.{dv.padronNumber} ({dv.plate})</span>
                                <ExternalLink size={10} />
                              </button>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3.5 text-right">
                          <button
                            onClick={() => openEditModal(p)}
                            title="Editar datos de contacto"
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-blue-600 transition-colors ml-auto"
                          >
                            <Edit2 size={15} />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Barra de Paginación */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredPersons.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
          />
        </div>
      )}

      {/* Modal para Editar Información de la Persona */}
      {editingPerson && (
        <div
          onClick={() => setEditingPerson(null)}
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-xs"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl transition-all my-auto border border-slate-200 dark:border-slate-800"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-base font-bold text-slate-900">Editar Datos de Persona</h3>
              <button
                onClick={() => setEditingPerson(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={editForm.fullName}
                  onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">DNI (8 dígitos) *</label>
                <input
                  type="text"
                  required
                  maxLength={8}
                  value={editForm.dni}
                  onChange={(e) => setEditForm({ ...editForm, dni: e.target.value.replace(/\D/g, '') })}
                  className="w-full font-mono rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Teléfono / Celular</label>
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  placeholder="Ej. 987654321"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Dirección Domiciliaria</label>
                <input
                  type="text"
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  placeholder="Ej. Av. Los Rosales 123"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingPerson(null)}
                  disabled={isSaving}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
