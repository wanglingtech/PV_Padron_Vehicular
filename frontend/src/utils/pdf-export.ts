import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface CompanyBrandInfo {
  name: string;
  subtitle: string;
  location?: string;
  ruc?: string;
}

export const defaultCompanyBrand: CompanyBrandInfo = {
  name: 'ASOCIACIÓN CENTRAL DE TRANSPORTES EN MOTOTAXIS',
  subtitle: 'SISTEMA INTEGRAL DE GESTIÓN DE PADRÓN VEHICULAR',
  location: 'SAN JUAN DE LURIGANCHO - LIMA, PERÚ',
  ruc: 'RUC: 20549281742',
};

// Obtiene la configuración de marca guardada en localStorage o default
export function getStoredCompanyBrand(): CompanyBrandInfo {
  try {
    const raw = localStorage.getItem('padron_company_brand');
    if (raw) {
      return { ...defaultCompanyBrand, ...JSON.parse(raw) };
    }
  } catch {
    // fallback
  }
  return defaultCompanyBrand;
}

// Guarda la configuración de la empresa
export function setStoredCompanyBrand(info: CompanyBrandInfo) {
  try {
    localStorage.setItem('padron_company_brand', JSON.stringify(info));
  } catch {
    // ignore
  }
}

// Encabezado institucional uniforme para todos los reportes PDF
function addDocumentHeader(
  doc: jsPDF,
  reportTitle: string,
  filterDescription?: string,
  brand?: CompanyBrandInfo
) {
  const company = brand || getStoredCompanyBrand();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Barra superior decorativa
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(0, 0, pageWidth, 5, 'F');
  doc.setFillColor(37, 99, 235); // blue-600
  doc.rect(0, 5, pageWidth, 2, 'F');

  // Logotipo / Emblema institucional (Vectorial)
  doc.setFillColor(37, 99, 235);
  doc.roundedRect(14, 12, 16, 16, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('PAD', 16, 21);
  doc.setFontSize(7);
  doc.text('PRO', 18, 25);

  // Nombre de la empresa y subtítulo
  doc.setTextColor(15, 23, 42); // slate-900
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(company.name, 34, 17);

  doc.setTextColor(100, 116, 139); // slate-500
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`${company.subtitle} | ${company.location}`, 34, 22);
  if (company.ruc) {
    doc.text(`${company.ruc} | Registro Oficial`, 34, 26);
  }

  // Título del reporte
  doc.setFillColor(241, 245, 249); // slate-100
  doc.roundedRect(14, 32, pageWidth - 28, 14, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.3);
  doc.roundedRect(14, 32, pageWidth - 28, 14, 2, 2, 'S');

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.text(reportTitle.toUpperCase(), 20, 40);

  // Fecha y hora
  const fechaGeneracion = new Date().toLocaleString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Generado: ${fechaGeneracion}`, pageWidth - 70, 40);

  if (filterDescription) {
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Filtro aplicado: ${filterDescription}`, 20, 44);
  }

  return 50; // Y inicial para la tabla
}

// Pie de página con numeración y certificación
function addDocumentFooter(doc: jsPDF) {
  const pageCount = (doc as any).internal.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.3);
    doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);

    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.setFont('helvetica', 'normal');
    doc.text('Documento oficial emitido por el Sistema de Padrón Vehicular', 14, pageHeight - 7);
    doc.text(`Página ${i} de ${pageCount}`, pageWidth - 32, pageHeight - 7);
  }
}

