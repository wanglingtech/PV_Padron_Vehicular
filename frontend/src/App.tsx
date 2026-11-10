/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { ThemeProvider } from './context/ThemeContext.tsx';
import { ToastProvider, useToast } from './components/common/Toast.tsx';
import { Navbar } from './components/layout/Navbar.tsx';
import { Sidebar, NavigationTab } from './components/layout/Sidebar.tsx';
import { BottomNav } from './components/layout/BottomNav.tsx';
import { GlobalPdfExporterModal } from './components/common/GlobalPdfExporterModal.tsx';
import { DashboardView } from './views/DashboardView.tsx';
import { PadronView } from './views/PadronView.tsx';
import { PersonsView } from './views/PersonsView.tsx';
import { VehicleDetailView } from './views/VehicleDetailView.tsx';
import { VehicleFormView } from './views/VehicleFormView.tsx';
import { ExpirationsView } from './views/ExpirationsView.tsx';
import { RoadSafetyCoursesView } from './views/RoadSafetyCoursesView.tsx';
import { OperatorPortalView } from './views/OperatorPortalView.tsx';
import { LoginView } from './views/LoginView.tsx';
import { ImportExportView } from './views/ImportExportView.tsx';
import { AuditHistoryView } from './views/AuditHistoryView.tsx';
import { UsersView } from './views/UsersView.tsx';
import { SettingsView } from './views/SettingsView.tsx';
import { PortalHomeView } from './views/PortalHomeView.tsx';
import { PortalManagementView } from './views/PortalManagementView.tsx';
import { BackupMigrationView } from './views/BackupMigrationView.tsx';
import { ContactsDirectoryView } from './views/ContactsDirectoryView.tsx';
import { api } from './api/client.ts';

