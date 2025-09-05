/**
 * Poblador para AgendaExtendida en MongoDB
 * Genera datos realistas para el sistema Yggdrasil
 */

// Configuración
const CONFIG = {
    AGENDA_ID_MIN: 1,
    AGENDA_ID_MAX: 32700,
    MEDICO_ID_MIN: 1,
    MEDICO_ID_MAX: 300,
    PORCENTAJE_AGENDAS_CON_EXTENSION: 0.5, // 70% de agendas tendrán datos extendidos
    MAX_MEDICOS_POR_AGENDA: 4,
    MIN_MEDICOS_POR_AGENDA: 1
};

// Datos base realistas
const TIPOS_PROCEDIMIENTO = [
    "Cirugía General",
    "Cirugía Cardiovascular", 
    "Consulta Especializada",
    "Procedimiento Menor",
    "Cirugía Traumatológica",
    "Intervención Neurológica",
    "Cirugía Plástica",
    "Procedimiento Endoscópico",
    "Cirugía Urológica",
    "Consulta de Control"
];

const ROLES_MEDICOS = [
    "Cirujano Principal",
    "Cirujano Asistente", 
    "Anestesista",
    "Enfermero Instrumentista",
    "Residente",
    "Supervisor",
    "Especialista Consultor",
    "Médico Tratante"
];

const EQUIPAMIENTO_MEDICO = [
    "Monitor de Signos Vitales",
    "Ventilador Mecánico",
    "Desfibrilador",
    "Electrocardiógrafo",
    "Bomba de Infusión",
    "Aspirador Quirúrgico",
    "Lámpara Quirúrgica",
    "Mesa de Anestesia",
    "Monitor de Presión Invasiva",
    "Oxímetro de Pulso",
    "Cauterio Electrónico",
    "Microscopio Quirúrgico"
];

const OBSERVACIONES_MEDICOS = [
    "Especialista en procedimientos complejos",
    "Experiencia en casos de emergencia", 
    "Supervisión de residentes",
    "Responsable del protocolo post-operatorio",
    "Encargado del seguimiento anestésico",
    "Soporte en técnicas especializadas",
    "Coordinación del equipo quirúrgico",
    null // Para que algunos no tengan observaciones
];

const NOTAS_ADICIONALES = [
    "Paciente con antecedentes cardíacos",
    "Requiere monitoreo continuo post-cirugía",
    "Procedimiento de alta complejidad",
    "Coordinación con múltiples especialidades",
    "Seguimiento especial por comorbilidades",
    "Protocolo de recuperación extendida",
    null // Para que algunos no tengan notas
];

// Funciones de utilidad
function getRandomElement(array) {
    return array[Math.floor(Math.random() * array.length)];
}

