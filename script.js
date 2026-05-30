
var timer;

class EVASystem {

  constructor() {
    // Recuperamos el token si ya existía de una sesión anterior
    // this.googleToken = localStorage.getItem('eva_google_token') || null;
    this.initialized = false;
    this.wakeLock = null;
    this.tiempoRestanteAlPausar = 0;
    //  this.ausenciaDetectada = false;
    this.timerReactivacion = null;
    this.segundosParaReactivar = 25; // Ajusta aquí el tiempo que quieras de margen
    this.timerReactivacion = null;
    this.entrenamientoActivo = false; // Importante inicializar esto
    this.db = JSON.parse(localStorage.getItem('eva_db')) || [];
    this.lastWeight = localStorage.getItem('eva_ultimo_peso') ? parseFloat(localStorage.getItem('eva_ultimo_peso')) : 80;
    this.estaEnojada = false;
    this.timerInterval = null;
    this.speech = window.speechSynthesis;
    this.misionCumplida = this.verificarSiMisionCompletadaHoy();
    this.streak = localStorage.getItem('eva_streak') ? parseInt(localStorage.getItem('eva_streak')) : 0;
    this.lastTrainingDate = localStorage.getItem('eva_last_date') || null;
    this.estado = "";

    this.ejerciciosFuerza = ["Abdominales", "Sentadillas", "Pesas_Frontal", "Pesas_Lateral"];

    // 1. Definir los objetos de audio/video primero
    this.bgMusic = new Audio();
    this.bgMusic.volume = 0.4;

    this.videoElement = document.getElementById('eva-display');

    // 2. Definir la librería correctamente (Asegúrate de incluir la coma en musica.reposo)
    this.library = {
      vids: {
        reposo: ['eva_reposo.mp4', 'eva_reposo2.mp4', 'eva_reposo3.mp4', 'eva_reposo4.mp4', 'eva_reposo5.mp4', 'eva_reposo6.mp4', 'eva_reposo7.mp4', 'eva_pose.mp4', 'eva_patada.mp4', 'eva_baila.mp4', 'eva_baila_2.mp4'],
        reposo_enojada: ['eva_reposo_enojada.mp4', 'eva_reposo_enojada2.mp4', 'eva_reposo_enojada3.mp4', 'eva_reposo_enojada4.mp4', 'eva_reposo_enojada5.mp4', 'eva_reposo_enojada6.mp4'],
        contenta: ["eva_contenta.mp4", "eva_contenta_2.mp4", "eva_contenta_3.mp4"],
        habla: ['eva_habla.mp4', 'eva_habla2.mp4'],
        Abdominales: ["eva_abdominales.mp4", "eva_abdominales_2.mp4", "eva_abdominales_3.mp4", "eva_abdominales_4.mp4"],
        Sentadillas: ["eva_sentadillas.mp4", "eva_sentadillas_2.mp4", "eva_sentadillas_3.mp4", "eva_sentadillas_4.mp4"],
        Pesas_Frontal: ["eva_pesas.mp4", "eva_pesas_2.mp4", "eva_pesas_3.mp4"],
        Pesas_Lateral: ["eva_fuerza_intensa_1.mp4", "pesas_lateral_.mp4"],
        regandina: ['eva_enfado_1.mp4', 'eva_enfado_2.mp4', 'eva_enfado_3.mp4', 'eva_enfado_4.mp4'],
        cardio_suave: ['eva_biciestatica.mp4'],
        cardio_normal: ['eva_bici2.mp4'],
        cardio_sprint: ['eva_biciestatica_Sprint.mp4'],
        mision_ok: ['eva_mision_cumplida.mp4'],
        level_up: ['eva_level_up.mp4'],
        demonio: ['eva_demonio.mp4'],
        exito: ['exito.mp4', 'exito2.mp4', 'exito3.mp4']
      },
      musica: {
        reposo: ['assets/musica/music.mp3', 'assets/musica/music2.mp3', 'assets/musica/music3.mp3', 'assets/musica/music4.mp3'],
        reposo_enojada: ['assets/musica/enojada.mp3', 'assets/musica/enojada2.mp3', 'assets/musica/enojada3.mp3', 'assets/musica/enojada4.mp3'],
        calentamiento: ['assets/audio/warmup.mp3', 'assets/audio/warmup1.mp3', 'assets/audio/warmup2.mp3', 'assets/audio/warmup3.mp3', 'assets/audio/warmup4.mp3', 'assets/audio/warmup5.mp3'],
        entrenamiento: ['assets/audio/training1.mp3', 'assets/audio/training2.mp3', 'assets/audio/training3.mp3', 'assets/audio/training4.mp3', 'assets/audio/training5.mp3', 'assets/audio/training6.mp3', 'assets/audio/training7.mp3', 'assets/audio/training8.mp3', 'assets/audio/training9.mp3', 'assets/audio/training10.mp3', 'assets/audio/training11.mp3'],
        sprint: ['assets/audio/sprint1.mp3', 'assets/audio/sprint2.mp3', 'assets/audio/sprint3.mp3', 'assets/audio/sprint4.mp3', 'assets/audio/sprint5.mp3', 'assets/audio/sprint6.mp3'],
        exito: ['assets/audio/victory.mp3']
      }
    };



    // 3. Ahora que todo existe, asignar los eventos de repetición
    this.bgMusic.onended = () => {
      const tipo = this.entrenamientoActivo ? 'entrenamiento' : 'reposo';
      const vol = this.entrenamientoActivo ? 0.4 : 0.2;
      this.playMusic(tipo, vol);
    };

    this.videoElement.onended = () => {
      if (this.entrenamientoActivo) {
        // --- AQUÍ ESTÁ LA MAGIA ---
        // Consultamos qué fase de cardio está escrita en el UI
        const fase = document.getElementById('fase-actual').innerText;

        if (fase === "CALENTAMIENTO") {
          this.setVideo('cardio_suave');
        } else if (fase === "ENTRENAMIENTO") {
          this.setVideo('cardio_normal');
        } else if (fase === "SPRINT") {
          this.setVideo('cardio_sprint');
        } else {
          // Por si acaso, un loop de seguridad del mismo video
          this.videoElement.play();
        }
      } else {
        // Si no hay entrenamiento, vuelve a su reposo (feliz o enojada)
        this.setVideo('reposo');
      }
    };

    this.initVoiceRecognition();
  } // FIN DEL CONSTRUCTOR

  // FUNCIONES DE AUTENTICACIÓN Y TOKEN (BÁSICO PARA SIMULAR SESIONES)
  generarToken(usuario) {
    const payload = {
      user: usuario,
      timestamp: Date.now(),
      status: 'AUTHORIZED'
    };
    // Encriptación básica en Base64 para evitar lectura directa
    return btoa(JSON.stringify(payload));
  }

  validarToken(token) {
    try {
      const payload = JSON.parse(atob(token));
      // Validar si el token es muy antiguo (ej. > 24 horas)
      const expira = 24 * 60 * 60 * 1000;
      return (Date.now() - payload.timestamp) < expira;
    } catch (e) {
      return false;
    }
  }

  // FUNCIONES DE INTERFAZ Y CONTROL PRINCIPALES
 

  // Mejora visual al iniciar login
  async iniciarSesion() {
    const btn = document.getElementById('btn-iniciar');
    // btn.style.display = 'none'; // Ocultamos el botón

    // Ejecutar al cargar la página
    const tokenGuardado = localStorage.getItem('eva_session_token');

    if (tokenGuardado && this.validarToken(tokenGuardado)) {
      const data = JSON.parse(atob(tokenGuardado));
      console.log("Sesión restaurada para:", data.user);
      // Bloqueamos el botón automáticamente
      this.bloquearBotonInicio();
    } else {
      // Token inválido o expirado
      localStorage.removeItem('eva_session_token');
    }

    const nombre = await this.solicitarIdentidad(); // Tu función de login anterior

    if (nombre) {
      const token = this.generarToken(nombre);
      localStorage.setItem('eva_session_token', token);

      // Actualizar UI
      document.getElementById('display-usuario').innerText = `USUARIO: ${nombre}`;
      this.bloquearBotonInicio();
    }

    // Al volver, EVA da la bienvenida personalizada
    const titulo = document.getElementById('titulo-eva');
    titulo.innerText = `BIENVENIDO, ${nombre.toUpperCase()}`;

    // Aquí puedes cargar automáticamente su racha
    // document.getElementById('display-racha').innerText = `${this.streak} DÍAS`;
  }