function AppContent() {
  const { isLoggedIn, isOperator, hasModuleAccess } = useAuth();
  const [currentTab, setCurrentTab] = useState<NavigationTab>('portal-inicio');
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [editingVehicleId, setEditingVehicleId] = useState<number | null>(null);
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);
  const [urgentAlertsCount, setUrgentAlertsCount] = useState<number>(0);
  const [isGlobalPdfModalOpen, setIsGlobalPdfModalOpen] = useState(false);

  // Redirigir a módulo permitido si el rol actual no tiene acceso al tab activo
  useEffect(() => {
    if (!hasModuleAccess(currentTab)) {
      const fallbackOrder: NavigationTab[] = [
        'portal-inicio',
        'dashboard',
        'padron',
        'operario-portal',
        'vencimientos',
        'personas',
        'curso-vial',
        'importar-exportar',
        'directorio-contacto',
        'historial',
        'gestion-portal',
        'backup-migracion',
        'usuarios',
        'configuracion',
        'nuevo',
      ];
      const nextTab = fallbackOrder.find((tab) => hasModuleAccess(tab));
      if (nextTab) setCurrentTab(nextTab);
    }
  }, [currentTab, hasModuleAccess]);

  // Carga periódica de conteo de alertas urgentes para la campana y badges
  const loadAlertsCount = useCallback(async () => {
    try {
      const stats = await api.getDashboardStats();
      const count = (stats.expiredDocuments || 0) + (stats.upcomingDocuments || 0);
      setUrgentAlertsCount(count);
    } catch {
      // Ignorar errores silenciosos en background
    }
  }, []);

  useEffect(() => {
    loadAlertsCount();
    const interval = setInterval(loadAlertsCount, 45000);
    return () => clearInterval(interval);
  }, [loadAlertsCount]);

  // Manejadores de navegación fluida
  const handleSelectTab = (tab: NavigationTab) => {
    setSelectedVehicleId(null);
    setEditingVehicleId(null);
    setCurrentTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleViewVehicleDetail = (id: number) => {
    setEditingVehicleId(null);
    setSelectedVehicleId(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEditVehicle = (id: number) => {
    setSelectedVehicleId(null);
    setEditingVehicleId(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNewVehicle = () => {
    setSelectedVehicleId(null);
    setEditingVehicleId(null);
    setCurrentTab('nuevo');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleVehicleSaved = (savedId: number) => {
    loadAlertsCount();
    setEditingVehicleId(null);
    setSelectedVehicleId(savedId);
  };

  const handleVehicleDeleted = () => {
    loadAlertsCount();
    setSelectedVehicleId(null);
    setEditingVehicleId(null);
    setCurrentTab('padron');
  };

  // Si no ha iniciado sesión, mostrar la pantalla de Login institucional
  if (!isLoggedIn) {
    return <LoginView />;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased transition-colors duration-200">
      {/* Barra lateral de navegación (escritorio y drawer móvil) */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        isOpenMobile={isSidebarOpenMobile}
        onCloseMobile={() => setIsSidebarOpenMobile(false)}
        urgentCount={urgentAlertsCount}
      />

      {/* Contenedor principal con Navbar fijo y área de trabajo con scroll independiente */}
      <div className="flex min-w-0 flex-1 flex-col h-full overflow-hidden">
        {/* Barra superior de navegación */}
        <Navbar
          onToggleSidebar={() => setIsSidebarOpenMobile(prev => !prev)}
          urgentAlertsCount={urgentAlertsCount}
          onNavigateToExpirations={() => handleSelectTab('vencimientos')}
          onOpenPdfModal={() => setIsGlobalPdfModalOpen(true)}
        />

        {/* Modal Global de Generación de Reportes PDF Oficiales */}
        <GlobalPdfExporterModal
          isOpen={isGlobalPdfModalOpen}
          onClose={() => setIsGlobalPdfModalOpen(false)}
          defaultModule={
            currentTab === 'padron'
              ? 'padron'
              : currentTab === 'personas'
              ? 'personas'
              : currentTab === 'vencimientos'
              ? 'vencimientos'
              : currentTab === 'curso-vial'
              ? 'curso-vial'
              : 'padron'
          }
        />

        {/* Área de trabajo de la vista activa (Único contenedor con scroll vertical de cada módulo) */}
        <main className="flex-1 overflow-y-auto px-3.5 pt-3.5 pb-28 sm:px-6 sm:pt-6 sm:pb-32 lg:px-8 lg:pt-8 lg:pb-8 max-w-full">
          <div className="mx-auto max-w-7xl w-full min-w-0">
            {/* Si se está editando un vehículo existente */}
            {editingVehicleId !== null ? (
              <VehicleFormView
                vehicleId={editingVehicleId}
                onSaved={handleVehicleSaved}
                onCancel={() => {
                  setEditingVehicleId(null);
                  if (selectedVehicleId) {
                    // Volver a la ficha que se estaba viendo
                  } else {
                    setCurrentTab('padron');
                  }
                }}
              />
            ) : selectedVehicleId !== null ? (
              /* Si se está viendo la ficha detallada de un vehículo */
              <VehicleDetailView
                vehicleId={selectedVehicleId}
                onBack={() => {
                  setSelectedVehicleId(null);
                  setCurrentTab('padron');
                }}
                onEdit={id => handleEditVehicle(id)}
                onDeleted={handleVehicleDeleted}
              />
            ) : (
              /* Vistas por pestañas */
              <>
                {currentTab === 'portal-inicio' && (
                  <PortalHomeView onNavigateToTab={handleSelectTab} />
                )}

                {currentTab === 'dashboard' && (
                  <DashboardView
                    onNavigateToPadron={() => handleSelectTab('padron')}
                    onNavigateToNewVehicle={handleNewVehicle}
                    onNavigateToExpirations={() => handleSelectTab('vencimientos')}
                    onNavigateToImport={() => handleSelectTab('importar-exportar')}
                    onViewVehicle={handleViewVehicleDetail}
                  />
                )}

                {currentTab === 'padron' && (
                  <PadronView
                    onViewDetail={handleViewVehicleDetail}
                    onEditVehicle={handleEditVehicle}
                    onNewVehicle={handleNewVehicle}
                    onGoToImport={() => handleSelectTab('importar-exportar')}
                  />
                )}

                {currentTab === 'personas' && (
                  <PersonsView onSelectVehicle={handleViewVehicleDetail} />
                )}

                {currentTab === 'curso-vial' && (
                  <RoadSafetyCoursesView />
                )}

                {currentTab === 'operario-portal' && (
                  <OperatorPortalView />
                )}

                {currentTab === 'nuevo' && (
                  <VehicleFormView
                    vehicleId={null}
                    onSaved={handleVehicleSaved}
                    onCancel={() => handleSelectTab('padron')}
                  />
                )}

                {currentTab === 'vencimientos' && (
                  <ExpirationsView
                    onViewVehicle={handleViewVehicleDetail}
                  />
                )}

                {currentTab === 'importar-exportar' && (
                  <ImportExportView
                    onImportCompleted={() => {
                      loadAlertsCount();
                      handleSelectTab('padron');
                    }}
                  />
                )}

                {currentTab === 'historial' && (
                  <AuditHistoryView />
                )}

                {currentTab === 'usuarios' && (
                  <UsersView />
                )}

                {currentTab === 'configuracion' && (
                  <SettingsView />
                )}

                {currentTab === 'gestion-portal' && (
                  <PortalManagementView
                    onPreviewPortal={() => handleSelectTab('portal-inicio')}
                  />
                )}

                {currentTab === 'backup-migracion' && (
                  <BackupMigrationView />
                )}

                {currentTab === 'directorio-contacto' && (
                  <ContactsDirectoryView />
                )}
              </>
            )}

            {/* Espaciador inferior para garantizar que en móviles/tablets ningún contenido o paginación quede obstruido por la barra inferior */}
            <div className="h-20 lg:hidden w-full shrink-0 pointer-events-none" aria-hidden="true" />
          </div>
        </main>

        {/* Barra de Navegación Inferior para Dispositivos Móviles */}
        <BottomNav
          currentTab={currentTab}
          onSelectTab={handleSelectTab}
          onToggleSidebar={() => setIsSidebarOpenMobile(prev => !prev)}
          urgentAlertsCount={urgentAlertsCount}
          isOperator={isOperator}
        />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