// 1. Exportar Padrón Vehicular Completo
export function exportPadronVehicularPDF(vehiclesList: any[], filterLabel?: string) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const startY = addDocumentHeader(
    doc,
    'Reporte General de Padrón Vehicular Oficial',
    filterLabel || `Total de unidades registradas: ${vehiclesList.length}`
  );

  const tableHead = [
    [
      'N° Padrón',
      'Placa',
      'Marca / Modelo',
      'Año',
      'Propietario Titular',
      'Conductor Asignado',
      'AFOCAT / SOAT',
      'Rev. Técnica',
      'Curso Vial',
      'Estado',
    ],
  ];

  const tableData = vehiclesList.map((v) => {
    const owner = v.primaryOwner?.fullName || v.owners?.[0]?.fullName || 'Sin propietario';
    const driver = v.driver?.fullName || 'Sin conductor';
    const insExp = v.insurance?.expirationDate || 'No reg.';
    const techExp = v.technicalInspection?.expirationDate || 'No reg.';
    const courseExp = v.roadSafetyCourse?.expirationDate || 'No reg.';
    const status = v.status || 'ACTIVO';

    return [
      v.padronNumber,
      v.plate,
      v.brand,
      v.modelYear?.toString() || '-',
      owner,
      driver,
      insExp,
      techExp,
      courseExp,
      status,
    ];
  });

  autoTable(doc, {
    startY,
    head: tableHead,
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 41, 59],
      valign: 'middle',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
      2: { cellWidth: 28 },
      3: { cellWidth: 12, halign: 'center' },
      4: { cellWidth: 46 },
      5: { cellWidth: 46 },
      6: { cellWidth: 23, halign: 'center' },
      7: { cellWidth: 23, halign: 'center' },
      8: { cellWidth: 23, halign: 'center' },
      9: { cellWidth: 20, halign: 'center' },
    },
    margin: { left: 14, right: 14, bottom: 18 },
  });

  addDocumentFooter(doc);
  doc.save(`padron_vehicular_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// 2. Exportar Directorio de Personas (Propietarios y Conductores)
export function exportPersonsDirectoryPDF(personsList: any[], filterLabel?: string) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const startY = addDocumentHeader(
    doc,
    'Directorio Oficial de Personas (Propietarios y Conductores)',
    filterLabel || `Total de personas: ${personsList.length}`
  );

  const tableHead = [
    ['DNI', 'Apellidos y Nombres', 'Teléfono', 'Dirección', 'Rol Registrado', 'Unidades Asociadas', 'Estado'],
  ];

  const tableData = personsList.map((p) => {
    const isOwner = p.isOwner ? 'Propietario' : '';
    const isDriver = p.isDriver ? 'Conductor' : '';
    const roles = [isOwner, isDriver].filter(Boolean).join(' / ') || 'Registrado';
    const vehiclesCount = (p.ownedVehiclesCount || 0) + (p.drivenVehiclesCount || 0);

    return [
      p.dni,
      p.fullName,
      p.phone || 'No reg.',
      p.address || 'No reg.',
      roles,
      `${vehiclesCount} unidad(es)`,
      p.status || 'ACTIVO',
    ];
  });

  autoTable(doc, {
    startY,
    head: tableHead,
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 8.5,
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
      valign: 'middle',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 50 },
      2: { cellWidth: 24, halign: 'center' },
      3: { cellWidth: 38 },
      4: { cellWidth: 26, halign: 'center' },
      5: { cellWidth: 22, halign: 'center' },
      6: { cellWidth: 18, halign: 'center' },
    },
    margin: { left: 14, right: 14, bottom: 18 },
  });

  addDocumentFooter(doc);
  doc.save(`directorio_personas_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// 3. Exportar Reporte de Vencimientos / Alertas Documentarias
export function exportExpirationsReportPDF(expirationsList: any[], filterLabel?: string) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const startY = addDocumentHeader(
    doc,
    'Control y Monitoreo de Vencimientos de Documentos',
    filterLabel || `Total de alertas documentarias: ${expirationsList.length}`
  );

  const tableHead = [
    ['Padrón', 'Placa', 'Documento', 'Entidad / N°', 'F. Vencimiento', 'Días', 'Estado Alerta'],
  ];

  const tableData = expirationsList.map((item) => {
    return [
      item.padronNumber,
      item.plate,
      item.documentType,
      item.identifier || item.centerName || item.entityName || 'S/N',
      item.expirationDate || 'Sin fecha',
      item.daysRemaining !== undefined ? `${item.daysRemaining} d.` : '-',
      item.status === 'EXPIRED' ? 'VENCIDO' : item.status === 'UPCOMING' ? 'POR VENCER' : 'VIGENTE',
    ];
  });

  autoTable(doc, {
    startY,
    head: tableHead,
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [185, 28, 28], // red-700
      textColor: [255, 255, 255],
      fontSize: 8.5,
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
    },
    alternateRowStyles: {
      fillColor: [254, 242, 242], // red-50
    },
    columnStyles: {
      0: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
      2: { cellWidth: 38 },
      3: { cellWidth: 38 },
      4: { cellWidth: 26, halign: 'center' },
      5: { cellWidth: 16, halign: 'center' },
      6: { cellWidth: 24, halign: 'center', fontStyle: 'bold' },
    },
    margin: { left: 14, right: 14, bottom: 18 },
  });

  addDocumentFooter(doc);
  doc.save(`reporte_vencimientos_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// 4. Exportar Reporte de Conductores & Curso de Educación Vial Anual (Solicitado expresamente)
export function exportRoadSafetyCourseReportPDF(driversWithCourse: any[], filterLabel?: string) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const year = new Date().getFullYear();
  const startY = addDocumentHeader(
    doc,
    `Padrón de Conductores y Registro de Curso Vial Anual (${year})`,
    filterLabel || `Total de conductores evaluados: ${driversWithCourse.length}`
  );

  const tableHead = [
    [
      'N°',
      'DNI Conductor',
      'Apellidos y Nombres',
      'Teléfono',
      'Padrón',
      'Placa',
      'Licencia Conducir',
      'N° Certificado',
      'F. Vencimiento',
      'Condición Curso Vial',
    ],
  ];

  const tableData = driversWithCourse.map((d, index) => {
    const passed = d.passedCourse;
    const condition = passed ? 'APROBÓ / AL DÍA' : 'NO PASÓ / PENDIENTE';

    return [
      (index + 1).toString(),
      d.dni || '-',
      d.fullName || '-',
      d.phone || 'S/N',
      d.padronNumber || '-',
      d.plate || '-',
      d.licenseNumber || 'S/N',
      d.certificateNumber || 'Pendiente',
      d.courseExpirationDate || 'Sin fecha',
      condition,
    ];
  });

  autoTable(doc, {
    startY,
    head: tableHead,
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 8.5,
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
      valign: 'middle',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
      2: { cellWidth: 58 },
      3: { cellWidth: 22, halign: 'center' },
      4: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
      5: { cellWidth: 20, halign: 'center' },
      6: { cellWidth: 28, halign: 'center' },
      7: { cellWidth: 28, halign: 'center' },
      8: { cellWidth: 24, halign: 'center' },
      9: { cellWidth: 38, halign: 'center', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      // Pintar en verde si aprobó o rojo si no pasó
      if (data.section === 'body' && data.column.index === 9) {
        if (data.cell.raw === 'APROBÓ / AL DÍA') {
          data.cell.styles.textColor = [22, 101, 52]; // green-800
          data.cell.styles.fillColor = [220, 252, 231]; // green-100
        } else {
          data.cell.styles.textColor = [153, 27, 27]; // red-800
          data.cell.styles.fillColor = [254, 226, 226]; // red-100
        }
      }
    },
    margin: { left: 14, right: 14, bottom: 18 },
  });

  addDocumentFooter(doc);
  doc.save(`curso_vial_conductores_${year}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// 4b. Planilla Oficial de Asistencia y Evaluación Presencial (Física) para el Administrador
export function exportRoadSafetyAttendanceSheetPDF(driversList: any[], courseYear?: number) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const year = courseYear || new Date().getFullYear();
  const pageWidth = doc.internal.pageSize.getWidth();

  const startY = addDocumentHeader(
    doc,
    `Planilla de Evaluación Presencial - Curso Vial Anual ${year}`,
    `Documento oficial de control físico para el Administrador | Total conductores: ${driversList.length}`
  );

  // Cuadro con datos de la sesión presencial
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, startY, pageWidth - 28, 14, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.2);
  doc.roundedRect(14, startY, pageWidth - 28, 14, 2, 2, 'S');

  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'bold');
  doc.text('FECHA DEL CURSO:', 18, startY + 5.5);
  doc.setFont('helvetica', 'normal');
  doc.text('_____ / _____ / ' + year, 52, startY + 5.5);

  doc.setFont('helvetica', 'bold');
  doc.text('INSTRUCTOR / PONENTE:', 95, startY + 5.5);
  doc.setFont('helvetica', 'normal');
  doc.text('________________________________', 138, startY + 5.5);

  doc.setFont('helvetica', 'bold');
  doc.text('LUGAR / SEDE:', 18, startY + 10.5);
  doc.setFont('helvetica', 'normal');
  doc.text('_____________________________________', 42, startY + 10.5);

  doc.setFont('helvetica', 'bold');
  doc.text('INSTRUCCIÓN:', 110, startY + 10.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Marcar con [ X ] si PASÓ o NO PASÓ la capacitación.', 134, startY + 10.5);

  const tableHead = [
    [
      'N°',
      'DNI',
      'Apellidos y Nombres Completos del Conductor',
      'Padrón / Placa',
      'PASÓ\n(Aprobó)\n[     ]',
      'NO PASÓ\n(Desaprobó)\n[     ]',
      'Firma / Huella del Conductor',
    ],
  ];

  const tableData = driversList.map((d, index) => [
    (index + 1).toString(),
    d.dni || '-',
    d.fullName || '-',
    `${d.padronNumber || 'S/N'} (${d.plate || '-'})`,
    '[     ]',
    '[     ]',
    '',
  ]);

  autoTable(doc, {
    startY: startY + 17,
    head: tableHead,
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [15, 23, 42],
      valign: 'middle',
      minCellHeight: 9,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
      2: { cellWidth: 58 },
      3: { cellWidth: 26, halign: 'center' },
      4: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
      5: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
      6: { cellWidth: 30, halign: 'center' },
    },
    margin: { left: 14, right: 14, bottom: 25 },
  });

  // Bloque de firmas al pie
  const finalY = (doc as any).lastAutoTable.finalY + 8;
  if (finalY < doc.internal.pageSize.getHeight() - 25) {
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.3);
    // Firma 1
    doc.line(25, finalY + 10, 85, finalY + 10);
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'bold');
    doc.text('FIRMA DEL ADMINISTRADOR', 32, finalY + 14);
    doc.setFont('helvetica', 'normal');
    doc.text('Control & Formalización', 36, finalY + 18);

    // Firma 2
    doc.line(125, finalY + 10, 185, finalY + 10);
    doc.setFont('helvetica', 'bold');
    doc.text('RESPONSABLE SEGURIDAD VIAL', 128, finalY + 14);
    doc.setFont('helvetica', 'normal');
    doc.text('Instructor / Capacitador', 136, finalY + 18);
  }

  addDocumentFooter(doc);
  doc.save(`planilla_evaluacion_curso_vial_${year}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// 5. Exportar Historial de Padrones y Reasignaciones
export function exportPadronHistoryPDF(historyList: any[]) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const startY = addDocumentHeader(
    doc,
    'Historial Oficial de Reasignación e Intercambio de Padrones',
    `Total de movimientos registrados: ${historyList.length}`
  );

  const tableHead = [
    ['Fecha', 'Padrón Ant.', 'Padrón Nuevo', 'Tipo Operación', 'Placa / Unidad', 'Motivo / Autorizado por'],
  ];

  const tableData = historyList.map((h) => {
    return [
      h.createdAt ? new Date(h.createdAt).toLocaleDateString('es-PE') : h.effectiveDate || '-',
      h.previousPadron || '-',
      h.newPadron || '-',
      h.changeType || 'CAMBIO',
      h.vehiclePlate || `ID #${h.vehicleId}`,
      `${h.reason || 'Sin motivo'} | Aut: ${h.authorizedBy || h.changedByUserName || 'Admin'}`,
    ];
  });

  autoTable(doc, {
    startY,
    head: tableHead,
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 8.5,
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 24, halign: 'center' },
      1: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
      2: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
      3: { cellWidth: 28, halign: 'center' },
      4: { cellWidth: 26, halign: 'center' },
      5: { cellWidth: 60 },
    },
    margin: { left: 14, right: 14, bottom: 18 },
  });

  addDocumentFooter(doc);
  doc.save(`historial_padrones_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// 5b. Exportar Bitácora Detallada de Auditoría y Trazabilidad (Quién, Cuándo y Qué Acción)
export function exportAuditLogPDF(logsList: any[], filterLabel?: string) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const startY = addDocumentHeader(
    doc,
    'Bitácora Oficial de Auditoría y Trazabilidad de Datos',
    filterLabel || `Registro cronológico inmutable de operaciones sobre el padrón | Total de eventos: ${logsList.length}`
  );

  const tableHead = [
    [
      'N°',
      'Fecha y Hora (Cuándo)',
      'Usuario Responsable (Quién)',
      'Acción',
      'Padrón / Entidad',
      'Campo Modificado',
      'Detalle del Cambio (Valor Anterior ➔ Valor Nuevo)',
      'Motivo / Observación',
    ],
  ];

  const tableData = logsList.map((log, index) => {
    const dateFormatted = log.createdAt
      ? new Date(log.createdAt).toLocaleString('es-PE', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      : '-';

    const userDisplay = `${log.userName || 'Usuario'} (${log.userEmail || '-'})`;
    const actionDisplay =
      log.action === 'CREATE'
        ? 'CREACIÓN'
        : log.action === 'UPDATE'
        ? 'MODIFICACIÓN'
        : log.action === 'DELETE'
        ? 'BAJA / ELIMINACIÓN'
        : log.action || 'OPERACIÓN';

    const entityPadron = log.padronNumber
      ? `${log.padronNumber} [${log.entity || 'Vehículo'}]`
      : `[${log.entity || 'Sistema'}] #${log.entityId || '-'}`;

    const diffDetail =
      log.oldValue && log.newValue
        ? `${log.oldValue}  ➔  ${log.newValue}`
        : log.newValue
        ? `Nuevo: ${log.newValue}`
        : log.oldValue
        ? `Eliminado: ${log.oldValue}`
        : '-';

    return [
      (index + 1).toString(),
      dateFormatted,
      userDisplay,
      actionDisplay,
      entityPadron,
      log.fieldName || 'General',
      diffDetail,
      log.reason || log.ipAddress || 'Operación registrada en sistema',
    ];
  });

  autoTable(doc, {
    startY,
    head: tableHead,
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 41, 59],
      valign: 'middle',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 32, halign: 'center', fontStyle: 'bold' },
      2: { cellWidth: 46 },
      3: { cellWidth: 28, halign: 'center', fontStyle: 'bold' },
      4: { cellWidth: 30, halign: 'center' },
      5: { cellWidth: 32 },
      6: { cellWidth: 54 },
      7: { cellWidth: 36 },
    },
    margin: { left: 14, right: 14, bottom: 18 },
  });

  addDocumentFooter(doc);
  doc.save(`bitacora_auditoria_padron_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// 6. Exportar Padrón y Directorio Exclusivo de Conductores (con estado ACTIVO / INACTIVO, DNI, Licencia y Unidad)
export function exportDriversDirectoryPDF(driversList: any[], filterLabel?: string) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const activeCount = driversList.filter((d) => (d.status || d.personStatus || 'ACTIVO') === 'ACTIVO').length;
  const inactiveCount = driversList.length - activeCount;

  const startY = addDocumentHeader(
    doc,
    'Padrón Oficial y Directorio Exclusivo de Conductores',
    filterLabel || `Total Conductores: ${driversList.length} | Activos en Flota: ${activeCount} | Inactivos / Cesados: ${inactiveCount}`
  );

  const tableHead = [
    [
      'N°',
      'DNI',
      'Apellidos y Nombres',
      'Teléfono / Celular',
      'Padrón',
      'Placa',
      'Licencia Conducir',
      'Venc. Licencia',
      'Estado en Flota',
      'Domicilio / Observaciones',
    ],
  ];

  const tableData = driversList.map((d, index) => {
    const isActivo = (d.status || d.personStatus || 'ACTIVO') === 'ACTIVO';
    const statusText = isActivo ? 'ACTIVO' : 'INACTIVO';
    const padron = d.padronNumber || d.drivenVehicles?.[0]?.padronNumber || 'Sin unidad';
    const plate = d.plate || d.drivenVehicles?.[0]?.plate || '-';
    const address = d.address || (d.withdrawalReason ? `Baja: ${d.withdrawalReason}` : 'No registrado');

    return [
      (index + 1).toString(),
      d.dni || '-',
      d.fullName || '-',
      d.phone || 'S/N',
      padron,
      plate,
      d.licenseNumber || 'S/N',
      d.licenseExpirationDate || 'Sin fecha',
      statusText,
      address,
    ];
  });

  autoTable(doc, {
    startY,
    head: tableHead,
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 41, 59],
      valign: 'middle',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
      2: { cellWidth: 50 },
      3: { cellWidth: 22, halign: 'center' },
      4: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
      5: { cellWidth: 20, halign: 'center' },
      6: { cellWidth: 26, halign: 'center' },
      7: { cellWidth: 22, halign: 'center' },
      8: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
      9: { cellWidth: 56 },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 8) {
        if (data.cell.raw === 'ACTIVO') {
          data.cell.styles.textColor = [16, 185, 129];
          data.cell.styles.fontStyle = 'bold';
        } else if (data.cell.raw === 'INACTIVO') {
          data.cell.styles.textColor = [225, 29, 72];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
    margin: { left: 14, right: 14, bottom: 18 },
  });

  addDocumentFooter(doc);
  doc.save(`padron_conductores_${new Date().toISOString().slice(0, 10)}.pdf`);
}