  // 1. Método para solicitar login

  async solicitarIdentidad() {
    const overlay = document.getElementById('login-overlay');
    // 1. Si ya existe, no preguntes nada, devuelve el nombre y continúa
    const usuarioGuardado = localStorage.getItem('eva_user');
    if (usuarioGuardado) {
      document.getElementById('display-usuario').innerText = `OPERADOR: ${usuarioGuardado}`;
      return usuarioGuardado;
    }

    // 2. Si no existe, activamos la interfaz "Estilo Terminal"
    return new Promise((resolve) => {
      const overlay = document.getElementById('login-overlay');
      overlay.style.display = 'block';

      document.getElementById('btn-login-confirmar').onclick = () => {
        const nombre = document.getElementById('input-nombre').value.trim();
        if (nombre) {
          // Guardamos la identidad
          localStorage.setItem('eva_user', nombre);

          // Animación visual de "Vínculo establecido"
          overlay.style.display = 'none';
          document.getElementById('btn-info-usuario').innerText = `OPERADOR: ${nombre}`;

          resolve(nombre); // EVA continúa su flujo
          this.init();
        }
      };
    });
  }


  // Dentro de tu clase EVASystem
  

  // --- MÓDULO DE RACHAS Y DEGRADACIÓN ---

  verificarDegradacionRacha() {
    if (!this.lastTrainingDate) return;

    const partes = this.lastTrainingDate.split('/');
    const ultimaVez = new Date(partes[2], partes[1] - 1, partes[0]);
    const hoy = new Date();

    hoy.setHours(0, 0, 0, 0);
    ultimaVez.setHours(0, 0, 0, 0);

    const diferenciaDias = Math.floor((hoy - ultimaVez) / (1000 * 60 * 60 * 24));

    // --- CONFIGURACIÓN DE ELITE ---
    const RACHA_MINIMA_PROTECCION = 7;

    if (diferenciaDias > 1 && hoy.getDay() !== 1) {
      let rachaAnterior = this.streak;
      let degradada = false;

      if (this.streak >= RACHA_MINIMA_PROTECCION) {
        // Penalización por ausencia: Pierdes 2 días por cada día de falta
        this.streak = Math.max(0, this.streak - (diferenciaDias * 2));
        degradada = true;
        this.actualizarEstadoEVA(true);
        this.hablar(`ADVERTENCIA: Has faltado ${diferenciaDias} días. Tu racha de ${rachaAnterior} ha sido DEGRADADA a ${this.streak}. No abuses de mi paciencia.`, 'regandina');
      } else {
        // Reset total: No superaste la semana de prueba
        this.streak = 0;
        degradada = true;
        this.actualizarEstadoEVA(true);
        this.hablar(`INACTIVIDAD DETECTADA. No has superado la semana mínima de disciplina. Volvemos a cero.`, 'demonio');
      }

      if (degradada) {
        localStorage.setItem('eva_streak', this.streak);
        // Señal visual de degradación: parpadeo rojo en el panel de racha
        const rachaBox = document.getElementById('display-racha');
        if (rachaBox) {
          rachaBox.style.animation = "pulse-red 2s 3";
        }
      }

      this.renderRachaUI();
    }
  }

  ejecutarCelebracionSemanal() {
    const semanas = this.streak / 7;

    // 1. Bajamos la música de fondo al mínimo para oír el vídeo de celebración
    if (this.bgMusic) this.bgMusic.volume = 0.05;

    // 2. EVA anuncia el hito brevemente ANTES de lanzar el overlay
    this.hablar(`¡HITO ALCANZADO! Protocolo de ${semanas} semanas activado.`, 'level_up');

    // 3. Lanzamos el overlay con un pequeño retraso para que termine de hablar
    setTimeout(() => {
      const overlay = document.createElement('div');
      overlay.id = 'celebracion-7-dias';
      // ... (Estilos del overlay que definimos antes) ...

      overlay.innerHTML = `
            <div style="text-align:center; background:black; padding:20px; border:2px solid #00d4ff;">
                <h2 style="color:#00d4ff; font-family:monospace;">> SEMANA ${semanas} COMPLETADA</h2>
                <video id="vid-special" autoplay controls style="width:100%; max-height:70vh;">
                    <source src="assets/videos/celebracion_7_dias.mp4" type="video/mp4">
                </video>
                <button id="btn-cerrar-celebracion" 
                        style="margin-top:20px; width:100%; padding:10px; background:#00d4ff; color:black; font-weight:bold; border:none; cursor:pointer;">
                    CONTINUAR PROGRESO
                </button>
            </div>
        `;
      document.body.appendChild(overlay);

      // 4. Al cerrar el overlay, restauramos la música y el estado de EVA
      document.getElementById('btn-cerrar-celebracion').onclick = () => {
        overlay.remove();
        if (this.bgMusic) this.bgMusic.volume = 0.4;
        this.setVideo('reposo');
        this.hablar("Sistemas restaurados. A por la siguiente semana, operador.");
      };
    }, 2500); // Espera a que EVA termine de decir "Hito alcanzado"
  }


  actualizarEstadoEVA(estaEnojada) {
    this.estaEnojada = estaEnojada;
    localStorage.setItem('eva_enojada', estaEnojada);
    this.playMusic("reposo_enojada");

    const indicador = document.getElementById('eva-status-indicator');
    const color = estaEnojada ? '#ff4d4d' : '#00ff88'; // Rojo vs Verde
    const animacion = estaEnojada ? 'pulse-red 1s infinite' : 'none';

    // 1. Cambiamos el color global de la interfaz (--hal-red)
    //  document.documentElement.style.setProperty('--hal-red', color);

    // 2. Cambiamos el indicador visual (el puntito de estado)
    if (indicador) {
      indicador.style.background = color;
      indicador.style.boxShadow = `0 0 15px ${color}`;
      indicador.style.animation = animacion;
    }

    console.log(estaEnojada ? "😡 EVA: Modo ENOJADA" : "😊 EVA: Modo FELIZ");
  }

  // --- MÓDULO VISIÓN ARTIFICIAL (ROSTRO) ---

  /* async iniciarOjosDeEva() {
    const video = document.getElementById('video-feed');
    const statusText = document.getElementById('status-text');

    try {
      // 1. Cargar modelos de detección (solo los necesarios para que pese poco)
      await faceapi.nets.tinyFaceDetector.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/');

      // 2. Encender cámara
      const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
      video.srcObject = stream;

      // 3. Bucle de detección
      setInterval(async () => {
        const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions());

        if (detections.length > 0) {
          // HUMANO DETECTADO
          statusText.innerText = "OPERADOR DETECTADO";
          statusText.style.color = "#00ff88";
          if (this.ausenciaDetectada) this.reanudarEntrenamiento();
        } else {
          // HUMANO NO DETECTADO
          statusText.innerText = "ESPERANDO OPERADOR...";
          statusText.style.color = "var(--hal-red)";
          if (this.entrenamientoActivo && !this.ausenciaDetectada) this.pausarEntrenamiento();
        }
      }, 1500); // Escanea cada 1.5 segundos (perfecto para la batería)

    } catch (e) {
      console.error("Error en visión:", e);
      statusText.innerText = "ERROR DE VISIÓN";
    }
  } */

