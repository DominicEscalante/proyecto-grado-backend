import { db } from "./index.js";
import { roles, tiposEmergencias } from "./schema/index.js";
import { pool } from "../config/db.js";

/**
 * Script de Seed Inicial: Carga los Roles Base y el Catálogo de Tipos de Emergencias
 */
const seed = async () => {
  try {
    console.log("Iniciando carga de datos iniciales...");

    // 1. Roles Base
    console.log("  -> Insertando Roles Base (RBAC)...");
    await db
      .insert(roles)
      .values([
        {
          nombre: "CIUDADANO",
          descripcion:
            "Usuario civil que reporta incidentes y emergencias desde la aplicación móvil PWA.",
        },
        {
          nombre: "OPERADOR_POLICIA",
          descripcion:
            "Operador de monitoreo, despacho y seguimiento policial desde la consola web.",
        },
        {
          nombre: "OPERADOR_BOMBEROS",
          descripcion:
            "Operador de monitoreo, despacho y atención de emergencias de bomberos desde la consola web.",
        },
        {
          nombre: "ADMINISTRADOR",
          descripcion:
            "Administrador general del sistema con acceso completo a usuarios, catálogos y auditoría.",
        },
      ])
      .onConflictDoNothing({ target: roles.nombre });

    // 2. Tipos de Emergencias
    console.log("  -> Insertando Catálogo de Tipos de Emergencias...");
    await db
      .insert(tiposEmergencias)
      .values([
        {
          nombre: "Accidente de Tránsito",
          descripcion:
            "Colisiones, atropellos o incidentes vehiculares en vía pública.",
          activo: true,
        },
        {
          nombre: "Robo / Asalto",
          descripcion:
            "Robo a mano armada, hurto o sustracción de bienes en flagrancia o reciente.",
          activo: true,
        },
        {
          nombre: "Violencia / Riña Callejera",
          descripcion:
            "Agresiones físicas, alteración del orden o situaciones de riesgo en vía pública.",
          activo: true,
        },
        {
          nombre: "Incendio Estructural",
          descripcion:
            "Fuego activo en viviendas, comercios, depósitos o infraestructuras.",
          activo: true,
        },
        {
          nombre: "Incendio Forestal / Quema de Pastizales",
          descripcion:
            "Quemas no controladas o incendios de vegetación en zonas urbanas o periurbanas.",
          activo: true,
        },
        {
          nombre: "Fuga de Gas / Químicos",
          descripcion:
            "Fuga de gas licuado/natural o sustancias peligrosas con riesgo de asfixia o explosión.",
          activo: true,
        },
        {
          nombre: "Rescate / Atrapamiento",
          descripcion:
            "Personas atrapadas en estructuras colapsadas, zanjas, barrancos o elevadores.",
          activo: true,
        },
        {
          nombre: "Derrumbe / Deslizamiento",
          descripcion:
            "Movimientos de tierra, grietas activas en taludes o caída de muros/estructuras.",
          activo: true,
        },
        {
          nombre: "Inundación / Desborde",
          descripcion:
            "Desborde de ríos, canales o acumulación crítica de agua pluvial con afectación a viviendas.",
          activo: true,
        },
      ])
      .onConflictDoNothing({ target: tiposEmergencias.nombre });

    console.log("Seed completado exitosamente.");
  } catch (error) {
    console.error("Error durante la ejecución del seed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

seed();
