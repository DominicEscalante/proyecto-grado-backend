import { db } from "./index.js";
import { roles, tiposEmergencias, usuarios } from "./schema/index.js";
import { pool } from "../config/db.js";
import { auth } from "../config/auth.js";
import { eq, or } from "drizzle-orm";

/**
 * Script de Seed Inicial:
 * 1. Roles Base (RBAC)
 * 2. Catálogo de Tipos de Emergencias
 * 3. 8 Usuarios Oficiales (3 Ciudadanos, 2 Policías, 2 Bomberos, 1 Administrador)
 *    Contraseña común para todos: Pa$$w0rd
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
          institucion: "POLICIA",
          activo: true,
        },
        {
          nombre: "Robo / Asalto",
          descripcion:
            "Robo a mano armada, hurto o sustracción de bienes en flagrancia o reciente.",
          institucion: "POLICIA",
          activo: true,
        },
        {
          nombre: "Violencia / Riña Callejera",
          descripcion:
            "Agresiones físicas, alteración del orden o situaciones de riesgo en vía pública.",
          institucion: "POLICIA",
          activo: true,
        },
        {
          nombre: "Incendio Estructural",
          descripcion:
            "Fuego activo en viviendas, comercios, depósitos o infraestructuras.",
          institucion: "BOMBEROS",
          activo: true,
        },
        {
          nombre: "Incendio Forestal / Quema de Pastizales",
          descripcion:
            "Quemas no controladas o incendios de vegetación en zonas urbanas o periurbanas.",
          institucion: "BOMBEROS",
          activo: true,
        },
        {
          nombre: "Fuga de Gas / Químicos",
          descripcion:
            "Fuga de gas licuado/natural o sustancias peligrosas con riesgo de asfixia o explosión.",
          institucion: "BOMBEROS",
          activo: true,
        },
        {
          nombre: "Rescate / Atrapamiento",
          descripcion:
            "Personas atrapadas en estructuras colapsadas, zanjas, barrancos o elevadores.",
          institucion: "BOMBEROS",
          activo: true,
        },
        {
          nombre: "Derrumbe / Deslizamiento",
          descripcion:
            "Movimientos de tierra, grietas activas en taludes o caída de muros/estructuras.",
          institucion: "BOMBEROS",
          activo: true,
        },
        {
          nombre: "Inundación / Desborde",
          descripcion:
            "Desborde de ríos, canales o acumulación crítica de agua pluvial con afectación a viviendas.",
          institucion: "BOMBEROS",
          activo: true,
        },
      ])
      .onConflictDoNothing({ target: tiposEmergencias.nombre });

    // 3. Usuarios solicitados: 3 Ciudadanos, 2 Policias, 2 Bomberos, 1 Administrador
    console.log("  -> Registrando usuarios de prueba con contraseñas en Better Auth...");

    // Limpiar usuarios de prueba anteriores
    await db.delete(usuarios).where(or(eq(usuarios.email, 'admin@test.com'), eq(usuarios.id, 'usr-dev-admin')));

    const usuariosSeed = [
      // 3 Ciudadanos (@gmail.com)
      {
        email: "usuario1@gmail.com",
        password: "Pa$$w0rd",
        name: "Juan Perez",
        ci: "usuario1",
        nombres: "Juan",
        apellidos: "Perez",
        telefono: "70000001",
        rolId: 1, // CIUDADANO
        institucion: null,
        rango: null,
      },
      {
        email: "usuario2@gmail.com",
        password: "Pa$$w0rd",
        name: "Maria Quispe",
        ci: "usuario2",
        nombres: "Maria",
        apellidos: "Quispe",
        telefono: "70000002",
        rolId: 1, // CIUDADANO
        institucion: null,
        rango: null,
      },
      {
        email: "usuario3@gmail.com",
        password: "Pa$$w0rd",
        name: "Carlos Condori",
        ci: "usuario3",
        nombres: "Carlos",
        apellidos: "Condori",
        telefono: "70000003",
        rolId: 1, // CIUDADANO
        institucion: null,
        rango: null,
      },
      // 2 Policias (@pol.com)
      {
        email: "pol1@pol.com",
        password: "Pa$$w0rd",
        name: "Pedro Mamani",
        ci: "pol1",
        nombres: "Pedro",
        apellidos: "Mamani",
        telefono: "71000001",
        rolId: 2, // OPERADOR_POLICIA
        institucion: "POLICIA",
        rango: "Sargento",
      },
      {
        email: "pol2@pol.com",
        password: "Pa$$w0rd",
        name: "Lucia Flores",
        ci: "pol2",
        nombres: "Lucia",
        apellidos: "Flores",
        telefono: "71000002",
        rolId: 2, // OPERADOR_POLICIA
        institucion: "POLICIA",
        rango: "Subteniente",
      },
      // 2 Bomberos (@bom.com)
      {
        email: "bom1@bom.com",
        password: "Pa$$w0rd",
        name: "Marco Silva",
        ci: "bom1",
        nombres: "Marco",
        apellidos: "Silva",
        telefono: "72000001",
        rolId: 3, // OPERADOR_BOMBEROS
        institucion: "BOMBEROS",
        rango: "Teniente",
      },
      {
        email: "bom2@bom.com",
        password: "Pa$$w0rd",
        name: "Ana Gomez",
        ci: "bom2",
        nombres: "Ana",
        apellidos: "Gomez",
        telefono: "72000002",
        rolId: 3, // OPERADOR_BOMBEROS
        institucion: "BOMBEROS",
        rango: "Sargento",
      },
      // 1 Administrador (@admin.com)
      {
        email: "admin@admin.com",
        password: "Pa$$w0rd",
        name: "Admin Sistema",
        ci: "admin",
        nombres: "Administrador",
        apellidos: "General",
        telefono: "73000001",
        rolId: 4, // ADMINISTRADOR
        institucion: null,
        rango: null,
      },
    ];

    for (const u of usuariosSeed) {
      const existing = await db
        .select()
        .from(usuarios)
        .where(or(eq(usuarios.email, u.email), eq(usuarios.ci, u.ci)))
        .limit(1);

      if (existing.length === 0) {
        // Crear usuario y credenciales a traves del API de Better Auth
        const authResult = await auth.api.signUpEmail({
          body: {
            email: u.email,
            password: u.password,
            name: u.name,
            ci: u.ci,
            nombres: u.nombres,
            apellidos: u.apellidos,
            telefono: u.telefono,
            institucion: u.institucion,
            rango: u.rango,
            rol_id: u.rolId,
            identidad_verificada: true,
            estado_cuenta: true,
          } as any,
        });

        if (authResult?.user?.id) {
          await db
            .update(usuarios)
            .set({
              rolId: u.rolId,
              identidadVerificada: true,
              estadoCuenta: true,
              institucion: u.institucion,
              rango: u.rango,
              ci: u.ci,
            })
            .where(eq(usuarios.id, authResult.user.id));

          console.log(`     Usuario creado: ${u.ci} (${u.email}) - Rol: ${u.rolId}`);
        }
      } else {
        // Asegurar que los datos de rol, email y estado esten sincronizados
        await db
          .update(usuarios)
          .set({
            email: u.email,
            name: u.name,
            rolId: u.rolId,
            identidadVerificada: true,
            estadoCuenta: true,
            institucion: u.institucion,
            rango: u.rango,
            ci: u.ci,
          })
          .where(eq(usuarios.id, existing[0].id));

        console.log(`     Usuario existente actualizado: ${u.ci} (${u.email}) - Rol: ${u.rolId}`);
      }
    }

    console.log("Seed completado exitosamente con 8 usuarios habilitados.");
  } catch (error) {
    console.error("Error durante la ejecución del seed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

seed();