  /*
  
  pausarEntrenamiento() {
      if (this.ausenciaDetectada) return;
      this.ausenciaDetectada = true;
  
      // 1. Guardar tiempo y PARAR el intervalo de cardio
      const display = document.getElementById('timer-display');
      if (display) {
          const partes = display.innerText.split(':');
          this.tiempoRestanteAlPausar = (parseInt(partes[0]) * 60) + parseInt(partes[1]);
      }
  
      if (this.timerInterval) {
          clearInterval(this.timerInterval);
          this.timerInterval = null;
          console.log("⏱️ Cronómetro de cardio CONGELADO");
      }
  
      // 2. Parar Multimedia
      if (this.bgMusic) this.bgMusic.pause();
      const v = document.getElementById('eva-display'); // El video de EVA es el que se pausa
      if (v) v.pause();
  
      this.setVideo('regandina');
      this.hablar("¡Hey! No te veo. Pausando entrenamiento.");
  }
  
  reanudarEntrenamiento() {
      if (!this.ausenciaDetectada || this.timerReactivacion) return;
  
      let cuentaAtras = 5; // Bajamos a 5 para que no sea eterno
      this.hablar(`Te veo. Retomamos en ${cuentaAtras} segundos. ¡A tu sitio!`);
  
      this.timerReactivacion = setInterval(() => {
          cuentaAtras--;
          document.getElementById('status-text').innerText = `PREPARATE... ${cuentaAtras}s`;
  
          if (cuentaAtras <= 0) {
              clearInterval(this.timerReactivacion);
              this.timerReactivacion = null;
              this.ausenciaDetectada = false;
  
              // 1. REANUDAR EL CRONÓMETRO
              if (this.tiempoRestanteAlPausar > 0) {
                  this.iniciarCronometro(this.tiempoRestanteAlPausar);
              }
  
              // 2. REANUDAR MULTIMEDIA
              if (this.bgMusic) this.bgMusic.play();
              const v = document.getElementById('eva-display');
              if (v) v.play();
              
              this.setVideo('contenta');
              this.hablar("¡Dale caña!");
              document.getElementById('status-text').innerText = "SISTEMA ACTIVO";
          }
      }, 1000);
  }
  
  */


  // 2. RECONOCIMIENTO DE VOZ ACTUALIZADO (Con ambas memorias)
  initVoiceRecognition() {
    const SpeechRoute = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRoute) return;

    this.recognition = new SpeechRoute();
    this.recognition.continuous = false;
    this.recognition.lang = 'es-ES';

    this.recognition.onstart = () => {
      this.listening = true;
      if (this.bgMusic) this.bgMusic.volume = 0.05;
    };

    this.recognition.onresult = (e) => {
      const cmd = e.results[e.results.length - 1][0].transcript.toLowerCase();

      // Lógica de Peso Corregida
      if (cmd.includes("peso") || cmd.includes("pesando")) {
        const num = cmd.match(/\d+/);
        if (num) {
          const nuevoPeso = parseFloat(num[0]);

          // 1. OBTENER PESO ANTERIOR CORRECTAMENTE
          const pesoAnterior = parseFloat(localStorage.getItem('eva_ultimo_peso') || 0);

          // 2. COMPARACIÓN ANTES DE GUARDAR
          if (pesoAnterior !== 0 && nuevoPeso > pesoAnterior) {
            this.actualizarEstadoEVA(true); // Se pone roja y enfadada
            this.hablar(`¿${nuevoPeso} kilos? Has subido. ¡A entrenar ahora mismo!`, 'regandina');
          } else {
            this.actualizarEstadoEVA(false); // Se pone verde y feliz
            this.hablar(`Peso actualizado a ${nuevoPeso}. Buen control.`);
          }

          // 3. ACTUALIZAR LOCAL Y NUBE
          this.lastWeight = nuevoPeso;
          localStorage.setItem('eva_ultimo_peso', nuevoPeso);
          document.getElementById('input-peso').value = nuevoPeso;

          // Enviamos con el humor actualizado según la lógica anterior
          //  this.guardarDatosEnNube(nuevoPeso, null);
        }
      }

      if (cmd.includes("activar ojos") || cmd.includes("activar visión")) {
        this.hablar("Activando sensores visuales. Ahora te tengo vigilado, operador.");
        this.iniciarOjosDeEva();
      }

      // Lógica de Fatiga
      if (cmd.includes("fatiga") || cmd.includes("nivel")) {
        const num = parseInt(cmd.match(/\d+/));
        if (num >= 1 && num <= 8) {
          document.getElementById('val-fatiga').innerText = num;
          this.hablar(`Nivel ${num} registrado.`);
          this.guardarDatosEnNube(null, num); // Guardar en nube
        }
      }
    };

