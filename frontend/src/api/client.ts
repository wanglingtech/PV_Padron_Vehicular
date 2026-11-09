import {
  AuditLogItem,
  CurrentUser,
  DashboardStats,
  ExpirationItem,
  ImportPreviewResult,
  PadronChangeRequestItem,
  Person,
  Vehicle,
  VehiclePadronHistoryItem,
  PortalPost,
  PortalEvent,
  BackupRestoreResult,
  ContactItem,
  ContactsResponse,
} from '../types/index.ts';

class ApiService {
  private currentUser: CurrentUser = {
    uid: 'admin-dev-01',
    email: 'admin@transporte.pe',
    name: 'Administrador Principal',
    role: 'admin',
  };

  public getCurrentUser(): CurrentUser {
    return this.currentUser;
  }

  public setCurrentUser(user: CurrentUser) {
    this.currentUser = user;
  }

  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'x-user-role': this.currentUser.role,
      'x-user-email': this.currentUser.email,
      'x-user-name': this.currentUser.name,
      'Authorization': this.currentUser.role === 'admin' ? 'Bearer dev-admin-token' : 'Bearer dev-operator-token',
    };
  }

  // Padrón
  async getVehicles(params?: {
    search?: string;
    status?: string;
    lifeStatus?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  }): Promise<{ vehicles: Vehicle[]; total: number; page: number; limit: number; totalPages: number }> {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.status) query.set('status', params.status);
    if (params?.lifeStatus) query.set('lifeStatus', params.lifeStatus);
    if (params?.sortBy) query.set('sortBy', params.sortBy);
    if (params?.sortOrder) query.set('sortOrder', params.sortOrder);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));

    const res = await fetch(`/api/vehicles?${query.toString()}`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Error al obtener vehículos' }));
      throw new Error(err.error);
    }
    return res.json();
  }

  async getVehicleById(id: number): Promise<Vehicle> {
    const res = await fetch(`/api/vehicles/${id}`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Error al consultar vehículo' }));
      throw new Error(err.error);
    }
    return res.json();
  }

  async createVehicle(data: any): Promise<Vehicle> {
    const res = await fetch('/api/vehicles', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Error al registrar vehículo' }));
      throw new Error(err.error);
    }
    return res.json();
  }

  async updateVehicle(id: number, data: any): Promise<Vehicle> {
    const res = await fetch(`/api/vehicles/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Error al actualizar vehículo' }));
      throw new Error(err.error);
    }
    return res.json();
  }

  // Baja lógica / Retiro
  async retireVehicle(id: number, data: { reason: string; withdrawalDate?: string }): Promise<Vehicle> {
    const res = await fetch(`/api/vehicles/${id}/retire`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Error al retirar vehículo' }));
      throw new Error(err.error);
    }
    return res.json();
  }

  // Reactivación
  async reactivateVehicle(id: number): Promise<Vehicle> {
    const res = await fetch(`/api/vehicles/${id}/reactivate`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Error al reactivar vehículo' }));
      throw new Error(err.error);
    }
    return res.json();
  }

  // Cambio a Padrón Libre
  async changePadron(
    vehicleId: number,
    data: {
      newPadron: string;
      reason: string;
      authorizationReference?: string;
      authorizedBy?: string;
      effectiveDate?: string;
    }
  ): Promise<{ success: boolean; vehicleId: number; oldPadron: string; newPadron: string }> {
    const res = await fetch(`/api/vehicles/${vehicleId}/padron/change`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Error al cambiar de padrón' }));
      throw new Error(err.error);
    }
    return res.json();
  }

  // Intercambio de Padrón entre dos Unidades
  async swapPadron(data: {
    vehicleAId: number;
    vehicleBId: number;
    reason: string;
    authorizationReference: string;
    authorizedBy: string;
    effectiveDate?: string;
  }): Promise<{
    success: boolean;
    vehicleA: { id: number; oldPadron: string; newPadron: string; plate: string };
    vehicleB: { id: number; oldPadron: string; newPadron: string; plate: string };
  }> {
    const res = await fetch('/api/vehicles/padron/swap', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Error al intercambiar padrón' }));
      throw new Error(err.error);
    }
    return res.json();
  }

  // Historial de Padrón
  async getVehiclePadronHistory(vehicleId: number): Promise<VehiclePadronHistoryItem[]> {
    const res = await fetch(`/api/vehicles/${vehicleId}/padron-history`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Error al obtener historial de padrón' }));
      throw new Error(err.error);
    }
    return res.json();
  }

  // Solicitudes de cambio de padrón
  async getPadronRequests(): Promise<PadronChangeRequestItem[]> {
    const res = await fetch('/api/padron-requests', {
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Error al obtener solicitudes' }));
      throw new Error(err.error);
    }
    return res.json();
  }

  async createPadronRequest(data: {
    sourceVehicleId: number;
    targetVehicleId?: number | null;
    requestedPadron: string;
    requestType: 'CHANGE' | 'SWAP';
    reason: string;
  }): Promise<PadronChangeRequestItem> {
    const res = await fetch('/api/padron-requests', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Error al enviar solicitud' }));
      throw new Error(err.error);
    }
    return res.json();
  }

  async reviewPadronRequest(
    requestId: number,
    data: { approved: boolean; rejectionReason?: string }
  ): Promise<any> {
    const res = await fetch(`/api/padron-requests/${requestId}/review`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Error al resolver solicitud' }));
      throw new Error(err.error);
    }
    return res.json();
  }

  // Eliminación física (solo si se confirma)
  async deleteVehicle(id: number, confirmed: boolean = false): Promise<{ success: boolean; padronNumber: string }> {
    const res = await fetch(`/api/vehicles/${id}?confirmed=${confirmed}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Error al eliminar vehículo' }));
      throw new Error(err.error);
    }
    return res.json();
  }

  // Personas
  async getPersons(params?: { search?: string; status?: string }): Promise<Person[]> {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.status) query.set('status', params.status);

    const res = await fetch(`/api/persons?${query.toString()}`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Error al listar personas' }));
      throw new Error(err.error);
    }
    return res.json();
  }

  async updatePerson(id: number, data: Partial<Person>): Promise<Person> {
    const res = await fetch(`/api/persons/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Error al actualizar persona' }));
      throw new Error(err.error);
    }
    return res.json();
  }

  // Dashboard
  async getDashboardStats(): Promise<DashboardStats> {
    const res = await fetch('/api/dashboard/stats', {
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Error al obtener estadísticas' }));
      throw new Error(err.error);
    }
    return res.json();
  }

  // Vencimientos
  async getExpirations(params?: {
    timeframe?: string;
    docType?: string;
    search?: string;
  }): Promise<ExpirationItem[]> {
    const query = new URLSearchParams();
    if (params?.timeframe) query.set('timeframe', params.timeframe);
    if (params?.docType) query.set('docType', params.docType);
    if (params?.search) query.set('search', params.search);

    const res = await fetch(`/api/expirations?${query.toString()}`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Error al obtener vencimientos' }));
      throw new Error(err.error);
    }
    return res.json();
  }

  // Auditoría
  async getAuditLogs(params?: {
    padron?: string;
    entity?: string;
    limit?: number;
    offset?: number;
  }): Promise<AuditLogItem[]> {
    const query = new URLSearchParams();
    if (params?.padron) query.set('padron', params.padron);
    if (params?.entity) query.set('entity', params.entity);
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));

    const res = await fetch(`/api/audit-logs?${query.toString()}`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Error al obtener bitácora de auditoría' }));
      throw new Error(err.error);
    }
    return res.json();
  }

  // Importar
  async previewExcel(fileBase64: string): Promise<ImportPreviewResult> {
    const res = await fetch('/api/import/preview', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ fileBase64 }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Error al previsualizar archivo' }));
      throw new Error(err.error);
    }
    return res.json();
  }


  async confirmImport(rows: any[]): Promise<{
    success: boolean;
    importedCount: number;
    updatedCount: number;
    reviewCount: number;
    skippedCount: number;
  }> {
    const res = await fetch('/api/import/confirm', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ rows }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Error al confirmar importación' }));
      throw new Error(err.error);
    }
    return res.json();
  }


  // Conductores y Curso de Educación Vial Anual
  async getDriversWithCourses(params?: {
    search?: string;
    courseStatus?: string;
  }): Promise<any[]> {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.courseStatus) query.set('courseStatus', params.courseStatus);

    const res = await fetch(`/api/drivers/courses?${query.toString()}`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Error al obtener lista de curso vial' }));
      throw new Error(err.error);
    }
    return res.json();
  }

  async updateDriverCourse(
    driverId: number,
    data: {
      vehicleId?: number;
      certificateNumber?: string;
      issueDate?: string;
      expirationDate?: string;
    }
  ): Promise<any> {
    const res = await fetch(`/api/drivers/${driverId}/course`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Error al actualizar curso vial' }));
      throw new Error(err.error);
    }
    return res.json();
  }

  async syncCoursesBulk(
    dataOrIdentifiers:
      | string[]
      | {
          approvedIdentifiers?: string[];
          evaluations?: Array<{ driverId: number; vehicleId?: number; dni?: string; passed: boolean }>;
          year?: number;
        },
    yearParam?: number
  ): Promise<{
    totalEvaluated: number;
    passedCount: number;
    failedCount?: number;
    missingCount: number;
    updatedDrivers: any[];
    missingDrivers: any[];
  }> {
    let body: any = {};
    if (Array.isArray(dataOrIdentifiers)) {
      body = { approvedIdentifiers: dataOrIdentifiers, year: yearParam };
    } else {
      body = dataOrIdentifiers;
    }

    const res = await fetch('/api/drivers/courses/bulk-sync', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Error en sincronización masiva de curso vial' }));
      throw new Error(err.error);
    }
    return res.json();
  }

  async processCourseDocumentAI(
    fileBase64: string,
    mimeType: string,
    courseYear?: number
  ): Promise<{
    success: boolean;
    extractedDrivers: Array<{
      fullName: string;
      dni?: string;
      passed: boolean | null;
      notes?: string;
    }>;
    count: number;
    courseYear: number;
  }> {
    const res = await fetch('/api/drivers/courses/process-ai-document', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ fileBase64, mimeType, courseYear }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Error al procesar documento con IA' }));
      throw new Error(err.error);
    }
    return res.json();
  }

  // 7. Roles del Sistema y Matriz de Permisos (RBAC) en Base de Datos
  async getRoles(): Promise<any[]> {
    const res = await fetch('/api/roles', {
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Error al obtener roles' }));
      throw new Error(err.error);
    }
    return res.json();
  }

  async createRole(data: {
    id: string;
    name: string;
    description?: string;
    badgeColor?: string;
    permissions: Record<string, string>;
  }): Promise<any> {
    const res = await fetch('/api/roles', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Error al crear rol en base de datos' }));
      throw new Error(err.error);
    }
    return res.json();
  }

  async updateRole(
    id: string,
    data: {
      name?: string;
      description?: string;
      badgeColor?: string;
      permissions?: Record<string, string>;
    }
  ): Promise<any> {
    const res = await fetch(`/api/roles/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Error al actualizar rol en base de datos' }));
      throw new Error(err.error);
    }
    return res.json();
  }

  async deleteRole(id: string): Promise<any> {
    const res = await fetch(`/api/roles/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Error al eliminar rol en base de datos' }));
      throw new Error(err.error);
    }
    return res.json();
  }

  // 8. Cuentas de Usuarios en Base de Datos
  async getUsers(): Promise<any[]> {
    const res = await fetch('/api/users', {
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Error al listar usuarios' }));
      throw new Error(err.error);
    }
    return res.json();
  }

  async createUser(data: {
    name: string;
    email: string;
    role: string;
    password?: string;
    assignedPadron?: string;
    isActive?: boolean;
  }): Promise<any> {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Error al registrar usuario en base de datos' }));
      throw new Error(err.error);
    }
    return res.json();
  }

  async updateUser(
    id: number | string,
    data: {
      name?: string;
      email?: string;
      role?: string;
      password?: string;
      assignedPadron?: string | null;
      isActive?: boolean;
    }
  ): Promise<any> {
    const res = await fetch(`/api/users/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Error al actualizar usuario en base de datos' }));
      throw new Error(err.error);
    }
    return res.json();
  }

  async deleteUser(id: number | string): Promise<any> {
    const res = await fetch(`/api/users/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Error al eliminar usuario en base de datos' }));
      throw new Error(err.error);
    }
    return res.json();
  }

  // --- PORTAL DE INICIO & CARTELERA DIGITAL ---
  async getPortalPosts(params?: { all?: boolean }): Promise<PortalPost[]> {
    const query = params?.all ? '?all=true' : '';
    const res = await fetch(`/api/portal/posts${query}`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      throw new Error('Error al cargar publicaciones del portal');
    }
    return res.json();
  }

  async createPortalPost(data: Partial<PortalPost>): Promise<PortalPost> {
    const res = await fetch('/api/portal/posts', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Error al crear publicación' }));
      throw new Error(err.error);
    }
    return res.json();
  }

  async updatePortalPost(id: number, data: Partial<PortalPost>): Promise<PortalPost> {
    const res = await fetch(`/api/portal/posts/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Error al actualizar publicación' }));
      throw new Error(err.error);
    }
    return res.json();
  }

  async deletePortalPost(id: number): Promise<{ success: boolean; id: number }> {
    const res = await fetch(`/api/portal/posts/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Error al eliminar publicación' }));
      throw new Error(err.error);
    }
    return res.json();
  }

  async reorderPortalPosts(orderedIds: number[]): Promise<any> {
    const res = await fetch('/api/portal/posts/reorder', {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify({ orderedIds }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Error al reordenar publicaciones' }));
      throw new Error(err.error);
    }
    return res.json();
  }

  // Agenda y Fechas Importantes
  async getPortalEvents(params?: { all?: boolean }): Promise<PortalEvent[]> {
    const query = params?.all ? '?all=true' : '';
    const res = await fetch(`/api/portal/events${query}`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      throw new Error('Error al cargar agenda y eventos');
    }
    return res.json();
  }

  async createPortalEvent(data: Partial<PortalEvent>): Promise<PortalEvent> {
    const res = await fetch('/api/portal/events', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Error al registrar evento' }));
      throw new Error(err.error);
    }
    return res.json();
  }

  async updatePortalEvent(id: number, data: Partial<PortalEvent>): Promise<PortalEvent> {
    const res = await fetch(`/api/portal/events/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Error al actualizar evento' }));
      throw new Error(err.error);
    }
    return res.json();
  }

  async deletePortalEvent(id: number): Promise<{ success: boolean; id: number }> {
    const res = await fetch(`/api/portal/events/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Error al eliminar evento' }));
      throw new Error(err.error);
    }
    return res.json();
  }

  // Previsualización y diagnóstico de importación por PDF
  async previewPdf(fileBase64: string, fileName?: string): Promise<ImportPreviewResult> {
    const res = await fetch('/api/import/preview-pdf', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ fileBase64, fileName }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Error al procesar y diagnosticar archivo PDF' }));
      throw new Error(err.error);
    }
    return res.json();
  }

  // Métricas y estado del sistema de Backup
  async getBackupStats(): Promise<{
    databaseStatus: string;
    databaseEngine: string;
    tablesCount: number;
    totalRecords: number;
    estimatedSizeKb: number;
    lastBackup: {
      timestamp: string;
      user: string;
      action: string;
      details: string;
    } | null;
    summary: Record<string, number>;
  }> {
    const res = await fetch('/api/backup/stats', {
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Error al consultar métricas de la base de datos' }));
      throw new Error(err.error);
    }
    return res.json();
  }

  // Descarga de respaldo en formato JSON o script SQL universal
  async downloadBackupFile(format: 'json' | 'sql'): Promise<void> {
    const res = await fetch(`/api/backup/export?format=${format}`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Error al exportar archivo de respaldo' }));
      throw new Error(err.error);
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    const dateStr = new Date().toISOString().slice(0, 10);
    a.download = format === 'sql'
      ? `backup_migracion_padron_${dateStr}.sql`
      : `backup_padron_completo_${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  // Restauración o migración de base de datos
  async restoreBackup(backupData: any, mode: 'merge' | 'overwrite'): Promise<BackupRestoreResult> {
    const res = await fetch('/api/backup/restore', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ backupData, mode }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Error al restaurar respaldo en base de datos' }));
      throw new Error(err.error);
    }
    return res.json();
  }

  // Directorio de Contactos y WhatsApp por Roles
  async getContacts(params?: {
    search?: string;
    role?: string;
    page?: number;
    limit?: number;
  }): Promise<ContactsResponse> {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.role) query.set('role', params.role);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));

    const res = await fetch(`/api/contacts?${query.toString()}`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Error al obtener contactos' }));
      throw new Error(err.error);
    }
    return res.json();
  }
}

export const api = new ApiService();
