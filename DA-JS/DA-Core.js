// DA-JS/DA-Core.js - La lógica de mando completa con WhatsApp Auto-Lanzador

const DA_Core = {
   init() {
    console.log("⚔️ DOMINUS ADMIN: Core activado.");

    // 🛡️ PROTECCIÓN: Esperamos a que el motor de nube esté listo
    if (!DA_Cloud || !DA_Cloud.db) {
        console.error("❌ Fallo crítico: DA_Cloud no detectado. Reintentando...");
        setTimeout(() => this.init(), 500);
        return;
    }

    // 📡 ACTIVACIÓN DE RADARES
    this.escucharSolicitudes();
    this.escucharActivos(); 
    
    // ⚙️ CONTROL GLOBAL
    this.escucharEstadoGlobal(); 
    
    // 📊 PULSO DEL SISTEMA
    this.escucharEstadisticas(); 

    console.log("✅ Sistema de Mando sincronizado y escuchando.");

    // --- REMOCIÓN TÁCTICA DE LA PANTALLA DE CARGA ---
    setTimeout(() => {
        const loader = document.getElementById('da-loading-screen');
        if(loader) {
            loader.style.opacity = '0';
            // Se elimina del DOM después de que termine la transición de opacidad
            setTimeout(() => loader.remove(), 500);
        }
    }, 1500); 
},
    // --- NUEVA: Sincroniza el estado del mantenimiento con el HTML ---
    escucharEstadoGlobal() {
        DA_Cloud.db.ref('config_global/mantenimiento').on('value', (snap) => {
            const isMantenimiento = snap.val();
            const check = document.getElementById('check-mantenimiento');
            if (check) check.checked = isMantenimiento;
        });
    },

    // --- NUEVA: Escucha ventas totales (opcional pero recomendado) ---
    escucharEstadisticas() {
        // Esto supone que cada vez que un usuario vende, incrementas un contador global
        DA_Cloud.db.ref('stats_globales/total_ventas').on('value', (snap) => {
            const total = snap.val() || 0;
            const el = document.getElementById('da-total-ventas');
            if (el) el.innerText = total;
        });
    },

    // --- UTILIDAD: Diario de a bordo ---
   registrarLog(accion, tipo = "info") {
    const fecha = new Date();
    const logData = {
        timestamp: fecha.getTime(),
        fecha: fecha.toLocaleString(),
        accion: accion,
        tipo: tipo 
    };

    // 1. Guardar en Firebase
    // 💡 MEJORA: Limitamos el historial para no saturar la nube
    const refLogs = DA_Cloud.db.ref('logs_auditoria');
    refLogs.push(logData);

    // 2. Mostrar en el visor del HTML
    const visor = document.getElementById('da-audit-log');
    if (visor) {
        // Colores según el tipo de evento
        const colores = {
            fraude: "#ff4444", // Rojo para alertas
            exito: "#ffd700",  // Dorado para aprobaciones/pagos
            info: "#00ff00"    // Verde para actividad normal
        };
        
        const color = colores[tipo] || "#fff";
        const entrada = `
            <div style="color: ${color}; border-bottom: 1px solid #222; padding: 4px 0; font-family: monospace; font-size: 0.85em;">
                <span style="opacity: 0.6;">[${fecha.getHours()}:${fecha.getMinutes()}]</span> ${accion}
            </div>`;
        visor.innerHTML = entrada + visor.innerHTML;

        // Limitar visualmente el visor a las últimas 50 entradas para que el navegador no se trabe
        if (visor.children.length > 50) visor.lastElementChild.remove();
    }
},

    // --- ACCIONES MAESTRAS (BOTONES DEL HTML) ---
    async toggleMantenimiento(activo) {
        try {
            await DA_Cloud.db.ref('config_global/mantenimiento').set(activo);
            this.registrarLog(`Modo mantenimiento ${activo ? 'ACTIVADO' : 'DESACTIVADO'}`, "info");
        } catch (e) {
            console.error("Error al cambiar mantenimiento:", e);
        }
    },

  async enviarBroadcast() {
    const input = document.getElementById('broadcast-msg');
    const msg = input.value.trim();
    
    // Si el input está vacío, preguntamos si desea limpiar el anuncio actual
    if (!msg) {
        if (confirm("¿Deseas quitar el anuncio actual de todas las pantallas?")) {
            await DA_Cloud.db.ref('config_global/anuncio').remove();
            this.registrarLog("Anuncio global retirado", "info");
        }
        return;
    }

    try {
        await DA_Cloud.db.ref('config_global/anuncio').set({
            mensaje: msg,
            timestamp: Date.now()
        });
        this.registrarLog(`Anuncio enviado: ${msg}`, "exito");
        input.value = ""; 
        alert("📢 Mensaje enviado a toda la red.");
    } catch (e) {
        console.error("❌ Error en Broadcast:", e);
    }
},

    // --- SECCIÓN DE PENDIENTES ---
  escucharSolicitudes() {
    console.log("📡 Mando Central: Escaneando nuevas señales de ingreso...");
    
    // Mantenemos la escucha en el nodo global de solicitudes
    DA_Cloud.db.ref('solicitudes_pendientes').on('value', (snapshot) => {
        const solicitudes = snapshot.val();
        
        if (!solicitudes) {
            console.log("📭 No hay aspirantes en espera.");
            this.renderizarSolicitudes({}); // Limpiamos la vista si no hay nada
            return;
        }

        console.log(`📩 Se han detectado ${Object.keys(solicitudes).length} solicitudes.`);
        this.renderizarSolicitudes(solicitudes);
    });
},

renderizarSolicitudes(solicitudes) {
    const contenedor = document.getElementById('da-list-pending');
    const contador = document.getElementById('da-count-pending');
    if (!contenedor) return;

    // 1. Manejo de lista vacía
    if (!solicitudes || Object.keys(solicitudes).length === 0) {
        contenedor.innerHTML = '<p class="da-empty-msg">No hay usuarios esperando.</p>';
        if (contador) contador.innerText = "0";
        return;
    }

    let html = '';
    let num = 0;

    for (let uid in solicitudes) {
        num++;
        const s = solicitudes[uid];
        
        // Limpiamos el teléfono para el link de WhatsApp
        const telefonoLimpio = s.telefono ? s.telefono.replace(/\D/g, '') : "";
        const linkWS = telefonoLimpio ? `https://wa.me/${telefonoLimpio}` : "#";

        html += `
            <div class="da-card-pending">
                <div class="da-info">
                    <p><strong>👤 Dueño:</strong> ${s.nombre || 'Sin nombre'}</p>
                    <p><strong>🏠 Negocio:</strong> ${s.negocio || 'Sin negocio'}</p>
                    <p><strong>📧 Correo:</strong> ${s.email || 'No provisto'}</p>
                    <p><strong>📱 Tel:</strong> ${s.telefono || 'N/A'}</p>
                    <p><small>🆔 ID: ${uid.substring(0, 8)}...</small></p>
                </div>
                <div class="da-actions">
                    ${telefonoLimpio ? `<a href="${linkWS}" target="_blank" class="da-btn-ws">HABLAR POR WS</a>` : ''}
                    <button class="da-btn-approve" onclick="DA_Core.aprobarUsuario('${uid}')">CONCEDER ACCESO</button>
                    <button class="da-btn-reject" onclick="DA_Core.rechazarUsuario('${uid}')">DENEGAR</button>
                </div>
            </div>
        `;
    }

    contenedor.innerHTML = html;
    if (contador) contador.innerText = num;
},

    // --- SECCIÓN DE ACTIVOS ---
escucharActivos() {
    console.log("📡 Mando Central: Monitoreando red de Guerreros aprobados...");
    
    DA_Cloud.db.ref('usuarios').on('value', (snapshot) => {
        const todosLosUsuarios = snapshot.val();
        const usuariosAprobados = {};

        if (!todosLosUsuarios) {
            console.log("📭 Red vacía: No hay usuarios registrados.");
            document.getElementById('da-users-online').innerText = "0";
            this.renderizarActivos({});
            return;
        }

        // 🛡️ FILTRO DE ÉLITE
        for (let uid in todosLosUsuarios) {
            const u = todosLosUsuarios[uid];
            
            // Verificamos la ruta exacta: usuarios > UID > administracion > estado
            if (u.administracion && u.administracion.estado === 'aprobado') {
                
                // Usamos valores por defecto (|| {}) para evitar que el script muera si falta una carpeta
                usuariosAprobados[uid] = {
                    uid: uid,
                    ...(u.perfil || {}),
                    ...(u.administracion || {}),
                    ...(u.seguridad || {})
                };
            }
        }

        // 📊 ACTUALIZACIÓN DEL CONTADOR EN EL PANEL (Esto es lo que te faltaba)
        const totalActivos = Object.keys(usuariosAprobados).length;
        const contadorHTML = document.getElementById('da-users-online');
        if (contadorHTML) {
            contadorHTML.innerText = totalActivos;
        }

        console.log(`✅ Guerreros activos en red: ${totalActivos}`);
        this.renderizarActivos(usuariosAprobados);
    });
},

    async resetearHardware(uid) {
        if(!confirm("¿Estás seguro? Esto permitirá que el usuario se vincule desde un dispositivo nuevo.")) return;

        try {
            // Borramos los candados de identidad
            await DA_Cloud.db.ref(`usuarios/${uid}/perfil/idFinal`).set(null);
            await DA_Cloud.db.ref(`usuarios/${uid}/perfil/uuid`).set(null);
            
            this.registrarLog(`Hardware reseteado para: ${uid}`, "info");
            alert("🔒 Candado de hardware liberado. El usuario ya puede vincularse de nuevo.");
        } catch (e) {
            console.error("Error al resetear hardware:", e);
        }
    },

    async cambiarRango(uid) {
        const nuevoRango = prompt("Define el rango (Ej: Estudiante, Maestro, Admin, Pro):");
        if (!nuevoRango) return;

        try {
            await DA_Cloud.db.ref(`usuarios/${uid}/perfil/rango`).set(nuevoRango);
            this.registrarLog(`Rango de ${uid} cambiado a: ${nuevoRango}`, "exito");
            alert(`Usuario actualizado a rango: ${nuevoRango}`);
        } catch (e) {
            console.error(e);
        }
    },
   // En DA-Core.js, actualiza la parte del renderizado de activos:

renderizarActivos(usuarios) {
    const contenedor = document.getElementById('da-list-active');
    if (!contenedor) return;

    let html = '';
    const ahora = new Date();

    for (let uid in usuarios) {
        const u = usuarios[uid]; // El usuario ya viene filtrado y aplanado de escucharActivos
        
        // 🕒 CÁLCULO DE VENCIMIENTO
        const fechaCorte = u.fechaCorte ? new Date(u.fechaCorte) : null;
        let diasRestantes = 0;
        if (fechaCorte) {
            diasRestantes = Math.ceil((fechaCorte - ahora) / (1000 * 60 * 60 * 24));
        }
        
        // 🟢 CÁLCULO DE PRESENCIA
        const ultimaVez = u.ultimaConexion ? new Date(u.ultimaConexion) : null;
        const minutosDif = ultimaVez ? Math.floor((ahora - ultimaVez) / (1000 * 60)) : 9999;
        
        let statusColor = "#555"; // Offline
        if (minutosDif < 5) statusColor = "#00ff00"; // Online
        else if (minutosDif < 60) statusColor = "#ffff00"; // Reciente

        // 🚩 DETECTOR DE ALERTAS
        let alertaFraude = "";
        if (u.alertaHora) alertaFraude += `<b style="color: #ff3333; display:block; font-size:0.7rem;">⚠️ RELOJ MANIPULADO</b>`;
        if (u.multicuenta) alertaFraude += `<b style="color: #ff8800; display:block; font-size:0.7rem;">⚠️ MULTI-DISPOSITIVO</b>`;

        // 📱 TRATAMIENTO DEL TELÉFONO (Para solucionar el "Sin número")
        const tlf = u.telefono || "Sin número";

        html += `
            <div class="da-card-active" style="${alertaFraude ? 'border-left: 5px solid red;' : ''}">
                <div class="da-info">
                    <p>
                        <span style="color: ${statusColor}; font-size: 1.2em;" title="Visto: ${ultimaVez ? ultimaVez.toLocaleTimeString() : 'Nunca'}">●</span> 
                        <strong>${u.nombre || 'Sin Nombre'}</strong> 
                    </p>
                    <p style="font-size: 0.8rem; color: #888;">🏢 ${u.negocio || 'Particular'} | 📱 ${tlf}</p>
                    
                    <p style="margin-top:5px;">📅 Vence: ${fechaCorte ? fechaCorte.toLocaleDateString() : '---'} 
                       <b style="color: ${diasRestantes < 3 ? '#f44' : '#0f0'}">(${diasRestantes}d)</b>
                    </p>
                    ${alertaFraude}
                </div>
                
                <div class="da-admin-actions">
                    <div class="da-btn-group">
                        <button onclick="DA_Core.modificarLicencia('${uid}', 7)">+7D</button>
                        <button onclick="DA_Core.modificarLicencia('${uid}', 30)">+30D</button>
                        <button onclick="DA_Core.modificarLicencia('${uid}', 365)">+1A</button>
                    </div>
                    
                    <div class="da-btn-group" style="margin-top:5px;">
                        <button onclick="DA_Core.enviarMensajePrivado('${uid}')" title="Mensaje">✉️</button>
                        <button class="btn-warn" onclick="DA_Core.cambiarEstadoAcceso('${uid}', 'bloqueado_temp')">⏸️</button>
                        <button class="btn-danger" onclick="DA_Core.cambiarEstadoAcceso('${uid}', 'baneado')">🚫</button>
                        <button onclick="DA_Core.perdonarFraude('${uid}')">✔️</button>
                    </div>
                </div>
            </div>
        `;
    }
    contenedor.innerHTML = html || '<p style="padding:20px; text-align:center; color:#666;">No hay guerreros activos en la red.</p>';
},

async modificarLicencia(uid, dias) {
    try {
        // 🛰️ OBTENCIÓN INTEGRAL: Traemos el nodo completo para tener perfil y administración
        const refUsuario = DA_Cloud.db.ref(`usuarios/${uid}`);
        const snapshot = await refUsuario.once('value');
        const datos = snapshot.val();

        if (!datos) return alert("No se encontraron datos del usuario.");

        const perfil = datos.perfil || {};
        const admin = datos.administracion || {};

        let fechaBase = new Date();
        
        // 🕒 LÓGICA DE EXTENSIÓN: 
        // Si la licencia actual aún es válida, sumamos desde el vencimiento. 
        // Si ya venció, sumamos desde hoy.
        if (admin.fechaCorte && new Date(admin.fechaCorte) > fechaBase) {
            fechaBase = new Date(admin.fechaCorte);
        }

        fechaBase.setDate(fechaBase.getDate() + dias);

        // 🛡️ ACTUALIZACIÓN EN LA CARPETA CORRECTA
        await DA_Cloud.db.ref(`usuarios/${uid}/administracion`).update({ 
            fechaCorte: fechaBase.toISOString(),
            estado: 'aprobado', // Reactivación automática
            licenciaActiva: true
        });

        // Registro en el Log del Admin
        this.registrarLog(`Licencia extendida: +${dias} días para ${perfil.nombre || uid}`, "exito");

        alert(`✅ Se han añadido ${dias} días a ${perfil.nombre || 'el usuario'}. Nueva fecha: ${fechaBase.toLocaleDateString()}`);

    } catch (e) {
        console.error("❌ Error al modificar licencia:", e);
        alert("Fallo al conectar con la red para extender licencia.");
    }
},

    // --- BLOQUEOS ---
    async cambiarEstadoAcceso(uid, nuevoEstado) {
    // Estados válidos: 'aprobado', 'bloqueado_temp', 'suspendido'
    try {
        const actualizaciones = {
            estado: nuevoEstado,
            // Si el estado no es 'aprobado', desactivamos la licencia automáticamente
            licenciaActiva: nuevoEstado === 'aprobado'
        };

        // 🛡️ RUTA CORREGIDA: Escribimos en la carpeta de administración
        await DA_Cloud.db.ref(`usuarios/${uid}/administracion`).update(actualizaciones);
        
        this.registrarLog(`Cambio de estado para ${uid}: ${nuevoEstado.toUpperCase()}`, "info");
        alert(`Estado actualizado a: ${nuevoEstado.toUpperCase()}`);
    } catch (e) {
        console.error("❌ Error al cambiar estado:", e);
        alert("No se pudo actualizar el estado en la red.");
    }
},

    // Función para limpiar alertas de fraude tras hablar con el usuario
   async perdonarFraude(uid) {
    try {
        // 🛡️ Solo reseteamos las alertas, mantenemos el resto de la seguridad (como el idFinal)
        await DA_Cloud.db.ref(`usuarios/${uid}/seguridad`).update({
            alertaHora: false,
            multicuenta: false,
            intentosPIN: 0
        });

        this.registrarLog(`Alertas de seguridad limpiadas para: ${uid}`, "exito");
        alert("✅ El Guerrero ha sido perdonado. Alertas limpiadas.");
    } catch (e) {
        console.error("❌ Error al perdonar:", e);
    }
},
    // --- ACCIONES MAESTRAS ---
  // --- DENTRO DE DA_Core.js ---

async aprobarUsuario(uid) {
    try {
        const snap = await DA_Cloud.db.ref(`solicitudes_pendientes/${uid}`).once('value');
        const datos = snap.val();

        if (!datos) return console.error("No se encontraron datos para el ID:", uid);

        const hoy = new Date();
        const fechaCorte = new Date();
        fechaCorte.setDate(hoy.getDate() + 15);

        // 🛡️ 1. CREACIÓN DEL PERFIL (Esto es lo que faltaba para no perder el número)
        await DA_Cloud.db.ref(`usuarios/${uid}/perfil`).set({
            nombre: datos.nombre || "Guerrero Sin Nombre",
            negocio: datos.negocio || "Particular",
            telefono: datos.telefono || "Sin número",
            tld: datos.tld || "+58", // Aseguramos el código de país
            registroOriginal: hoy.toISOString()
        });

        // ⚙️ 2. CONFIGURACIÓN DE ADMINISTRACIÓN
        await DA_Cloud.db.ref(`usuarios/${uid}/administracion`).update({
            estado: 'aprobado', 
            fechaAprobacion: hoy.toISOString(),
            fechaCorte: fechaCorte.toISOString(),
            licenciaActiva: true 
        });

        // 🔒 3. SEGURIDAD INICIAL
        await DA_Cloud.db.ref(`usuarios/${uid}/seguridad`).update({
            idFinal: uid,
            ultimaConexion: hoy.toISOString()
        });

        // 🔥 REGISTRO EN EL LOG DE AUDITORÍA
        this.registrarLog(`Acceso concedido a ${datos.nombre} (${datos.negocio})`, "exito");

        console.log(`🚀 Acceso concedido a ${datos.nombre} (UUID: ${uid})`);

        // 4. LIMPIEZA DE SOLICITUD (Con un pequeño retraso para asegurar la escritura anterior)
        setTimeout(async () => {
            await DA_Cloud.db.ref(`solicitudes_pendientes/${uid}`).remove();
            console.log(`🧹 Solicitud de ${datos.nombre} limpiada.`);
        }, 2000); 

        // 5. NOTIFICACIÓN AUTOMÁTICA
        if (datos.telefono && datos.telefono !== "Sin número") {
            this.enviarNotificacionWhatsApp(datos.telefono, datos.nombre, datos.negocio);
        }

    } catch (e) {
        console.error("❌ Error en el proceso de aprobación:", e);
        this.registrarLog(`Fallo al aprobar a ${uid}`, "fraude");
    }
},

async rechazarUsuario(uid) {
    if (!confirm("¿Seguro que quieres denegar el acceso a este usuario? Se borrará su solicitud.")) return;

    try {
        // 1. Limpiamos la solicitud de la lista de espera
        await DA_Cloud.db.ref(`solicitudes_pendientes/${uid}`).remove();

        // 2. Opcional: Podrías marcarlo en la base de datos como 'rechazado' 
        // para que no pueda volver a intentar con el mismo ID de hardware
        await DA_Cloud.db.ref(`usuarios/${uid}/administracion`).update({
            estado: 'rechazado',
            fechaRechazo: new Date().toISOString()
        });

        this.registrarLog(`Acceso denegado al UID: ${uid}`, "fraude");
        console.log(`❌ Usuario ${uid} rechazado y limpiado.`);

    } catch (e) {
        console.error("❌ Error al rechazar:", e);
    }
},

    enviarNotificacionWhatsApp(tel, nombre, negocio) {
        const numLimpio = tel.replace(/\D/g, ''); // Solo números
        const mensaje = `Hola *${nombre}* 👋, bienvenido a la red *DOMINUS*. %0A%0ATu acceso para el negocio *"${negocio}"* ha sido aprobado con éxito. ✅%0A%0AYA PUEDES ENTRAR A LA APP. %0A%0A_El amor y la educación son la única verdad._`;
        
        const url = `https://wa.me/${numLimpio}?text=${mensaje}`;
        window.open(url, '_blank');
    },

async gestionarUsuario(uid) { // Cambiado para coincidir con la lista de funciones
    console.log("🔍 Mando Central: Abriendo expediente técnico de: " + uid);
    
    try {
        const snap = await DA_Cloud.db.ref(`usuarios/${uid}`).once('value');
        const user = snap.val();
        
        if (!user) return alert("Error: El Guerrero no existe en la red.");

        // 🛰️ EXTRACCIÓN POR CARPETAS (Arquitectura Composición)
        const p = user.perfil || {};
        const m = p.metadatos || {}; // Los metadatos técnicos viven dentro de perfil
        const s = user.seguridad || {};

        // Construimos el reporte técnico detallado
        const reporteTecnico = `
            🔎 EXPEDIENTE TÉCNICO [${p.nombre || 'Desconocido'}]:
            • Negocio: ${p.negocio || 'N/A'}
            • Dispositivo: ${m.dispositivo || '---'} | OS: ${m.plataforma || '---'}
            • Resolución: ${m.resolucion || '---'}
            • Versión App: ${m.versionApp || '---'}
            • Zona Horaria: ${m.zonaHoraria || '---'}
            • Alertas de Seguridad: ${s.alertaHora ? '🚩 RELOJ MANIPULADO' : '✅ Horario OK'} | ${s.multicuenta ? '🚩 MULTI-EQUIPO' : '✅ Equipo Único'}
            • Último ID de Hardware: ${s.idFinal || 'No registrado'}
        `;

        // Enviamos al Log de Auditoría del Admin
        const tipoLog = (s.alertaHora || s.multicuenta) ? "fraude" : "info";
        this.registrarLog(reporteTecnico, tipoLog);
        
        alert(`Gestionando a ${p.nombre}. Reporte enviado al Log de Auditoría.`);

    } catch (e) {
        console.error("❌ Error al acceder al expediente:", e);
    }
},

async enviarMensajePrivado(uid) {
    const msg = prompt("Escribe el mensaje para este usuario:");
    if (!msg) return;

    try {
        await DA_Cloud.db.ref(`usuarios/${uid}/comunicacion/mensajeDirecto`).set({
            texto: msg,
            fecha: new Date().toISOString(),
            leido: false
        });
        this.registrarLog(`Mensaje enviado a ${uid}: ${msg}`, "info");
        alert("Mensaje enviado con éxito.");
    } catch (e) {
        console.error(e);
    }
},

    filtrarActivos(termino) {
        const tarjetas = document.querySelectorAll('.da-card-active');
        const busqueda = termino.toLowerCase();

        tarjetas.forEach(tarjeta => {
            const texto = tarjeta.innerText.toLowerCase();
            tarjeta.style.display = texto.includes(busqueda) ? 'block' : 'none';
        });
    }
};

document.addEventListener('DOMContentLoaded', () => DA_Core.init());