    this.recognition.onend = () => {

      this.listening = false;
      const btn = document.getElementById('btn-micro');
      const txt = document.getElementById('micro-text');

      // Restauramos aspecto original
      btn.style.background = "transparent";
      btn.style.boxShadow = "none";
      txt.innerText = "HABLAR CON EVA";

      if (this.bgMusic) this.bgMusic.volume = 0.4;
      console.log("🎤 Micrófono cerrado.");
    };

  }

  toggleMicrofono() {
    const btn = document.getElementById('btn-micro');
    const txt = document.getElementById('micro-text');

    if (this.listening) {
      this.recognition.stop();
      // El estado se actualiza en onend
    } else {
      try {
        this.recognition.start();
        this.listening = true;
        btn.style.background = "rgba(0, 212, 255, 0.2)";
        btn.style.boxShadow = "0 0 20px rgba(0, 212, 255, 0.4)";
        txt.innerText = "ESCUCHANDO...";
      } catch (e) {
        console.error("Error al iniciar micro:", e);
      }
    }
  }




  hablar(texto, tipo = "habla") {
    if (this.recognition) this.recognition.stop();
    this.speech.cancel();

    this.setVideo(tipo);

    const msg = new SpeechSynthesisUtterance(texto);
    msg.lang = 'es-ES';

    // 1. BAJAR MÚSICA: Si estamos entrenando, bajamos el volumen a 0.1 o 0.05
    if (this.entrenamientoActivo) {
      this.bgMusic.volume = 0.05;
    }

    msg.onstart = () => {

      // Solo cambiamos a 'habla' si:
      // NO estamos entrenando Y NO estamos enojadas
      if (!this.entrenamientoActivo && !this.estaEnojada) {
        this.setVideo('habla');
      }

    };

    msg.onend = () => {
      // Al terminar de hablar, si la música es la de 'exito', la subimos para celebrar
      if (this.bgMusic && this.bgMusic.src.includes('victory')) {
        this.bgMusic.volume = 0.5; // Sube la música de victoria para el cierre
      } else if (this.entrenamientoActivo) {
        this.bgMusic.volume = this.currentMusicVolume || 0.4;
      } else {
        this.bgMusic.volume = 0.2; // Volumen de reposo normal
      }

      if (!this.misionCumplida) {
        setTimeout(() => {
          try { this.recognition.start(); } catch (e) { }
        }, 500);
      }

      if (this.estaEnojada) {
        this.setVideo('reposo_enojada');
      } else {
        this.setVideo('reposo');
      }
    };

    this.speech.speak(msg);
  }

  // Dentro de la clase EVASystem en script.js

  calcularTiempoCardio() {
    const tiempoBase = 15; // minutos
    const incrementoPorDia = 0.5; // Sumamos 30 segundos por día de racha
    const maximoTiempo = 60; // Limitamos para evitar sobreentrenamiento

    // Calculamos el tiempo según la racha actual
    let tiempoFinal = tiempoBase + (this.streak * incrementoPorDia);

    // Aplicamos el tope de seguridad
    return Math.min(tiempoFinal, maximoTiempo);
  }


  iniciarCronometro(duracion) {
    // Si ya hay un timer funcionando, lo matamos antes de empezar el nuevo
    if (this.timerInterval) clearInterval(this.timerInterval);

    let tiempo = duracion;
    const display = document.getElementById('timer-display'); // IMPORTANTE: Tu ID es 'timer-display' no 'cronometro'

    this.timerInterval = setInterval(() => {
      let minutos = Math.floor(tiempo / 60);
      let segundos = tiempo % 60;

      if (display) {
        display.innerText = `${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;
      }

      if (tiempo <= 0) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
        // Si es cardio, llamamos a finalizarCardio
        if (this.routine === "CARDIO") this.finalizarCardio();
      }
      tiempo--;
    }, 1000);
  }

  checkBloqueoDiario() {
    const hoy = new Date().toLocaleDateString('es-ES');
    const ultimaMisionGuardada = localStorage.getItem('eva_ultima_mision');

    console.log("Comprobando bloqueo: Hoy:", hoy, "Última:", ultimaMisionGuardada);

    if (ultimaMisionGuardada === hoy) {
      this.misionCumplida = true;
      return true; // Indicamos que SÍ está bloqueado
    }
    return false;
  }

  async init() {

    const btnIniciar = document.getElementById('btn-iniciar');
    btnIniciar.disabled = true;
    btnIniciar.innerText = "SISTEMA OPERATIVO: ONLINE";
    btnIniciar.style.opacity = "0.6";
    btnIniciar.style.cursor = "default";

    const tools = document.getElementById('tools-container');
    tools.style.display = 'block'; // Mostramos las herramientas al iniciar sesión

    // 1. Lo primero: ¿Ya entreno hoy?
    const bloqueado = this.checkBloqueoDiario();

    if (bloqueado) {
      this.modoMisionCumplida(); // Ejecuta tu función que oculta todo
      this.hablar("Sistemas en reposo. Ya has cumplido con tu deber hoy, espera al proximo entrenamiento.");
      this.setVideo('contenta');
      return; // DETIENE TODO: No activa micros ni sensores
    }

    // 2. Si NO está bloqueado, sigue el arranque normal...
    console.log("Acceso concedido. Iniciando EVA...");

    // 2. COMPROBACIÓN DE BLOQUEO POR MISIÓN CUMPLIDA (Prioridad absoluta)
    const ultimaMision = localStorage.getItem('eva_ultima_mision');
    const hoy = new Date().toLocaleDateString('es-ES');
    const btnInit = document.getElementById('btn-power');


    //  this.iniciarGoogleFit();

    if (ultimaMision === hoy) {
      this.initialized = true;
      this.misionCumplida = true;

      // Interfaz en modo "Misión cumplida"
      if (btnInit) {
        btnInit.disabled = true;
        btnInit.innerText = "MISIÓN COMPLETADA ✓";
        btnInit.style.borderColor = "var(--blue-tech)";
        btnInit.style.color = "var(--blue-tech)";
        btnInit.style.opacity = "0.8";
      }

      this.actualizarEstadoEVA(false); // Verde/Feliz
      this.setVideo('reposo');

      // EVA te informa y se calla
      setTimeout(() => {
        this.hablar("Entrenamiento diario completado. Los datos están sincronizados. Ha  Descansar.");
      }, 1000);

      return; // DETENEMOS EL INICIO: No activamos voz ni sensores
    }

    // 2. BLOQUEO DE DOBLE INSTANCIA
    if (this.initialized) {
      console.log("⚠️ Sistema ya online.");
      return;
    }
    this.initialized = true;

    // 3. CARGA DE DATOS LOCALES
    this.lastWeight = parseFloat(localStorage.getItem('eva_ultimo_peso')) || 70;
    this.streak = parseInt(localStorage.getItem('eva_streak')) || 0;
    // El humor ahora depende de nuestra función maestra
    this.estaEnojada = (localStorage.getItem('eva_enojada') === 'true');
    this.lastTrainingDate = localStorage.getItem('eva_last_date');

    this.verificarDegradacionRacha();
  
    // 4. SINCRONIZACIÓN DE INTERFAZ
    document.getElementById('input-peso').value = this.lastWeight;
    document.getElementById('display-racha').innerText = `${this.streak} DÍAS`;

    // Cambiamos el aspecto visual del botón de inicio
    if (btnInit) {
      btnInit.disabled = true;
      btnInit.style.opacity = "0.5";
      btnInit.innerText = "SISTEMA ONLINE";
    }

    // 5. PROTOCOLO DE ARRANQUE VISUAL Y SONORO
    this.updateCalendar();
    this.updateLogic();

    // Verificamos si hay un bloqueo temporal de recuperación (el que ya tenías)
    const bloqueoRecuperacion = localStorage.getItem('eva_bloqueo_hasta') &&
      new Date() < new Date(localStorage.getItem('eva_bloqueo_hasta'));

    if (bloqueoRecuperacion) {
      this.setVideo('reposo');
      this.hablar("Sistemas en pausa.recuperación activa.");
      this.playMusic('reposo', 0.2);
    } else if (this.routine === "DESCANSO") {
      this.setVideo('reposo');
      this.hablar("Sistemas en espera. Hoy es domingo de descanso.");
    } else if (this.estaEnojada) {
      this.actualizarEstadoEVA(true); // Se pone roja
      this.setVideo('reposo_enojada');
      this.hablar("SISTEMAS REINICIADOS. SIGO ENFADADA, ¡A ENTRENAR!", 'regandina');
    } else {
      this.actualizarEstadoEVA(false); // Se pone verde
      this.setVideo('reposo');
      this.hablar("Sistemas en línea. Bienvenido. ¿Listo para entrenar?");
      this.playMusic("reposo");
    }


    // 6. ACTIVACIÓN DE SENSORES (Solo si no estaba bloqueado arriba)
    this.solicitarWakeLock();
    this.initVoiceRecognition();
  }


  modoMisionCumplida() {
    document.getElementById("cardio-session-box").style.display = "none";

    const fuerza = document.getElementById("fuerza-container");
    if (fuerza) fuerza.style.display = "none";

    const fatiga = document.getElementById("fatigue-module").style.display = "none";

    document.getElementById("display-rutina").innerText = "COMPLETADO";
    document.getElementById("display-rutina").style.color = "#00ff88";

    document.getElementById("details-box").innerHTML =
      "<span style='color:#00ff88'>ENTRENAMIENTO DE HOY COMPLETADO ✓</span>";

    const btn = document.getElementById("btn-power");
    btn.innerText = "DESCANSA BIEN ESOS MÚSCULOS";
    btn.style.pointerEvents = "none";
    btn.style.opacity = ".6";
    btn.style.borderColor = "#00ff88";
    btn.style.color = "#00ff88";

    this.setVideo("contenta");
    this.playMusic("reposo", 0.2);
  }

  // Método para asegurar que la racha está al día antes de usarla
  obtenerRachaActualizada() {
    // Si la fecha del último entrenamiento no es hoy, quizás la racha cambió
    // (Esto es una medida de seguridad extra)
    const ultimaFecha = localStorage.getItem('eva_last_date');
    const hoy = new Date().toLocaleDateString('es-ES');

    // Si pasó más de 1 día desde el último entrenamiento, la racha ya se degradó
    // esto lo gestionas en tu verificarDegradacionRacha()
    return parseInt(localStorage.getItem('eva_streak')) || 0;
  }

  iniciarSesionCardio() {
    this.entrenamientoActivo = true
    document.getElementById('btn-start-cardio').style.display = "none";
    document.getElementById('btn-pause-cardio').style.display = "block"; // Mostrar pausa

    // FORZAMOS LA LECTURA FRESCA DEL DATO
    this.streak = this.obtenerRachaActualizada();

    // Si la racha es baja, EVA avisa que estamos en modo conservador
    if (this.streak < 3) {
      document.getElementById('estado').innerText = "MODO: RECUPERACIÓN";
      document.getElementById('estado').style.color = "yellow";
      this.estado = "RECUPERACION";
    } else {
      document.getElementById('estado').innerText = "MODO: PROGRESIÓN";
      this.estado = "PROGRESION";
    }

    // 1. FORZAMOS EL CÁLCULO
    const minutosCalculados = this.calcularTiempoCardio();
    // 2. SOBREESCRIBIMOS EL OBJETO DE CONFIGURACIÓN
    this.configCardio.total = minutosCalculados;

    // 3. LOG DE CONTROL (Revisa esto en F12 > Console)
    console.log("DEBUG - Racha actual:", this.streak);
    console.log("DEBUG - Tiempo calculado:", minutosCalculados);

    let tiempoRestante = this.configCardio.total * 60;



    const fases = this.configCardio.fases;

    document.getElementById('fase-actual').innerText = "CALENTAMIENTO";

    // Primero damos la orden de voz
    this.hablar("Calentamiento iniciado. ¡A los pedales!");

    // Dejamos un margen para que el video cargue sin conflicto con el habla inicial
    setTimeout(() => {
      this.setVideo("cardio_suave");
      this.playMusic('calentamiento');
    }, 500);

    if (this.timerInterval) clearInterval(this.timerInterval);

    this.timerInterval = setInterval(() => {
      tiempoRestante--;
      this.actualizarTimerVisual(tiempoRestante);

      const segsTrans = (this.configCardio.total * 60) - tiempoRestante;
      const minsTrans = segsTrans / 60;

      // CONTROL DE VÍDEO POR FASES (Solo cambia si es necesario)
      if (minsTrans >= fases.calentamiento && minsTrans < (fases.calentamiento + fases.nucleo)) {
        if (document.getElementById('fase-actual').innerText !== "ENTRENAMIENTO") {
          document.getElementById('fase-actual').innerText = "ENTRENAMIENTO";
          this.setVideo("cardio_normal");
          this.playMusic('entrenamiento');
          this.hablar("Pasamos a fase de entrenamiento. No bajes el ritmo.");
        }
      }
      else if (minsTrans >= (fases.calentamiento + fases.nucleo)) {
        if (document.getElementById('fase-actual').innerText !== "SPRINT") {
          document.getElementById('fase-actual').innerText = "SPRINT";
          this.setVideo("cardio_sprint");
          this.playMusic('sprint');
          this.hablar("¡Sprint final! ¡Máxima intensidad ahora!");
        }
      }

      if (tiempoRestante <= 0) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
        this.finalizarCardio();
      }
    }, 1000);
  }

  alternarPausaCardio() {
    const btn = document.getElementById('btn-pause-cardio');

    if (!this.ausenciaDetectada) {
      // --- ESTADO: PAUSAR ---
      this.ausenciaDetectada = true;
      btn.innerText = "REANUDAR";
      btn.style.borderColor = "#00ff88"; // Verde para reanudar
      btn.style.color = "#00ff88";

      clearInterval(this.timerInterval);
      this.timerInterval = null;

      if (this.bgMusic) this.bgMusic.pause();
      this.videoElement.pause();
      this.hablar("Entrenamiento en pausa.");
    } else {
      // --- ESTADO: REANUDAR ---
      this.ausenciaDetectada = false;
      btn.innerText = "PAUSA";
      btn.style.borderColor = "#ffd700"; // Amarillo para pausa
      btn.style.color = "#ffd700";

      // Usamos el tiempo que quedó guardado en la UI
      const display = document.getElementById('timer-display');
      const partes = display.innerText.split(':');
      const segundosRestantes = (parseInt(partes[0]) * 60) + parseInt(partes[1]);

      this.iniciarCronometro(segundosRestantes); // Reutiliza tu función de cronómetro

      if (this.bgMusic) this.bgMusic.play();
      this.videoElement.play();
      this.hablar("Continuamos. ¡A darle duro A LOS PEDALES!"); // Mensaje de reanudación
    }
  }

  finalizarCardio() {
    this.entrenamientoActivo = false;

    // Iniciamos la música de victoria en segundo plano (muy baja)
    this.playMusic('exito', 0.05);
    this.setVideo("mision_ok");

    // EVA anuncia el fin del cardio sin competir con el volumen de la música
    setTimeout(() => {
      this.hablar("Entrenamiento de cardio finalizado. Buen ritmo en los pedales. Indica tu fatiga del 1 al 8 para guardar el registro.");
    }, 300);

    this.habilitarBotonFinal();
    document.getElementById("cardio-session-box").style.display = "none";

  }

  // --- MÓDULO DE FUERZA DINÁMICA ---

  calcularConfiguracionFuerza() {
    // Progresión: empezamos con 5 reps, +1 por cada 5 días de racha
    const repsBase = 5;
    const seriesBase = 1;
    // Series: empezamos con 3 series, +1 serie cada 10 días de racha


    // Si la racha es menor a 3, volvemos al modo "Seguro"
    if (this.streak < 3) {
      return { reps: repsBase, series: seriesBase };
    }

    const incrementoReps = Math.floor(this.streak / 5);
    const totalReps = Math.min(repsBase + incrementoReps, 35); // Tope de 15 reps

    const incrementoSeries = Math.floor(this.streak / 10);
    const totalSeries = Math.min(seriesBase + incrementoSeries, 35); // Tope de 5 series

    return { reps: totalReps, series: totalSeries };
  }

  iniciarProtocoloFuerza() {
    this.entrenamientoActivo = true;
    this.currentMusicVolume = 0.4;

    // --- AQUÍ APLICAMOS LA PROGRESIÓN ---
    this.streak = this.obtenerRachaActualizada(); // Aseguramos dato fresco
    const config = this.calcularConfiguracionFuerza();

    const primeraTarea = this.ejerciciosFuerza[0].replace('_', ' ');

    // 1. EVA dicta las órdenes por voz de manera limpia
    this.hablar(`Entrenamiento de fuerza iniciado. Hoy tu objetivo son ${config.series} series de ${config.reps} repeticiones. Primer ejercicio: ${primeraTarea}. ¡A por ello!`);
    this.playMusic('entrenamiento', 0.4);

    // 2. Visualización limpia en el contenedor tipo carrusel
    const lista = document.getElementById('lista-ejercicios');
    if (lista) {
      lista.style.display = "flex";
    }

    // Ocultamos las demás y forzamos que solo se vea la primera tarjeta
    this.ejerciciosFuerza.forEach((_, i) => {
      const p = document.getElementById(`paso-${i}`);
      if (p) p.style.display = (i === 0) ? "block" : "none";
    });

    // Ocultamos el botón para limpiar la pantalla de la tablet
    const btnFuerza = document.getElementById('btn-iniciar-fuerza');
    if (btnFuerza) btnFuerza.style.display = 'none';

    // 3. 💥 ¡CLAVE! Cambiamos el avatar de EVA para que empiece a entrenar este ejercicio específico
    this.setVideo(this.ejerciciosFuerza[0]);
  }

  renderFuerza() {
    this.entrenamientoActivo = false;
    const container = document.getElementById('fuerza-container');
    const lista = document.getElementById('lista-ejercicios');

    container.style.display = "flex";
    lista.innerHTML = "";
    lista.style.display = "none"; // Nace oculta esperando el gatillazo

    const btnInicio = document.getElementById('btn-iniciar-fuerza');
    if (btnInicio) {
      btnInicio.style.display = this.initialized ? "block" : "none";
    }
    const config = this.calcularConfiguracionFuerza(); // Obtiene {reps, series}

    // Si la racha es baja, EVA avisa que estamos en modo conservador
    if (this.streak < 3) {
      document.getElementById('estado').innerText = "MODO: RECUPERACIÓN";
      document.getElementById('estado').style.color = "yellow";
      this.estado = "RECUPERACION";
    } else {
      document.getElementById('estado').innerText = "MODO: PROGRESIÓN";
      this.estado = "PROGRESION";
    }

    const reps = config.reps;
    const series = config.series;

    this.hablar(`Rutina de fuerza lista, operador. Hoy realizaremos ${this.ejerciciosFuerza.length} ejercicios, configurados a ${series} series de ${reps} repeticiones. Pulsa iniciar cuando estés listo.`);

    this.ejerciciosFuerza.forEach((ex, i) => {
      const div = document.createElement('div');
      div.className = `ejercicio-paso`;
      div.id = `paso-${i}`;
      div.style.display = "none"; // Las tarjetas individuales nacen apagadas

      div.innerHTML = `
                <div style="text-align: center; width: 100%;">
                    <h2 style="font-size: 2.2rem; margin-bottom: 15px; text-transform: uppercase; color: #fff;">${ex.replace('_', ' ')}</h2>
                    <p style="font-size: 1.6rem; color: var(--blue-tech); font-family: monospace; margin-bottom: 30px;">
                        > ${series} SERIES x ${reps} REPS
                    </p>
                    <button onclick="EVA.nextStep(${i})" class="tool-btn" style="padding: 20px 50px; font-size: 1.6rem; font-weight: bold; width: 100%; max-width: 300px; box-shadow: 0 0 15px rgba(0, 212, 255, 0.3);">
                        EJERCICIO HECHO
                    </button>
                </div>
            `;
      lista.appendChild(div);
    });
  }

  nextStep(index) {
    const actual = document.getElementById(`paso-${index}`);
    const nextIndex = index + 1;
    const siguiente = document.getElementById(`paso-${nextIndex}`);

    // Ocultamos la tarjeta actual que acabas de terminar
    if (actual) actual.style.display = "none";

    if (siguiente) {
      // Mostramos la tarjeta del siguiente ejercicio en la lista
      siguiente.style.display = "block";

      const config = this.calcularConfiguracionFuerza(); // Obtiene {reps, series}

      const reps = config.reps;
      const series = config.series;

      const nombreSiguiente = this.ejerciciosFuerza[nextIndex].replace('_', ' ');

      // EVA te anuncia los nuevos objetivos en voz alta
      this.hablar(`Completado. Siguiente ejercicio: ${nombreSiguiente}. Te corresponden ${series} series de ${reps} repeticiones. ¡Mantén el ritmo!`);

      setTimeout(() => {
        this.playMusic('entrenamiento');
      }, 800);

      // 💥 ¡CLAVE! EVA cambia su vídeo en tiempo real para enseñarte cómo hacer el nuevo ejercicio
      this.setVideo(this.ejerciciosFuerza[nextIndex]);
    } else {
      // Si ya no quedan más tareas en la lista, saltamos al protocolo de cierre exitoso
      this.finalizarFuerza();
    }
  }

  finalizarFuerza() {
    this.entrenamientoActivo = false;

    // 1. Limpiamos el contenedor y mostramos un mensaje bonito de éxito en pantalla
    const lista = document.getElementById('lista-ejercicios');
    if (lista) {
      lista.innerHTML = `
                <div style="text-align: center; padding: 20px; animation: fadeIn 0.5s ease;">
                    <h2 style="color: #00ff88; font-size: 2rem; margin-bottom: 10px;">¡RUTINA COMPLETADA!</h2>
                    <p style="color: #ccc; font-size: 1.2rem;">Buen trabajo, operador. Has superado todos los ejercicios.</p>
                </div>
            `;
    }

    // 2. Transición multimedia: Música suave de éxito y vídeo triunfal
    this.playMusic('exito', 0.05);
    this.setVideo('mision_ok');

    // 3. EVA da las instrucciones de voz sin competir con música alta
    setTimeout(() => {
      this.hablar("Rutina de fuerza completada con éxito, operador. Excelente disciplina. Ahora, registra tu nivel de fatiga en el panel para guardar la sesión.");
    }, 300);

    // 4. Activamos el flujo de guardado que ya tienes programado
    this.habilitarBotonFinal();
  }

  habilitarBotonFinal() {
    // 1. Mostramos el módulo de fatiga
    const fatigueModule = document.getElementById('fatigue-module');
    if (fatigueModule) fatigueModule.style.display = "block";

    // 2. Localizamos el botón de finalizar específico
    const btnFinalizar = document.getElementById('btn-finalizar-fuerza');
    const btnPower = document.getElementById('btn-power');

    // Cambiamos el texto del botón principal para dar instrucciones
    if (btnPower) {
      btnPower.innerText = "REGISTRA FATIGA (1-8)";
      btnPower.style.borderColor = "orange";
    }

    // Monitorizamos hasta que el usuario marque fatiga
    const monitor = setInterval(() => {
      const val = parseInt(document.getElementById('val-fatiga').innerText);
      if (!isNaN(val) && val >= 1 && val <= 8) {
        // Cuando hay fatiga, mostramos el botón verde de finalizar
        if (btnFinalizar) {
          btnFinalizar.style.display = "block";
          btnFinalizar.style.animation = "pulse 1.5s infinite";
        }
        if (btnPower) btnPower.innerText = "FATIGA REGISTRADA ✓";

        clearInterval(monitor);
      }
    }, 500);
  }

  finalizarMision() {
    // 1. EL SEGURO: Si la misión ya se completó (importada o hecha), no hacemos nada
    if (this.misionCumplida) {
      this.hablar("Esta sesión ya ha sido registrada hoy. No duplicaremos los datos.");
      return;
    }

    const pesoFinal = document.getElementById('input-peso').value || this.lastWeight;
    const fatigaFinal = document.getElementById('val-fatiga').innerText;

    if (fatigaFinal === "?" || fatigaFinal === "") {
      this.hablar("Registra tu nivel de fatiga para cerrar el Entrenamiento de " + this.routine);
      return;
    }

    // --- LÓGICA DE CELEBRACIÓN CADA 7 DÍAS ---
    if (this.streak > 0 && this.streak % 7 === 0) {
      this.ejecutarCelebracionSemanal();
    } else {
      this.hablar(`Misión cumplida. Racha de ${this.streak} días. Buen trabajo.`, "contenta");
    }

    // 2. Marcamos como completada ANTES de enviar para bloquear re-intentos
    this.misionCumplida = true;
    this.streak = (this.streak || 0) + 1;
    localStorage.setItem('eva_streak', this.streak);
    localStorage.setItem('eva_ultima_mision', new Date().toLocaleDateString('es-ES'));

    // 3. Sincronización
    this.guardarDatosEnNube(this.modo, this.estado, pesoFinal, fatigaFinal);
    this.actualizarEstadoEVA(false);

    this.hablar(`Misión cumplida. Racha de ${this.streak} días. Buen trabajo.`, "contenta");

    // Limpieza de interfaz
    document.getElementById("btn-finalizar-fuerza").style.display = "none";
    document.getElementById("fatigue-module").style.display = "none";
    this.entrenamientoActivo = false;
  }

  saveToDB() {
    const pesoActual = document.getElementById('input-peso').value;
    const fatigaActual = parseInt(document.getElementById('val-fatiga').innerText);
    const hoy = new Date();

    // --- LÓGICA DE BLOQUEO PROGRESIVO ---
    let diasDescanso = 0;
    if (fatigaActual === 6) diasDescanso = 1;
    if (fatigaActual === 7) diasDescanso = 2;
    if (fatigaActual === 8) diasDescanso = 3;

    if (diasDescanso > 0) {
      // Calculamos la fecha exacta de liberación
      const fechaDesbloqueo = new Date();
      fechaDesbloqueo.setDate(hoy.getDate() + diasDescanso);
      // Guardamos la fecha en formato ISO para poder compararla al recargar la web
      localStorage.setItem('eva_bloqueo_hasta', fechaDesbloqueo.toISOString());

      this.hablar(`Nivel de fatiga ${fatigaActual} detectado. Protocolo de seguridad activado: bloqueo de ${diasDescanso} ${diasDescanso === 1 ? 'día' : 'días'}. Descansa, es una orden.`, 'regandina');
    } else {
      this.hablar(`Entrenamiento registrado. Fatiga dentro de los parámetros normales.`, 'mision_ok');
    }

    // Registro estándar en la base de datos
    const nuevoRegistro = {
      fecha: hoy.toLocaleString(),
      rutina: this.routine,
      fatiga: fatigaActual,
      peso: pesoActual,
      racha: this.streak,
      humor: this.estaEnojada

    };
    this.db.push(nuevoRegistro);
    localStorage.setItem('eva_db', JSON.stringify(this.db));
    localStorage.setItem('eva_ultimo_peso', pesoActual);
    localStorage.setItem('eva_enojada', this.estaEnojada);
    this.actualizarRacha();
  }

  updateCalendar() {
    const d = new Date();
    document.getElementById('display-fecha').innerText = d.toLocaleDateString();

    // --- COMPROBACIÓN DE BLOQUEO ACTIVO ---
    const bloqueoHasta = localStorage.getItem('eva_bloqueo_hasta');
    let estaBloqueado = false;
    let tiempoRestanteTxt = "";

    if (bloqueoHasta) {
      const fechaLibre = new Date(bloqueoHasta);
      if (d < fechaLibre) {
        estaBloqueado = true;
        // Calculamos cuánto falta para informar al usuario
        const diff = fechaLibre - d;
        const diasFaltan = Math.ceil(diff / (1000 * 60 * 60 * 24));
        tiempoRestanteTxt = `FALTAN ${diasFaltan} DÍAS`;
      } else {
        // Si la fecha ya pasó, limpiamos el bloqueo
        localStorage.removeItem('eva_bloqueo_hasta');
      }
    }

    // --- ASIGNACIÓN DE RUTINA ---
    if (estaBloqueado) {
      this.routine = "RECUPERACIÓN";
      document.getElementById('display-rutina').innerText = "BLOQUEO ACTIVO";
      document.getElementById('display-rutina').style.color = "var(--hal-red)";
    } else if (d.getDay() === 0) {
      this.routine = "DESCANSO";
      document.getElementById('display-rutina').innerText = "DESCANSO";
    }

    else {
      this.routine = (d.getDay() % 2 == 0 ? "CARDIO" : "FUERZA");
      document.getElementById('display-rutina').innerText = this.routine;
      document.getElementById('display-rutina').style.color = "var(--blue-tech)";
    }

    // --- ACCIÓN FÍSICA EN LA INTERFAZ ---
    const btnStart = document.getElementById('btn-start-cardio');
    if (estaBloqueado) {
      if (btnStart) btnStart.style.display = "none"; // Ocultamos el botón de inicio
      document.getElementById('details-box').innerHTML = `<span style="color:var(--hal-red)">BLOQUEO DE SEGURIDAD:<br>${tiempoRestanteTxt}</span>`;
      this.hablar("Acceso denegado. Estás en periodo de recuperación obligatoria. A DESCANSAR Y RECUPERAR ENERGIA");
    } else {
      if (this.routine === "FUERZA" && !this.misionCumplida) this.renderFuerza();

    }
  }


  updateLogic() {
    const peso = parseFloat(this.lastWeight);
    const agua = (peso * 0.035).toFixed(1);
    const details = document.getElementById('details-box');
    if (this.routine === "CARDIO") {
      const sesiones = this.db.filter(s => s.rutina === "CARDIO").length;
      let t = this.calcularTiempoCardio(); // Calculamos el tiempo dinámicamente según la racha
      this.configCardio = { total: t, fases: { calentamiento: Math.round(t * 0.2), nucleo: Math.round(t * 0.6), sprint: Math.round(t * 0.2) } };
      details.innerHTML = `<strong>BICI</strong>: ${t} MIN<br><strong>AGUA RECOMENDADA</strong>: ${agua}L`;
      document.getElementById('cardio-session-box').style.display = "block";
      document.getElementById('timer-display').innerText = `${t}:00`;
    } else {
      details.innerHTML = `<strong>RUTINA</strong>: FUERZA<br><strong>AGUA RECOMENDADA</strong>: ${agua}L`;
    }
  }

  // 1. MÉTODO PARA GUARDAR EN LA NUBE (Memoria a largo plazo)

  /*  async guardarDatosEnNube(pesoFinal, fatigaFinal) {
     const URL_SCRIPT = "https://script.google.com/macros/s/AKfycbxeYcQAHGoDzXD88RgbKX8nzpWWUjxvB1uKRVSH44i_f9nqCC8S4uc9yAfPLWlIFE2d/exec"; // Tu URL de Google Apps Script
 
     // Solo enviamos lo estrictamente necesario para el historial
     const datos = {
       fecha: new Date().toLocaleDateString('es-ES'), // Solo fecha (DD/MM/AAAA)
       rutina: this.routine || "FUERZA",
       peso: pesoFinal,
       fatiga: fatigaFinal,
       racha: this.streak || 0
     };
 
     console.log("🚀 Enviando reporte final a la nube...", datos);
 
     try {
       await fetch(URL_SCRIPT, {
         method: 'POST',
         mode: 'no-cors',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify(datos)
       });
       console.log("✅ Registro diario completado con éxito.");
     } catch (e) {
       console.error("❌ Error al sincronizar con la nube:", e);
     }
   } */


  /**
* Envía los datos del entrenamiento a la API de Vercel.
* Se ejecuta en segundo plano sin bloquear la interfaz.
*/
  async guardarDatosEnNube(tipo, modo, fatiga, peso) {
    const nombreUsuario = localStorage.getItem('eva_user'); // Recuperamos el nombre
    // 1. Datos que vamos a enviar
    const payload = {
      usuario: nombreUsuario, // El ID único que generaste en el constructor
      tipo: tipo,           // 'fuerza' o 'cardio'
      modo: modo,           // '3x5' o 'cronometrado'
      fatiga: fatiga,  // El nivel de fatiga
      peso: peso       // El peso registrado
      // El dato numérico
    };

    // 2. Detector de entorno:
    // Si estamos en local (localhost o 127.0.0.1), no intentamos conectar
    // para evitar errores de red.
    const esLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

    if (esLocal) {
      console.log("EVA: Modo Local. Sincronización omitida.", payload);
      return; // Salimos de la función, el guardado local ya ocurre fuera de aquí
    }

    // 3. Intento de envío a la API (Vercel + Turso)
    try {
      const respuesta = await fetch('/api/guardar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (respuesta.ok) {
        console.log("EVA: Datos registrados en la nube con éxito.");
      } else {
        console.error("EVA: Error al guardar en la nube (Status: " + respuesta.status + ")");
      }
    } catch (error) {
      // Esto captura fallos de red (ej: usuario sin internet)
      console.warn("EVA: Sin conexión a la base de datos externa. Los datos están seguros en local.");
    }
  }


  prepararBorrado() {
    // 1. EVA se enoja visualmente
    this.setVideo('regandina');
    this.hablar("¿Cómo te atreves? ¿Quieres borrar todo nuestro progreso? Piénsalo dos veces.");

    // 2. Mostramos el modal elegante
    document.getElementById('modal-borrado').style.display = "flex";
  }

  cerrarModal() {
    // 1. Ocultamos el modal inmediatamente
    document.getElementById('modal-borrado').style.display = "none";

    // 2. EVA da su respuesta de alivio
    const fraseAlivio = "Sabia decisión. No me vuelvas a asustar así. Sigamos con el plan.";

    // Usamos una lógica interna similar a 'hablar' pero asegurando el cierre del video
    if (this.recognition) this.recognition.stop();
    this.speech.cancel();

    const msg = new SpeechSynthesisUtterance(fraseAlivio);
    msg.lang = 'es-ES';

    // Al empezar a hablar, nos aseguramos de que esté en modo 'habla'
    this.setVideo('habla');

    msg.onend = () => {
      // --- AQUÍ ESTÁ EL ARREGLO ---
      // Cuando termina la frase, forzamos el vídeo a 'reposo' (o al video actual de la rutina)
      this.setVideo('contenta'); // Esto recalcula qué video debe mostrar (reposo, cardio o fuerza)
      this.playMusic('reposo', 0.2);
      if (this.initialized && !this.misionCumplida) {
        setTimeout(() => { try { this.recognition.start(); } catch (e) { } }, 400);
      }
    };

    this.speech.speak(msg);
  }

  confirmarBorrado() {
    // 3. Purga total de datos
    localStorage.clear();
    this.db = [];
    this.streak = 0;

    document.getElementById('modal-borrado').style.display = "none";
    this.hablar("Memoria BORRADA. Sistemas reiniciados. Espero que sepas lo que haces.");

    // Recargamos la página tras un momento para resetear la UI
    setTimeout(() => location.reload(), 3000);
  }

  // Función auxiliar para normalizar fechas
  getFechaHoy() {
    const d = new Date();
    // Forzamos el formato día/mes/año sin horas
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  }

  /* async importarDatosDesdeNube() {
    const URL_SCRIPT = "https://script.google.com/macros/s/AKfycbxeYcQAHGoDzXD88RgbKX8nzpWWUjxvB1uKRVSH44i_f9nqCC8S4uc9yAfPLWlIFE2d/exec";

    this.hablar("Sincronizando base de datos local con el registro en la nube.");

    try {
      const response = await fetch(URL_SCRIPT);
      const data = await response.json();

      if (data && data.fecha) {
        const hoy = this.getFechaHoy();

        // --- NORMALIZADOR DE FECHA DE NUBE ---
        // Convertimos el ISO (2026-04-29...) a un objeto fecha de JS
        const fechaObjeto = new Date(data.fecha);

        const fechaNubeNormalizada = `${fechaObjeto.getDate()}/${fechaObjeto.getMonth() + 1}/${fechaObjeto.getFullYear()}`;

        console.log(`Comparación Normalizada -> Nube: "${fechaNubeNormalizada}" | Local: "${hoy}"`);

        if (fechaNubeNormalizada === hoy) {
          console.log("¡Coincidencia detectada! Bloqueando sistema...");
          this.misionCumplida = true;
          localStorage.setItem('eva_ultima_mision', hoy);
          this.modoMisionCumplida();
          this.hablar("He confirmado con la nube que tu entrenamiento de hoy está registrado. Descansa.");
          return;
        }

        // 1. Sincronizamos la memoria interna (Array y Variables)
        const registroSincronizado = {
          fecha: data.fecha,
          rutina: data.rutina || "IMPORTADO",
          fatiga: parseInt(data.fatiga) || 0,
          peso: parseFloat(data.peso) || this.lastWeight,
          racha: parseInt(data.racha) || this.streak,
          humor: false
        };

        this.db.push(registroSincronizado);
        this.lastWeight = registroSincronizado.peso;
        this.streak = registroSincronizado.racha;

        // 2. Persistencia en LocalStorage
        localStorage.setItem('eva_db', JSON.stringify(this.db));
        localStorage.setItem('eva_ultimo_peso', this.lastWeight);
        localStorage.setItem('eva_streak', this.streak);

        // 3. ¿LA FECHA IMPORTADA ES HOY? -> ACTIVAR PROTOCOLO FINAL


        // 4. Si la fecha no es hoy, solo actualizamos datos normales
        this.renderRachaUI();
        document.getElementById('input-peso').value = this.lastWeight;
        this.hablar("Base de datos local actualizada correctamente. No hay registros para el día de hoy.");
      }
    } catch (e) {
      console.error("Error de importación:", e);
      this.hablar("Error de conexión. No se han podido volcar los datos remotos.");
    }
  } */

  actualizarTimerVisual(s) {
    document.getElementById('timer-display').innerText = `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  }

  verificarSiMisionCompletadaHoy() {
    const hoy = new Date().toLocaleDateString();
    return this.db.some(r => r.fecha.split(',')[0] === hoy);
  }

  renderRachaUI() {
    const rachaDisplay = document.getElementById('display-racha');
    const rangoDisplay = document.getElementById('display-rango');

    if (rachaDisplay) rachaDisplay.innerText = `${this.streak} DÍAS`;


    // --- CAMBIO DE COLOR SEGÚN PROTECCIÓN ---
    if (this.streak >= 7) {
      rachaDisplay.style.color = "#00d4ff"; // Azul tech brillante (Protegido)
      rachaDisplay.style.textShadow = "0 0 10px rgba(0, 212, 255, 0.5)";
      this.hablar("¡Racha de " + this.streak + " días! Estás en zona segura. Sigue así para mantener tu progreso protegido.", 'level_up');

    } else {
      rachaDisplay.style.color = "#888"; // Gris (En prueba)
      rachaDisplay.style.textShadow = "none";
    }



    let rango = "RECLUTA";
    let color = "var(--blue-tech)";




    if (this.streak >= 15) {
      rango = "LEYENDA TITANIO";
      color = "#e5e4e2"; // Color platino/titanio
      this.setVideo('exito');
    } else if (this.streak >= 10) {
      rango = "COMANDANTE ORO";
      color = "#ffd700"; // Oro
      this.setVideo('exito');
    } else if (this.streak >= 5) {
      rango = "OPERADOR PLATA";
      color = "#c0c0c0"; // Plata
      this.setVideo('exito');
    }

    if (rangoDisplay) {
      rangoDisplay.innerText = rango;
      rangoDisplay.style.color = color;
      rangoDisplay.style.textShadow = `0 0 10px ${color}`;
    }
  }

  actualizarRacha() {

    // --- DETECCIÓN DE HITOS SECRETOS ---
    if (this.streak === 5) {
      this.activarVideoSecreto('stallone', 'rocky.mp3', "Nivel Medio alcanzado. Sylvester te observa, SIGUE ENTRENANDO DURO .");
    } else if (this.streak === 10) {
      this.activarVideoSecreto('cena', 'Peacemaker.mp3', "¡BUEN NIVEL! tU NIVEL DE ESFUERZO SE EMPIEZA A NOTAR.");
    } else if (this.streak === 15) {
      this.activarVideoSecreto('arnold', 'arnold.mp3', "Nivel Leyenda. Arnold aprueba tu disciplina.");
    }
  }


  activarVideoSecreto(videoFile, musicaFile, mensaje) {
    // 1. EVA lo anuncia
    this.hablar(mensaje);

    setTimeout(() => {
      // 2. Cambiamos el video manualmente (saltándonos el pool normal)
      const v = document.getElementById('eva-display');
      v.src = `assets/videos/${videoFile}.mp4`;
      v.loop = true;
      v.play();

      // 3. Cambiamos la música por la especial
      this.bgMusic.src = `assets/audio/${musicaFile}`;
      this.bgMusic.volume = 0.6;
      this.bgMusic.play();

      // 4. Volvemos al estado normal tras 30 segundos de motivación
      setTimeout(() => {
        this.bgMusic.volume = 0.4;
        this.updateCalendar(); // Esto resetea el video a reposo
      }, 30000);
    }, 2000);
  }

  playMusic(tipo, volumen = 0.4) {
    const pool = this.library.musica[tipo];
    if (pool && pool.length > 0) {
      const seleccion = pool[Math.floor(Math.random() * pool.length)];

      if (this.bgMusic.src.indexOf(seleccion) === -1) {
        this.bgMusic.src = seleccion;
        // Guardamos el volumen actual para recuperarlo luego
        this.currentMusicVolume = volumen;
        this.bgMusic.volume = volumen;
        this.bgMusic.play().catch(e => console.log("Error Audio:", e));
      }
    }
  }

  setVideo(tipo) {
    const v = document.getElementById('eva-display');
    let tipoReal = tipo;
    if (tipo === 'reposo' && this.estaEnojada) {
      tipoReal = 'reposo_enojada';
    }

    const pool = this.library.vids[tipoReal];

    if (pool && pool.length > 0) {
      const randomIndex = Math.floor(Math.random() * pool.length);
      const videoName = pool[randomIndex];

      const fullPath = `assets/videos/${videoName}`;

      console.log("Intentando cargar vídeo:", fullPath);

      v.src = fullPath;
      v.load();
      v.play().catch(e => {
        console.error("Error al reproducir vídeo:", e);
        v.muted = true;
        v.play();
      });
    }
  } // Cierra setVideo

  // --- 2. PROTOCOLOS DE ENERGÍA ---
  async solicitarWakeLock() {
    try {
      if ('wakeLock' in navigator) {
        this.wakeLock = await navigator.wakeLock.request('screen');
        console.log("🛰️ Wake Lock activado.");
      }
    } catch (err) {
      console.error("❌ Fallo en Wake Lock:", err);
    }
  }

  liberarWakeLock() {
    if (this.wakeLock !== null) {
      this.wakeLock.release().then(() => {
        this.wakeLock = null;
        console.log("💤 Wake Lock liberado.");
      });
    }
  }

} // <--- ESTA ES LA LLAVE QUE CIERRA LA CLASE EVASystem


// Instancia global
// Instancia global única
const EVA = new EVASystem();

// Función de inicio de sesión que usa el token encriptado
EVA.iniciarSesion = async function () {
  const nombre = await this.solicitarIdentidad();

  // Generar y guardar el token encriptado (Base64)
  const token = btoa(JSON.stringify({ user: nombre, date: Date.now() }));
  localStorage.setItem('eva_session', token);

  document.getElementById('mensaje-info').innerText = `USUARIO: ${nombre}`;
  this.iniciarEntrenamiento();
};

// Carga inicial al abrir la app
document.addEventListener('DOMContentLoaded', () => {
 // EVA.animarBienvenida();

  // Verificar si ya hay una sesión activa
  const tokenGuardado = localStorage.getItem('eva_session');
  if (tokenGuardado) {
    const data = JSON.parse(atob(tokenGuardado));
    //  document.getElementById('mensaje-info').innerText = `USUARIO: ${data.user}`;
    // Opcional: Deshabilitar el botón de login aquí
    const btnInfoUsuario = document.getElementById('btn-info-usuario');
    btnInfoUsuario.innerText = `INFO USUARIO: ${data.user}`;
    btnInfoUsuario.style.display = "block";
    const btnIniciar = document.getElementById('btn-iniciar');
    btnIniciar.innerText = " INICIAR SISTEMA OPERATIVO";
    btnIniciar.onclick = () => {
      EVA.init();
    };
  }
});