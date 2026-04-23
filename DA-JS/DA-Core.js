// DA-JS/DA-Core.js - La lógica de mando completa con WhatsApp Auto-Lanzador

const DA_Core = {
    init() {
        console.log("⚔️ DOMINUS ADMIN: Core activado.");
        this.escucharSolicitudes();
        this.escucharActivos(); 
        this.escucharEstadoGlobal(); // 🔥 Nueva: Sincroniza switches de mantenimiento
        this.escucharEstadisticas(); // 🔥 Nueva: Pulso de ventas y logs
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

        // 1. Guardar en Firebase (Historial)
        DA_Cloud.db.ref('logs_auditoria').push(logData);

        // 2. Mostrar en el visor del HTML (Inmediato)
        const visor = document.getElementById('da-audit-log');
        if (visor) {
            const color = tipo === "fraude" ? "#ff4444" : (tipo === "exito" ? "#ffd700" : "#0f0");
            const entrada = `<div style="color: ${color}; border-bottom: 1px solid #222; padding: 2px 0;">
                                [${logData.fecha}] ${accion}
                             </div>`;
            visor.innerHTML = entrada + visor.innerHTML;
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
        if (!msg) return;

        try {
            await DA_Cloud.db.ref('config_global/anuncio').set({
                mensaje: msg,
                timestamp: Date.now()
            });
            this.registrarLog(`Anuncio enviado: ${msg}`, "exito");
            input.value = ""; // Limpiar
            alert("📢 Mensaje enviado a toda la red.");
        } catch (e) {
            console.error("Error al enviar broadcast:", e);
        }
    },

    // --- SECCIÓN DE PENDIENTES ---
    escucharSolicitudes() {
        console.log("📡 Escaneando solicitudes...");
        DA_Cloud.db.ref('solicitudes_pendientes').on('value', (snapshot) => {
            const solicitudes = snapshot.val();
            this.renderizarSolicitudes(solicitudes);
        });
    },

    renderizarSolicitudes(solicitudes) {
        const contenedor = document.getElementById('da-list-pending');
        const contador = document.getElementById('da-count-pending');
        if (!contenedor) return;

        if (!solicitudes) {
            contenedor.innerHTML = '<p class="da-empty-msg">Puerta cerrada. No hay solicitudes.</p>';
            contador.innerText = "0";
            return;
        }

        let html = '';
        let num = 0;
        for (let uid in solicitudes) {
            num++;
            const s = solicitudes[uid];
            
            // Link de ayuda manual para WS
            const linkWS = s.telefono ? `https://wa.me/${s.telefono.replace(/\D/g, '')}` : "#";

            html += `
                <div class="da-card-pending">
                    <div class="da-info">
                        <p><strong>👤 Dueño:</strong> ${s.nombre}</p>
                        <p><strong>🏠 Negocio:</strong> ${s.negocio}</p>
                        <p><strong>📧 Correo:</strong> ${s.email || 'No provisto'}</p>
                        <p><strong>📱 Tel:</strong> ${s.telefono || 'N/A'}</p>
                    </div>
                    <div class="da-actions">
                        <a href="${linkWS}" target="_blank" class="da-btn-ws">HABLAR POR WS</a>
                        <button class="da-btn-approve" onclick="DA_Core.aprobar('${uid}')">CONCEDER ACCESO</button>
                    </div>
                </div>
            `;
        }
        contenedor.innerHTML = html;
        contador.innerText = num;
    },

    // --- SECCIÓN DE ACTIVOS ---
    escucharActivos() {
        console.log("📡 Monitoreando red de usuarios activos...");
        DA_Cloud.db.ref('usuarios').on('value', (snapshot) => {
            const usuarios = snapshot.val();
            this.renderizarActivos(usuarios);
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
        const perfil = usuarios[uid].perfil;
        const seguridad = usuarios[uid].seguridad;
        
        if (perfil && perfil.estado === 'aprobado') {
            // 🕒 CÁLCULO DE VENCIMIENTO
            const fechaCorte = new Date(perfil.fechaCorte);
            const diasRestantes = Math.ceil((fechaCorte - ahora) / (1000 * 60 * 60 * 24));
            
            // 🟢 CÁLCULO DE PRESENCIA (Punto de luz)
            const ultimaVez = perfil.ultimaConexion ? new Date(perfil.ultimaConexion) : null;
            const minutosDif = ultimaVez ? Math.floor((ahora - ultimaVez) / (1000 * 60)) : 9999;
            
            let statusColor = "#555"; // Desconectado (Gris)
            if (minutosDif < 5) statusColor = "#00ff00"; // Online (Verde brillante)
            else if (minutosDif < 60) statusColor = "#ffff00"; // Reciente (Amarillo)

            // 🚩 DETECTOR DE ALERTAS
            let alertaFraude = "";
            if (seguridad?.alertaHora) alertaFraude += `<b style="color: #ff3333; display:block;">⚠️ RELOJ MANIPULADO</b>`;
            if (seguridad?.multicuenta) alertaFraude += `<b style="color: #ff8800; display:block;">⚠️ MULTI-DISPOSITIVO</b>`;

            html += `
                <div class="da-card-active" style="${alertaFraude ? 'border-left: 5px solid red;' : ''}">
                    <div class="da-info">
                        <p>
                            <span style="color: ${statusColor}; font-size: 1.2em;" title="Última vez: ${ultimaVez ? ultimaVez.toLocaleTimeString() : 'Nunca'}">●</span> 
                            <strong>${perfil.nombre}</strong> <small>(${perfil.negocio})</small>
                        </p>
                        <p>📅 Vence: ${fechaCorte.toLocaleDateString()} <b style="color: ${diasRestantes < 3 ? '#f44' : '#0f0'}">(${diasRestantes}d)</b></p>
                        ${alertaFraude}
                    </div>
                    
                    <div class="da-admin-actions">
                        <div class="da-btn-group">
                            <button onclick="DA_Core.modificarLicencia('${uid}', 7)">+7D</button>
                            <button onclick="DA_Core.modificarLicencia('${uid}', 30)">+30D</button>
                            <button onclick="DA_Core.modificarLicencia('${uid}', 365)">+1A</button>
                        </div>
                        
                        <div class="da-btn-group">
                            <button onclick="DA_Core.enviarMensajePrivado('${uid}')" title="Enviar aviso a pantalla">✉️ MSJ</button>
                            <button class="btn-warn" onclick="DA_Core.cambiarEstadoAcceso('${uid}', 'bloqueado_temp')">PAUSAR</button>
                            <button class="btn-danger" onclick="DA_Core.cambiarEstadoAcceso('${uid}', 'baneado')">BANEAR</button>
                            <button onclick="DA_Core.perdonarFraude('${uid}')">✔️ OK</button>
                        </div>
                    </div>
                </div>
            `;
        }
    }
    contenedor.innerHTML = html || '<p>Aún no hay usuarios en la red.</p>';
},

async modificarLicencia(uid, dias) {
        try {
            const ref = DA_Cloud.db.ref(`usuarios/${uid}/perfil`);
            const snapshot = await ref.once('value');
            const perfil = snapshot.val();

            let fechaBase = new Date();
            // Si la licencia aún no vence, sumamos desde la fecha de corte actual
            if (perfil.fechaCorte && new Date(perfil.fechaCorte) > fechaBase) {
                fechaBase = new Date(perfil.fechaCorte);
            }

            fechaBase.setDate(fechaBase.getDate() + dias);
            await ref.update({ 
                fechaCorte: fechaBase.toISOString(),
                estado: 'aprobado' // Por si estaba bloqueado, esto lo reactiva
            });

            alert(`✅ Se han añadido ${dias} días a ${perfil.nombre}`);
        } catch (e) {
            console.error("Error al modificar licencia:", e);
        }
    },

    // --- BLOQUEOS ---
    async cambiarEstadoAcceso(uid, nuevoEstado) {
        // estados: 'aprobado', 'bloqueado_temp', 'baneado'
        try {
            await DA_Cloud.db.ref(`usuarios/${uid}/perfil/estado`).set(nuevoEstado);
            alert(`Estado actualizado a: ${nuevoEstado.toUpperCase()}`);
        } catch (e) {
            console.error("Error al cambiar estado:", e);
        }
    },

    // Función para limpiar alertas de fraude tras hablar con el usuario
    async perdonarFraude(uid) {
        await DA_Cloud.db.ref(`usuarios/${uid}/seguridad`).remove();
        alert("Alertas de seguridad limpiadas.");
    },
    // --- ACCIONES MAESTRAS ---
  // --- DENTRO DE DA_Core.js ---

async aprobar(uid) {
    try {
        const snap = await DA_Cloud.db.ref(`solicitudes_pendientes/${uid}`).once('value');
        const datos = snap.val();

        if (!datos) return console.error("No se encontraron datos para el ID:", uid);

        const hoy = new Date();
        const fechaCorte = new Date();
        fechaCorte.setDate(hoy.getDate() + 15);

        // 1. ACTUALIZACIÓN MAESTRA
        await DA_Cloud.db.ref(`usuarios/${uid}/perfil`).update({
            estado: 'aprobado', 
            fechaAprobacion: hoy.toISOString(),
            fechaCorte: fechaCorte.toISOString(),
            idFinal: uid, 
            nombre: datos.nombre,
            negocio: datos.negocio,
            telefono: datos.telefono || "Sin número",
            licenciaActiva: true 
        });

        // 🔥 REGISTRO EN EL LOG DE AUDITORÍA
        this.registrarLog(`Acceso concedido a ${datos.nombre} (${datos.negocio})`, "exito");

        console.log(`🚀 Acceso concedido a ${datos.nombre} (UUID: ${uid})`);

        // 2. DELAY DE SINCRONIZACIÓN
        setTimeout(async () => {
            await DA_Cloud.db.ref(`solicitudes_pendientes/${uid}`).remove();
            console.log(`🧹 Solicitud de ${datos.nombre} limpiada.`);
        }, 1500); 

        // 3. NOTIFICACIÓN AUTOMÁTICA
        if (datos.telefono && datos.telefono !== "Sin número") {
            this.enviarNotificacionWhatsApp(datos.telefono, datos.nombre, datos.negocio);
        }

    } catch (e) {
        console.error("❌ Error en el proceso de aprobación:", e);
        this.registrarLog(`Fallo al aprobar a ${uid}`, "fraude");
    }
},

    enviarNotificacionWhatsApp(tel, nombre, negocio) {
        const numLimpio = tel.replace(/\D/g, ''); // Solo números
        const mensaje = `Hola *${nombre}* 👋, bienvenido a la red *DOMINUS*. %0A%0ATu acceso para el negocio *"${negocio}"* ha sido aprobado con éxito. ✅%0A%0AYA PUEDES ENTRAR A LA APP. %0A%0A_El amor y la educación son la única verdad._`;
        
        const url = `https://wa.me/${numLimpio}?text=${mensaje}`;
        window.open(url, '_blank');
    },

   async gestionar(uid) {
    console.log("Abriendo gestión técnica para: " + uid);
    
    try {
        const snap = await DA_Cloud.db.ref(`usuarios/${uid}`).once('value');
        const user = snap.val();
        
        if (!user) return alert("No se encontraron datos del usuario.");

        const m = user.perfil.metadatos || {};
        const s = user.seguridad || {};

        // Construimos un reporte técnico para el Log de Auditoría
        const reporteTecnico = `
            🔎 INFO TÉCNICA [${user.perfil.nombre}]:
            • Negocio: ${user.perfil.negocio}
            • Dispositivo: ${m.dispositivo || '---'} | OS: ${m.plataforma || '---'}
            • Resolución: ${m.resolucion || '---'}
            • Versión App: ${m.versionApp || '---'}
            • Alertas: ${s.alertaHora ? 'RELOJ 🚩' : 'Limpio'} | ${s.multicuenta ? 'MULTI 🚩' : 'Limpio'}
        `;

        // Lo mandamos al Log para que lo veas en pantalla
        this.registrarLog(reporteTecnico, s.alertaHora || s.multicuenta ? "fraude" : "info");
        
        // Opcional: Un alert rápido con lo más importante
        alert(`Gestionando a ${user.perfil.nombre}. Datos técnicos enviados al Log de Eventos.`);

    } catch (e) {
        console.error("Error al gestionar usuario:", e);
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