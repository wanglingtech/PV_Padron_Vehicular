import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import {
  MapPin,
  Navigation,
  Layers,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Gauge,
  Compass,
  Building,
  Flag,
  Info,
  Maximize2,
  FileText,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { Vehicle } from '../../types/index.ts';
import { AssignedRoute, OFFICIAL_ROUTES, RouteStop, getVehicleAssignedRoute } from '../../utils/vehicle-routes.ts';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getStoredCompanyBrand } from '../../utils/pdf-export.ts';

interface VehicleRouteMapProps {
  vehicle: Vehicle;
}

export const VehicleRouteMap: React.FC<VehicleRouteMapProps> = ({ vehicle }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const geofencePolygonRef = useRef<L.Polygon | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const vehicleMarkerRef = useRef<L.Marker | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Ruta activa asignada a este vehículo
  const defaultRoute = useMemo(() => {
    return getVehicleAssignedRoute(vehicle.padronNumber, vehicle.id);
  }, [vehicle.padronNumber, vehicle.id]);

  const [selectedRoute, setSelectedRoute] = useState<AssignedRoute>(defaultRoute);
  const [mapLayer, setMapLayer] = useState<'streets' | 'satellite' | 'carto'>('streets');
  const [showGeofence, setShowGeofence] = useState<boolean>(true);
  const [showStops, setShowStops] = useState<boolean>(true);
  const [selectedStop, setSelectedStop] = useState<RouteStop | null>(null);

  // Estados de simulación de recorrido
  const [isSimulating, setIsSimulating] = useState(false);
  const [simStepIndex, setSimStepIndex] = useState(0);
  const [simSpeed, setSimSpeed] = useState(25); // km/h
  const simIntervalRef = useRef<any>(null);

  // Sincronizar si cambia el vehículo
  useEffect(() => {
    const route = getVehicleAssignedRoute(vehicle.padronNumber, vehicle.id);
    setSelectedRoute(route);
  }, [vehicle.padronNumber, vehicle.id]);

  // Documentos vigentes o vencidos para el permiso de circulación
  const isDocumentCompliant =
    vehicle.overallStatus.status === 'vigente' || vehicle.overallStatus.status === 'proximo';

  // 1. Inicialización y actualización del Mapa con Leaflet
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Si ya existe instancia previa, destruirla limpiamente
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Calcular centro de la ruta
    const centerPoint: [number, number] = selectedRoute.coordinates[0] || [-12.0465, -77.0425];

    // Crear mapa
    const map = L.map(mapContainerRef.current, {
      center: centerPoint,
      zoom: 14,
      zoomControl: false,
    });

    // Control de zoom en la esquina superior derecha
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Definir capa de mapa base
    let tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}.png';
    let attribution = '&copy; OpenStreetMap contributors';

    if (mapLayer === 'carto') {
      tileUrl = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}{r}.png';
      attribution = '&copy; OpenStreetMap contributors &copy; CARTO';
    } else if (mapLayer === 'satellite') {
      tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      attribution = '&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye';
    }

    const tiles = L.tileLayer(tileUrl, { attribution, maxZoom: 19 }).addTo(map);
    tileLayerRef.current = tiles;

    // Capa de marcadores de paraderos
    const markersGroup = L.layerGroup().addTo(map);
    markersLayerRef.current = markersGroup;

    // Trazado de Geocerca (Sector de Operación Legal)
    if (showGeofence && selectedRoute.geofence.length > 0) {
      const polygon = L.polygon(selectedRoute.geofence, {
        color: selectedRoute.color,
        fillColor: selectedRoute.color,
        fillOpacity: 0.12,
        weight: 2,
        dashArray: '6, 6',
      }).addTo(map);

      polygon.bindPopup(`
        <div style="font-family: inherit; font-size: 11px; padding: 4px;">
          <b style="color: ${selectedRoute.color}; font-size: 12px;">${selectedRoute.sector}</b>
          <p style="margin: 4px 0 0 0; color: #475569;">Cuadrante perimétrico autorizado por la municipalidad para operaciones de la flota.</p>
        </div>
      `);
      geofencePolygonRef.current = polygon;
    }

    // Trazado de Polyline de la Ruta
    const polyline = L.polyline(selectedRoute.coordinates, {
      color: selectedRoute.color,
      weight: 6,
      opacity: 0.85,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map);

    polyline.bindPopup(`
      <div style="font-family: inherit; font-size: 11px; padding: 4px;">
        <span style="background: ${selectedRoute.color}; color: #fff; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 10px;">${selectedRoute.code}</span>
        <h4 style="margin: 6px 0 2px 0; font-size: 12px; font-weight: bold; color: #0f172a;">${selectedRoute.name}</h4>
        <p style="margin: 0; color: #64748b; font-size: 10px;">Longitud: ${selectedRoute.distanceKm} km • Duración ciclo: ${selectedRoute.avgDurationMinutes} min</p>
      </div>
    `);
    routePolylineRef.current = polyline;

    // Paraderos Oficiales con Iconos personalizados
    if (showStops) {
      selectedRoute.stops.forEach((stop, index) => {
        let pinColor = selectedRoute.color;
        let badgeIcon = `${index + 1}`;
        let markerLabel = 'Paradero';

        if (stop.type === 'terminal_origen') {
          pinColor = '#16a34a'; // Verde
          badgeIcon = 'A';
          markerLabel = 'Terminal Origen';
        } else if (stop.type === 'terminal_destino') {
          pinColor = '#dc2626'; // Rojo
          badgeIcon = 'B';
          markerLabel = 'Terminal Destino';
        } else if (stop.type === 'checkpoint') {
          pinColor = '#d97706'; // Ámbar
          badgeIcon = '★';
          markerLabel = 'Punto de Control';
        }

        const iconHtml = `
          <div style="
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            background-color: ${pinColor};
            color: #ffffff;
            font-weight: 900;
            font-size: 11px;
            box-shadow: 0 4px 10px rgba(0,0,0,0.3);
            border: 2px solid #ffffff;
            cursor: pointer;
            transition: transform 0.15s;
          ">
            ${badgeIcon}
          </div>
        `;

        const customIcon = L.divIcon({
          html: iconHtml,
          className: 'custom-stop-marker',
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        const marker = L.marker(stop.coordinates, { icon: customIcon });

        marker.bindPopup(`
          <div style="font-family: inherit; font-size: 11px; padding: 4px; min-width: 180px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
              <span style="background: ${pinColor}20; color: ${pinColor}; font-weight: bold; padding: 2px 6px; border-radius: 4px; font-size: 9px; text-transform: uppercase;">
                ${markerLabel}
              </span>
              <span style="font-size: 9px; color: #94a3b8; font-family: monospace;">Paradero #${index + 1}</span>
            </div>
            <h4 style="margin: 0; font-size: 12px; font-weight: bold; color: #0f172a;">${stop.name}</h4>
            <p style="margin: 2px 0 0 0; color: #475569; font-size: 10px;">${stop.address}</p>
            <p style="margin: 4px 0 0 0; color: #64748b; font-size: 9px; border-top: 1px solid #e2e8f0; padding-top: 4px;">
              ${stop.description}
            </p>
          </div>
        `);

        marker.on('click', () => {
          setSelectedStop(stop);
        });

        markersGroup.addLayer(marker);
      });
    }

    // Marcador de la Unidad (Mototaxi)
    const initialPos = selectedRoute.coordinates[simStepIndex] || selectedRoute.coordinates[0];
    const vehicleIconHtml = `
      <div style="
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        transform: translate(-50%, -50%);
      ">
        <div style="
          display: flex;
          align-items: center;
          gap: 4px;
          background: #0f172a;
          color: #ffffff;
          padding: 2px 6px;
          border-radius: 6px;
          font-size: 9px;
          font-weight: bold;
          white-space: nowrap;
          box-shadow: 0 4px 12px rgba(0,0,0,0.35);
          border: 1px solid rgba(255,255,255,0.2);
          margin-bottom: 2px;
        ">
          <span style="color: #60a5fa;">P-${vehicle.padronNumber}</span>
          <span>•</span>
          <span style="color: #f8fafc;">${vehicle.plate}</span>
        </div>
        <div style="
          display: flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          color: #ffffff;
          box-shadow: 0 0 0 4px rgba(37,99,235,0.35), 0 6px 14px rgba(0,0,0,0.4);
          border: 2px solid #ffffff;
          font-size: 16px;
        ">
          🛺
        </div>
      </div>
    `;

    const vehicleIcon = L.divIcon({
      html: vehicleIconHtml,
      className: 'vehicle-location-marker',
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    });

    const vMarker = L.marker(initialPos, { icon: vehicleIcon, zIndexOffset: 1000 }).addTo(map);
    vMarker.bindPopup(`
      <div style="font-family: inherit; font-size: 11px; padding: 4px;">
        <span style="background: #2563eb; color: #fff; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 9px;">UNIDAD ASIGNADA</span>
        <h4 style="margin: 4px 0 1px 0; font-size: 12px; font-weight: bold; color: #0f172a;">Padrón ${vehicle.padronNumber} • ${vehicle.plate}</h4>
        <p style="margin: 0; color: #64748b; font-size: 10px;">Ruta: ${selectedRoute.shortName}</p>
        <p style="margin: 4px 0 0 0; color: #059669; font-size: 10px; font-weight: bold;">
          ${isDocumentCompliant ? '✓ Unidad autorizada en corredor' : '⚠️ Observación documental'}
        </p>
      </div>
    `);
    vehicleMarkerRef.current = vMarker;

    // Ajustar el mapa al encuadre de la ruta
    map.fitBounds(polyline.getBounds(), { padding: [35, 35] });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [selectedRoute, mapLayer, showGeofence, showStops]);

  // 2. Control de simulación en vivo del avance del vehículo
  useEffect(() => {
    if (isSimulating) {
      simIntervalRef.current = setInterval(() => {
        setSimStepIndex((prev) => {
          const nextIndex = (prev + 1) % selectedRoute.coordinates.length;
          const nextCoord = selectedRoute.coordinates[nextIndex];

          if (vehicleMarkerRef.current) {
            vehicleMarkerRef.current.setLatLng(nextCoord);
          }

          // Variación realista de velocidad en km/h
          setSimSpeed(22 + Math.floor(Math.sin(nextIndex) * 8));

          return nextIndex;
        });
      }, 1400);
    } else {
      if (simIntervalRef.current) {
        clearInterval(simIntervalRef.current);
        simIntervalRef.current = null;
      }
    }

    return () => {
      if (simIntervalRef.current) {
        clearInterval(simIntervalRef.current);
      }
    };
  }, [isSimulating, selectedRoute.coordinates]);

  // Centrar mapa en la unidad
  const handleCenterOnVehicle = () => {
    if (!mapInstanceRef.current || !vehicleMarkerRef.current) return;
    const pos = vehicleMarkerRef.current.getLatLng();
    mapInstanceRef.current.flyTo(pos, 16, { animate: true, duration: 1.2 });
    vehicleMarkerRef.current.openPopup();
  };

  // Ajustar a vista completa de la ruta
  const handleFitRoute = () => {
    if (!mapInstanceRef.current || !routePolylineRef.current) return;
    mapInstanceRef.current.fitBounds(routePolylineRef.current.getBounds(), {
      padding: [40, 40],
      animate: true,
      duration: 1.2,
    });
  };

  // Clic en un paradero de la lista
  const handleSelectStop = (stop: RouteStop) => {
    setSelectedStop(stop);
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.flyTo(stop.coordinates, 17, { animate: true, duration: 1 });
  };

  // Exportar Hoja de Ruta Oficial de la Unidad en PDF
  const handleExportRoutePdf = () => {
    const brand = getStoredCompanyBrand();
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    // Cabecera institucional
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, 210, 16, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('HOJA DE RUTA Y ASIGNACIÓN OPERATIVA DE CORREDOR', 105, 10, { align: 'center' });

    // Membrete
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(13);
    doc.text(brand.name.toUpperCase(), 14, 25);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`${brand.subtitle} • RUC: ${brand.ruc || '20500000001'}`, 14, 30);
    doc.text(`Dirección Institucional: ${brand.location || 'Sede Central'}`, 14, 34);

    doc.setDrawColor(226, 232, 240);
    doc.line(14, 37, 196, 37);

    // Ficha de la unidad y ruta
    autoTable(doc, {
      startY: 40,
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold', fontSize: 9 },
      styles: { fontSize: 8, cellPadding: 3 },
      head: [['DATOS DEL VEHÍCULO EMPADRONADO', 'ESPECIFICACIÓN OFICIAL DE RUTA ASIGNADA']],
      body: [
        [
          `Padrón Oficial: N° ${vehicle.padronNumber}\nPlaca de Rodaje: ${vehicle.plate}\nMarca / Modelo: ${vehicle.brand} (${vehicle.modelYear})\nConductor Asignado: ${vehicle.driver?.fullName || 'No asignado'}\nPropietario: ${vehicle.primaryOwner?.fullName || 'No registrado'}`,
          `Código de Ruta: ${selectedRoute.code}\nNombre de Ruta: ${selectedRoute.name}\nSector Jurisdiccional: ${selectedRoute.sector}\nResolución Autorizatoria: ${selectedRoute.resolution}\nHorario Oficial: ${selectedRoute.schedule}`,
        ],
      ],
    });

    // Paraderos y Puntos de Control
    const stopsBody = selectedRoute.stops.map((s, idx) => [
      `${idx + 1}`,
      s.name,
      s.type.replace('_', ' ').toUpperCase(),
      s.address,
      s.description,
      `${s.coordinates[0].toFixed(5)}, ${s.coordinates[1].toFixed(5)}`,
    ]);

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 6,
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold', fontSize: 8 },
      styles: { fontSize: 7, cellPadding: 2.5 },
      head: [['#', 'PARADERO / CONTROL', 'TIPO', 'DIRECCIÓN DE EMBARQUE', 'OBSERVACIÓN OPERATIVA', 'COORDENADAS']],
      body: stopsBody,
    });

    // Observaciones legales
    const finalY = (doc as any).lastAutoTable.finalY + 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text('CONDICIÓN Y DISPOSICIONES COMPLEMENTARIAS:', 14, finalY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text(
      '1. La presente Hoja de Ruta acredita la asignación técnica de corredor para la unidad del padrón institucional.\n2. La unidad únicamente podrá realizar maniobras y embarque de pasajeros en los paraderos autorizados.\n3. Es obligatorio mantener al día SOAT/AFOCAT, Revisión Técnica (CITV) y Curso Vial para la validez de este permiso.',
      14,
      finalY + 5
    );

    // Firmas
    const sigY = finalY + 28;
    doc.setDrawColor(148, 163, 184);
    doc.line(25, sigY, 80, sigY);
    doc.line(130, sigY, 185, sigY);

    doc.setFontSize(7);
    doc.text('PRESIDENCIA / GERENCIA GENERAL\nAsociación Central de Transportes', 52, sigY + 4, { align: 'center' });
    doc.text('DELEGATURA DE RUTA Y FISCALIZACIÓN\nControl de Operaciones y Flota', 157, sigY + 4, { align: 'center' });

    doc.save(`Hoja_Ruta_Padron_${vehicle.padronNumber}_${selectedRoute.code}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header con Información de Ruta y Selectores */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
        <div className="flex items-start gap-4">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-md"
            style={{ backgroundColor: selectedRoute.color }}
          >
            <Compass size={26} />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="rounded-lg px-2.5 py-0.5 text-xs font-black text-white shadow-xs"
                style={{ backgroundColor: selectedRoute.color }}
              >
                {selectedRoute.code}
              </span>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {selectedRoute.shortName}
              </h2>

              {isDocumentCompliant ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950/70 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 size={12} />
                  <span>Unidad Habilitada en Corredor</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 dark:bg-rose-950/70 px-2.5 py-0.5 text-[11px] font-bold text-rose-800 dark:text-rose-300">
                  <AlertTriangle size={12} />
                  <span>Observación Documental</span>
                </span>
              )}
            </div>

            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              {selectedRoute.name}
            </p>
            <p className="mt-0.5 text-[11px] font-mono text-slate-500 dark:text-slate-500">
              {selectedRoute.sector} • {selectedRoute.resolution}
            </p>
          </div>
        </div>

        {/* Acciones de Selección y Exportación */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Selector de Ruta Oficial */}
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Ruta:</span>
            <select
              value={selectedRoute.id}
              onChange={(e) => {
                const found = OFFICIAL_ROUTES.find((r) => r.id === e.target.value);
                if (found) setSelectedRoute(found);
              }}
              className="bg-transparent text-xs font-bold text-slate-800 dark:text-white focus:outline-none cursor-pointer"
            >
              {OFFICIAL_ROUTES.map((r) => (
                <option key={r.id} value={r.id} className="dark:bg-slate-900">
                  {r.code} - {r.shortName}
                </option>
              ))}
            </select>
          </div>

          {/* Exportar Hoja de Ruta PDF */}
          <button
            onClick={handleExportRoutePdf}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors shadow-xs"
            title="Generar e imprimir hoja de ruta oficial con membrete"
          >
            <FileText size={15} />
            <span>Hoja de Ruta PDF</span>
          </button>
        </div>
      </div>

      {/* 2. Contenedor Principal: Mapa Leaflet + Barra de Controles */}
      <div className="relative rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        {/* Barra superior de herramientas sobre el mapa */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-850 px-4 py-2.5">
          <div className="flex items-center gap-2 text-xs">
            {/* Botón Simulación de Recorrido */}
            <button
              onClick={() => setIsSimulating(!isSimulating)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-bold transition-all ${
                isSimulating
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              {isSimulating ? <Pause size={14} /> : <Play size={14} />}
              <span>{isSimulating ? 'Pausar Simulación' : 'Simular Recorrido'}</span>
            </button>

            {/* Velocidad simulada */}
            {isSimulating && (
              <div className="flex items-center gap-1 text-[11px] font-mono text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-lg">
                <Gauge size={13} />
                <span>{simSpeed} km/h</span>
              </div>
            )}

            {/* Centrar en Unidad */}
            <button
              onClick={handleCenterOnVehicle}
              className="flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              title="Centrar mapa en la ubicación de la unidad"
            >
              <Navigation size={13} className="text-blue-500" />
              <span>Centrar Unidad</span>
            </button>

            {/* Ver Ruta Completa */}
            <button
              onClick={handleFitRoute}
              className="flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              title="Ajustar zoom para abarcar todo el trazado"
            >
              <Maximize2 size={13} />
              <span>Ver Ruta</span>
            </button>
          </div>

          {/* Toggles de Capas y Visualización */}
          <div className="flex items-center gap-2 text-xs">
            {/* Toggle Geocerca */}
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={showGeofence}
                onChange={(e) => setShowGeofence(e.target.checked)}
                className="rounded text-blue-600 focus:ring-0"
              />
              <span>Geocerca Sector</span>
            </label>

            {/* Toggle Paraderos */}
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={showStops}
                onChange={(e) => setShowStops(e.target.checked)}
                className="rounded text-blue-600 focus:ring-0"
              />
              <span>Paraderos</span>
            </label>

            {/* Selector de capa base */}
            <div className="flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-0.5">
              <button
                onClick={() => setMapLayer('streets')}
                className={`rounded px-2 py-0.5 text-[11px] font-semibold ${
                  mapLayer === 'streets'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Calles
              </button>
              <button
                onClick={() => setMapLayer('carto')}
                className={`rounded px-2 py-0.5 text-[11px] font-semibold ${
                  mapLayer === 'carto'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Claro
              </button>
              <button
                onClick={() => setMapLayer('satellite')}
                className={`rounded px-2 py-0.5 text-[11px] font-semibold ${
                  mapLayer === 'satellite'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Satélite
              </button>
            </div>
          </div>
        </div>

        {/* Div contenedor del mapa Leaflet */}
        <div
          ref={mapContainerRef}
          className="h-[460px] w-full z-10 bg-slate-100 dark:bg-slate-950"
        />

        {/* Leyenda flotante en la parte inferior del mapa */}
        <div className="absolute bottom-3 left-3 z-20 flex flex-wrap items-center gap-2 rounded-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3 py-2 text-[11px] shadow-lg border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ backgroundColor: selectedRoute.color }}
            />
            <span>{selectedRoute.code}: {selectedRoute.distanceKm} km</span>
          </div>
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <div className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold">
            <span className="flex h-3 w-3 items-center justify-center rounded-full bg-emerald-600 text-[8px] text-white">A</span>
            <span>Origen</span>
          </div>
          <div className="flex items-center gap-1 text-rose-700 dark:text-rose-400 font-semibold">
            <span className="flex h-3 w-3 items-center justify-center rounded-full bg-rose-600 text-[8px] text-white">B</span>
            <span>Destino</span>
          </div>
          <div className="flex items-center gap-1 text-amber-700 dark:text-amber-400 font-semibold">
            <span className="flex h-3 w-3 items-center justify-center rounded-full bg-amber-500 text-[8px] text-white">★</span>
            <span>Control</span>
          </div>
        </div>
      </div>

      {/* 3. Panel Inferior: Métricas Operativas y Lista de Paraderos Autorizados */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Tarjeta de Especificaciones Técnicas */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Ficha Técnica de Operación
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Parámetros autorizados para Padrón #{vehicle.padronNumber}
              </p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400">Longitud Total del Circuito:</span>
              <span className="font-bold text-slate-800 dark:text-white font-mono">{selectedRoute.distanceKm} km</span>
            </div>

            <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400">Tiempo de Recorrido Promedio:</span>
              <span className="font-bold text-slate-800 dark:text-white font-mono">{selectedRoute.avgDurationMinutes} minutos</span>
            </div>

            <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400">Frecuencia de Despacho:</span>
              <span className="font-bold text-slate-800 dark:text-white">{selectedRoute.frequencyMinutes}</span>
            </div>

            <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400">Horario de Circulación:</span>
              <span className="font-bold text-slate-800 dark:text-white">{selectedRoute.schedule}</span>
            </div>

            <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400">Cupo Máximo Autorizado:</span>
              <span className="font-bold text-slate-800 dark:text-white">{selectedRoute.quotaUnits} mototaxis</span>
            </div>

            <div className="flex justify-between items-center py-1.5">
              <span className="text-slate-500 dark:text-slate-400">Paraderos Oficiales:</span>
              <span className="font-bold text-blue-600 dark:text-blue-400 font-mono">{selectedRoute.stops.length} puntos</span>
            </div>
          </div>

          {/* Advertencia documental si corresponde */}
          {!isDocumentCompliant && (
            <div className="rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 p-3 text-xs text-rose-800 dark:text-rose-300 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertTriangle size={14} className="shrink-0" />
                <span>Alerta de Fiscalización</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Esta unidad cuenta con documentación vencida o próxima a vencer. Su circulación en la ruta asignada puede generar multas o retención en los puntos de control.
              </p>
            </div>
          )}
        </div>

        {/* Lista Interactiva de Paraderos Autorizados */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
                <Flag size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Paraderos y Puntos de Control ({selectedRoute.stops.length})
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Haz clic en cualquier paradero para localizarlo y enfocarlo en el mapa
                </p>
              </div>
            </div>

            <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-[11px] font-mono text-slate-600 dark:text-slate-400">
              Sector Oficial
            </span>
          </div>

          <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800/80 overflow-y-auto max-h-[300px] pr-1">
            {selectedRoute.stops.map((stop, idx) => {
              const isSelected = selectedStop?.id === stop.id;
              let badgeColor = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
              let badgeLabel = 'Paradero';

              if (stop.type === 'terminal_origen') {
                badgeColor = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300';
                badgeLabel = 'Origen';
              } else if (stop.type === 'terminal_destino') {
                badgeColor = 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300';
                badgeLabel = 'Destino';
              } else if (stop.type === 'checkpoint') {
                badgeColor = 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300';
                badgeLabel = 'Control';
              }

              return (
                <div
                  key={stop.id}
                  onClick={() => handleSelectStop(stop)}
                  className={`flex items-center justify-between p-3 rounded-xl transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50/80 dark:bg-blue-950/40 ring-1 ring-blue-500/30'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                        isSelected
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {idx + 1}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {stop.name}
                        </h4>
                        <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold ${badgeColor}`}>
                          {badgeLabel}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {stop.address}
                      </p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                        {stop.description}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-1.5 pl-3">
                    <span className="text-[10px] font-mono text-slate-400">
                      {stop.coordinates[0].toFixed(3)}, {stop.coordinates[1].toFixed(3)}
                    </span>
                    <ChevronRight size={14} className="text-slate-400" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