function getRandomElements(array, count) {
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomDate(start, end) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function generateMedicos(count) {
    const medicos = [];
    const medicosUsados = new Set();
    
    for (let i = 0; i < count; i++) {
        let medicoId;
        // Evitar médicos duplicados en la misma agenda
        do {
            medicoId = getRandomInt(CONFIG.MEDICO_ID_MIN, CONFIG.MEDICO_ID_MAX);
        } while (medicosUsados.has(medicoId));
        
        medicosUsados.add(medicoId);
        
        const esPrincipal = i === 0; // El primer médico siempre es principal
        const baseDate = new Date();
        const horaInicio = new Date(baseDate);
        horaInicio.setHours(getRandomInt(7, 18), getRandomInt(0, 59), 0, 0);
        
        const horaFin = new Date(horaInicio);
        horaFin.setMinutes(horaFin.getMinutes() + getRandomInt(30, 480)); // 30min a 8 horas
        
        medicos.push({
            medico_id: medicoId,
            es_principal: esPrincipal,
            rol: getRandomElement(ROLES_MEDICOS),
            hora_inicio: horaInicio,
            hora_fin: horaFin,
            observaciones: getRandomElement(OBSERVACIONES_MEDICOS)
        });
    }
    
    return medicos;
}

function generateHistorialCambios() {
    const cambios = [];
    const numCambios = getRandomInt(0, 3); // 0 a 3 cambios históricos
    
    for (let i = 0; i < numCambios; i++) {
        const fechaAtras = new Date();
        fechaAtras.setDate(fechaAtras.getDate() - getRandomInt(1, 30));
        
        cambios.push({
            timestamp: fechaAtras,
            usuario: `usuario${getRandomInt(1, 10)}`,
            accion: getRandomElement(['agregar_medico', 'remover_medico', 'cambiar_equipamiento', 'actualizar_notas']),
            detalle: `Cambio realizado el ${fechaAtras.toLocaleDateString()}`
        });
    }
    
    return cambios;
}

function generateAgendaExtendida(agendaId) {
    const numMedicos = getRandomInt(CONFIG.MIN_MEDICOS_POR_AGENDA, CONFIG.MAX_MEDICOS_POR_AGENDA);
    const equipamientoCount = getRandomInt(2, 6);
    
    const agendaExtendida = {
        agenda_id: agendaId,
        medicos: generateMedicos(numMedicos),
        tipo_procedimiento: getRandomElement(TIPOS_PROCEDIMIENTO),
        equipamiento_requerido: getRandomElements(EQUIPAMIENTO_MEDICO, equipamientoCount),
        preparacion_especial: Math.random() > 0.6 ? `Preparación específica para ${getRandomElement(TIPOS_PROCEDIMIENTO)}` : null,
        notas_adicionales: getRandomElement(NOTAS_ADICIONALES),
        historial_cambios: generateHistorialCambios(),
        created_at: getRandomDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date()),
        updated_at: new Date(),
        updated_by: `usuario${getRandomInt(1, 15)}`
    };
    
    return agendaExtendida;
}

// Generar todas las agendas extendidas
function generateAllAgendasExtendidas() {
    const agendas = [];
    
    for (let agendaId = CONFIG.AGENDA_ID_MIN; agendaId <= CONFIG.AGENDA_ID_MAX; agendaId++) {
        // Solo crear extensiones para un porcentaje de las agendas
        if (Math.random() <= CONFIG.PORCENTAJE_AGENDAS_CON_EXTENSION) {
            agendas.push(generateAgendaExtendida(agendaId));
        }
    }
    
    return agendas;
}

// Función principal
function main() {
    console.log('🚀 Generando datos para AgendaExtendida...');
    console.log(`📊 Configuración:`);
    console.log(`   - Rango de agendas: ${CONFIG.AGENDA_ID_MIN} - ${CONFIG.AGENDA_ID_MAX}`);
    console.log(`   - Rango de médicos: ${CONFIG.MEDICO_ID_MIN} - ${CONFIG.MEDICO_ID_MAX}`);
    console.log(`   - Porcentaje con extensión: ${CONFIG.PORCENTAJE_AGENDAS_CON_EXTENSION * 100}%`);
    
    const agendas = generateAllAgendasExtendidas();
    
    console.log(`\n✅ Generadas ${agendas.length} agendas extendidas`);
    console.log(`\n📝 Comando MongoDB para insertar:`);
    console.log(`\ndb.agendas_extendidas.insertMany(`);
    console.log(JSON.stringify(agendas, null, 2));
    console.log(`);`);
    
    // También guardar en archivo
    const fs = require('fs');
    fs.writeFileSync('agendas_extendidas_data.json', JSON.stringify(agendas, null, 2));
    console.log(`\n💾 Datos guardados en: agendas_extendidas_data.json`);
    
    // Estadísticas
    const statsRoles = {};
    const statsTipos = {};
    
    agendas.forEach(agenda => {
        agenda.medicos.forEach(medico => {
            statsRoles[medico.rol] = (statsRoles[medico.rol] || 0) + 1;
        });
        statsTipos[agenda.tipo_procedimiento] = (statsTipos[agenda.tipo_procedimiento] || 0) + 1;
    });
    
    console.log(`\n📈 Estadísticas generadas:`);
    console.log(`   - Roles más comunes:`, Object.keys(statsRoles).slice(0, 3));
    console.log(`   - Tipos de procedimiento:`, Object.keys(statsTipos).slice(0, 3));
    console.log(`   - Total de médicos asignados:`, agendas.reduce((sum, a) => sum + a.medicos.length, 0));
}

// Ejecutar si se llama directamente
if (require.main === module) {
    main();
}

module.exports = { generateAllAgendasExtendidas, CONFIG };
