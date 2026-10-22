// TEMA: DeltA S · Agua segura con energía solar (Rally Latinoamericano de Innovación 2026, desafío 08).
// El héroe es el prototipo, que se arma de a poco a lo largo del recorrido (del parque solar al campo):
//   0 descarte   → solo el panel, apagado, sobre una pila de paneles de descarte (parque solar de noche)
//   1 energia    → el panel se enciende y aparece el medidor de energía (≈80 %); al lado, el pozo y la gota con As
//   2 triz       → se suman el controlador, los cables y la celda de electrocoagulación (campo con molino)
//   3 validar    → todo el equipo desarmado, con lo que falta validar
//   4 cierre     → el prototipo entero: pozo → tanque de la casa → celda → filtro → agua tratada
// Colores: '#rrggbb' o variables de la paleta ('--acento'). Ver references/modelado-clay.md de la skill.

const ALTO_PEDESTAL = 0.32;

// Qué piezas del héroe se ven en cada estación y cuánto se corre el conjunto para quedar centrado.
const ARMADO = [
  { corrimiento: 0.85, piezas: ['panel'] },
  { corrimiento: 0.72, piezas: ['panel', 'medidor'] },
  { corrimiento: 0.55, piezas: ['panel', 'cable', 'controlador', 'celda', 'electrodos'] },
  { corrimiento: -0.12, piezas: ['panel', 'celda', 'electrodos', 'barros', 'filtro', 'sensor', 'tanque'] },
  { corrimiento: -0.12, piezas: ['panel', 'cable', 'controlador', 'celda', 'electrodos', 'barros', 'filtro', 'sensor', 'tanque', 'tuberia'] },
];
// Presencia de cada estación en el último cuadro (la escriben las estaciones, la lee el héroe para saber dónde está).
const presencias = ARMADO.map(() => 0);

// Textura de las celdas del panel (como en el video: 3 × 2 celdas grandes con líneas claras).
let texturaPanel = null;
const celdasPanel = (kit) => (texturaPanel ??= kit.lienzo(512, 344, (ctx, w, h) => {
  ctx.fillStyle = '#1f3b2d';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(160, 190, 165, 0.18)';
  ctx.lineWidth = 2;
  for (let i = 1; i < 12; i++) { ctx.beginPath(); ctx.moveTo((i * w) / 12, 0); ctx.lineTo((i * w) / 12, h); ctx.stroke(); }
  for (let j = 1; j < 8; j++) { ctx.beginPath(); ctx.moveTo(0, (j * h) / 8); ctx.lineTo(w, (j * h) / 8); ctx.stroke(); }
  ctx.strokeStyle = '#7d9a85';
  ctx.lineWidth = 7;
  for (let i = 1; i < 3; i++) { ctx.beginPath(); ctx.moveTo((i * w) / 3, 0); ctx.lineTo((i * w) / 3, h); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();
}));

/** Un panel solar: marco claro y celdas. Centro en el origen, acostado en el plano XY (frente hacia +z). */
function panelSolar(kit, matCeldas, { ancho = 1.5, alto = 1.0, marco = '#cfc6b2' } = {}) {
  const { THREE } = kit;
  const g = new THREE.Group();
  g.add(kit.caja(ancho + 0.07, alto + 0.07, 0.07, marco, 0, -(alto + 0.07) / 2, 0, 0.025));
  const celdas = kit.malla(new THREE.PlaneGeometry(ancho, alto), matCeldas, 0, 0, 0.037);
  celdas.castShadow = false;
  g.add(celdas);
  return g;
}

/** Vidrio esmerilado y agua: translúcidos, sin sombra. */
const translucido = (kit, c, opacidad) => new kit.THREE.MeshStandardMaterial({ color: kit.color(c), transparent: true, opacity: opacidad, roughness: 0.25, depthWrite: false });

const tema = {
  alturaHeroe: 1.9,
  ajustes: { niebla: { cerca: 16, lejos: 38 } },

  crearHeroe(kit, color) {
    const { THREE, V } = kit;
    const h = kit.heroe(color);
    const carcasa = h.material; // toma el colorway de cada estación: soportes, bases y marcos del equipo
    const vidrio = translucido(kit, '#f4f8ef', 0.3);

    // Cada parte escala desde su propio centro (pivote), no desde el centro del héroe.
    const pivotes = {};
    const parte = (nombre, desarme, centro, giro) => {
      const pieza = h.pieza(nombre, desarme, giro);
      const pivote = new THREE.Group();
      pivote.position.set(...centro);
      const contenido = new THREE.Group();
      contenido.position.set(-centro[0], -centro[1], -centro[2]);
      pivote.add(contenido);
      pieza.add(pivote);
      pivotes[nombre] = pivote;
      return contenido;
    };

    // ---------- Panel de descarte con su soporte ----------
    const matCeldas = new THREE.MeshStandardMaterial({ map: celdasPanel(kit), emissive: 0xffffff, emissiveMap: celdasPanel(kit), emissiveIntensity: 0, roughness: 0.38, metalness: 0.05 });
    const panel = parte('panel', [-0.35, 0.35, -0.15], [-0.85, 1.0, -0.4]);
    const placa = panelSolar(kit, matCeldas);
    placa.position.set(-0.85, 1.4, -0.35);
    placa.rotation.x = -0.55;
    panel.add(placa);
    panel.add(kit.caja(0.8, 0.07, 0.55, carcasa, -0.85, 0, -0.45, 0.03));
    panel.add(kit.varilla(V(-0.85, 0.07, -0.45), V(-0.85, 1.36, -0.42), 0.05, carcasa));
    panel.add(kit.varilla(V(-1.3, 0.07, -0.45), V(-1.2, 1.05, -0.2), 0.03, carcasa));
    panel.add(kit.varilla(V(-0.4, 0.07, -0.45), V(-0.5, 1.05, -0.2), 0.03, carcasa));

    // ---------- Medidor de energía: 5 segmentos, se encienden 4 (≈80 %) ----------
    const medidor = parte('medidor', [0, 0, 0], [0.15, 0.6, -0.1]);
    medidor.add(kit.caja(0.42, 0.08, 0.36, carcasa, 0.15, 0, -0.1, 0.03));
    const segmentos = [0, 1, 2, 3, 4].map((k) => {
      const m = new THREE.MeshStandardMaterial({ color: kit.color('--piedra'), emissive: kit.color('--acento'), emissiveIntensity: 0, roughness: 0.8 });
      const s = kit.caja(0.28, 0.17, 0.24, m, 0.15, 0.12 + k * 0.21, -0.1, 0.05);
      medidor.add(s);
      return m;
    });
    const apagado = kit.color('--piedra'), encendido = kit.color('--acento');

    // ---------- Controlador (semáforo verde, amarillo, rojo) ----------
    const controlador = parte('controlador', [0, 0.55, 0], [0.2, 1.23, -0.25]);
    controlador.add(kit.caja(0.3, 0.06, 0.3, carcasa, 0.2, 0, -0.3, 0.02));
    controlador.add(kit.varilla(V(0.2, 0.06, -0.3), V(0.2, 1.06, -0.3), 0.035, carcasa));
    controlador.add(kit.caja(0.48, 0.36, 0.17, '--claro', 0.2, 1.05, -0.27, 0.05));
    [['#2f8a5b', 0.6], ['#c9c2b2', 0], ['#c9c2b2', 0]].forEach(([c, brillo], i) => {
      const luz = kit.esfera(0.045, kit.clay(c, { emissive: kit.color(c), emissiveIntensity: brillo }), 0.08 + i * 0.12, 1.23, -0.18);
      luz.scale.z = 0.5;
      controlador.add(luz);
    });

    // ---------- Cables del panel al controlador y del controlador a los electrodos ----------
    const cable = parte('cable', [0, 0.3, 0], [0, 1.0, 0]);
    const recorridos = [
      [[-0.25, 0.97, -0.12], [-0.15, 0.8, -0.16], [-0.05, 0.9, -0.24], [0.0, 1.14, -0.27]],
      [[0.12, 1.06, -0.24], [0.08, 1.12, 0.0], [0.03, 1.02, 0.26], [0.02, 0.95, 0.3]],
      [[0.3, 1.06, -0.24], [0.32, 1.12, 0.0], [0.32, 1.02, 0.26], [0.31, 0.95, 0.3]],
    ];
    const curvas = recorridos.map((p) => {
      cable.add(kit.tubo(p, 0.022, '--acento'));
      return new THREE.CatmullRomCurve3(p.map((q) => V(...q)));
    });
    // Pulsos de energía que viajan por los cables.
    const matPulso = kit.clay('#fff3d6', { emissive: kit.color('--acento'), emissiveIntensity: 1.4 });
    const pulsos = curvas.flatMap((curva, i) => [0, 1, 2].map((k) => {
      const p = kit.esfera(0.034, matPulso);
      p.castShadow = false;
      cable.add(p);
      return { p, curva, fase: k / 3 + i * 0.13 };
    }));

    // ---------- Celda de electrocoagulación ----------
    const celda = parte('celda', [0, 0, 0], [0.15, 0.45, 0.3]);
    celda.add(kit.caja(1.02, 0.08, 0.64, carcasa, 0.15, 0, 0.3, 0.03));
    celda.add(kit.caja(0.95, 0.72, 0.56, vidrio, 0.15, 0.08, 0.3, 0.05));
    const agua = kit.caja(0.89, 0.55, 0.5, translucido(kit, '--agua', 0.75), 0.15, 0.1, 0.3, 0.03);
    agua.castShadow = false;
    celda.add(agua);
    for (const x of [-0.31, 0.61]) celda.add(kit.caja(0.06, 0.06, 0.6, carcasa, x, 0.78, 0.3, 0.02));
    const floculos = Array.from({ length: 12 }, (_, i) => {
      const f = kit.esfera(0.03 + (i % 3) * 0.008, '--hierro', 0, 0, 0);
      f.castShadow = false;
      celda.add(f);
      return { f, x: -0.2 + ((i * 0.37) % 0.75), z: 0.12 + ((i * 0.53) % 0.36), fase: i * 0.71 };
    });
    // Electrodos de hierro (pieza aparte: se levantan al desarmar).
    const electrodos = parte('electrodos', [0, 0.65, 0], [0.16, 0.6, 0.3]);
    for (const x of [0.02, 0.31]) {
      electrodos.add(kit.caja(0.07, 0.8, 0.4, '--hierro', x, 0.16, 0.3, 0.02));
      electrodos.add(kit.cilindro(0.03, 0.06, '--oscuro', x, 0.95, 0.3));
    }

    // ---------- Barros con arsénico: recipiente cerrado ----------
    const barros = parte('barros', [-0.35, 0.15, 0.1], [-0.6, 0.18, 0.45]);
    barros.add(kit.torno([[0, 0], [0.16, 0], [0.19, 0.3], [0, 0.3]], '#5b4a35'));
    barros.children.at(-1).position.set(-0.6, 0, 0.45);
    barros.add(kit.cilindro(0.21, 0.05, '#46392a', -0.6, 0.3, 0.45));
    barros.add(kit.varilla(V(-0.33, 0.14, 0.38), V(-0.44, 0.14, 0.42), 0.025, '--oscuro'));

    // ---------- Filtro de arena ----------
    const filtro = parte('filtro', [0.2, 0.25, 0], [0.95, 0.45, 0.3]);
    filtro.add(kit.caja(0.46, 0.08, 0.46, carcasa, 0.95, 0, 0.3, 0.03));
    filtro.add(kit.caja(0.38, 0.78, 0.38, vidrio, 0.95, 0.08, 0.3, 0.05));
    filtro.add(kit.caja(0.3, 0.1, 0.3, '#b9a37c', 0.95, 0.1, 0.3, 0.03));
    filtro.add(kit.caja(0.3, 0.3, 0.3, '--arena-filtro', 0.95, 0.2, 0.3, 0.04));

    // ---------- Sensor de arsénico a la salida del filtro ----------
    const sensor = parte('sensor', [0.25, 0.55, 0], [1.26, 0.2, 0.3]);
    sensor.add(kit.cilindro(0.065, 0.24, '--claro', 1.26, 0.08, 0.3));
    const ojo = kit.esfera(0.03, kit.clay('#5fb3d9', { emissive: kit.color('#5fb3d9'), emissiveIntensity: 0.9 }), 1.26, 0.26, 0.37);
    sensor.add(ojo);

    // ---------- Tanque de agua tratada con canilla ----------
    const tanque = parte('tanque', [0.45, 0, -0.05], [1.62, 0.5, 0.3]);
    tanque.add(kit.caja(0.58, 0.08, 0.58, carcasa, 1.62, 0, 0.3, 0.03));
    tanque.add(kit.caja(0.5, 0.95, 0.5, vidrio, 1.62, 0.08, 0.3, 0.05));
    const tratada = kit.caja(0.44, 0.7, 0.44, translucido(kit, '--agua-tratada', 0.8), 1.62, 0.1, 0.3, 0.03);
    tratada.castShadow = false;
    tanque.add(tratada);
    tanque.add(kit.varilla(V(1.62, 0.25, 0.55), V(1.62, 0.25, 0.68), 0.03, '--claro'));
    tanque.add(kit.varilla(V(1.62, 0.25, 0.68), V(1.62, 0.16, 0.72), 0.028, '--claro'));

    // ---------- Tuberías y fibra óptica (solo en el prototipo completo) ----------
    const tuberia = parte('tuberia', [0, 0, 0], [0.6, 0.6, 0]);
    tuberia.add(kit.varilla(V(0.62, 0.2, 0.3), V(0.76, 0.2, 0.3), 0.03, '--oscuro'));
    tuberia.add(kit.varilla(V(1.14, 0.2, 0.3), V(1.37, 0.2, 0.3), 0.03, '--oscuro'));
    tuberia.add(kit.tubo([[1.26, 0.32, 0.3], [1.2, 0.8, 0.1], [0.75, 1.2, -0.15], [0.44, 1.2, -0.25]], 0.012, '--oscuro'));

    // ---------- Armado progresivo ----------
    let objetivo = 0;
    const corrimiento = new THREE.Vector3(ARMADO[0].corrimiento, 0, 0);
    const escalas = Object.fromEntries(Object.keys(pivotes).map((n) => [n, ARMADO[0].piezas.includes(n) ? 1 : 0]));
    let brilloPanel = 0, nivel = 0;
    const { damp } = THREE.MathUtils;
    const aplicar = () => {
      for (const [n, p] of Object.entries(pivotes)) {
        const s = escalas[n];
        p.scale.setScalar(Math.max(s, 0.0001));
        p.visible = s > 0.01;
        h.piezas[n].position.x += corrimiento.x;
      }
    };
    aplicar();

    h.actualizar = (dt, t) => {
      // La estación con más presencia en el cuadro anterior decide qué piezas se ven.
      let mejor = -1, maximo = 0.001;
      presencias.forEach((p, i) => { if (p > maximo) { maximo = p; mejor = i; } });
      presencias.fill(0);
      if (mejor >= 0) objetivo = mejor;
      const A = ARMADO[objetivo];
      corrimiento.x = damp(corrimiento.x, A.corrimiento, 4, dt);
      for (const n of Object.keys(escalas)) escalas[n] = damp(escalas[n], A.piezas.includes(n) ? 1 : 0, 6, dt);
      aplicar();

      // El panel "revive" después del descarte.
      brilloPanel = damp(brilloPanel, objetivo === 0 ? 0 : 0.32, 2, dt);
      matCeldas.emissiveIntensity = brilloPanel;

      // El medidor se llena de a un segmento hasta el 80 %.
      nivel = objetivo === 1 ? Math.min(nivel + dt * 2.2, 4) : Math.max(nivel - dt * 4, 0);
      segmentos.forEach((m, k) => {
        const u = THREE.MathUtils.clamp(nivel - k, 0, 1);
        m.color.copy(apagado).lerp(encendido, u);
        m.emissiveIntensity = u * 0.45;
      });

      for (const { p, curva, fase } of pulsos) curva.getPointAt((t * 0.45 + fase) % 1, p.position);
      for (const { f, x, z, fase } of floculos) {
        f.position.set(0.15 + x - 0.37 + Math.sin(t * 0.7 + fase) * 0.03, 0.18 + ((t * 0.06 + fase * 0.3) % 0.45), z + 0.04);
      }
      ojo.material.emissiveIntensity = 0.6 + Math.sin(t * 3) * 0.3;
    };
    return h;
  },

  estaciones: [
    // 0. Descarte: parque solar de noche; el panel apagado levita sobre una pila de paneles descartados.
    {
      nombre: 'descarte', tema: 'oscuro', encuadre: 'editorial', color: '--piedra', escala: 1.05, balanceo: 0.45,
      construir(g, kit) {
        const { THREE } = kit;
        g.add(kit.pisoSombra(30, 20));
        kit.foco(g, 0, 6.2, 0, { intensidad: 0.85, radio: 2.1 });
        // Filas del parque solar al fondo, de bajo contraste.
        for (const [z, x0, x1] of [[-4.6, 1.2, 7], [-7, 0.5, 7], [-9.4, -1, 7]]) {
          const fila = new THREE.Group();
          const largo = x1 - x0;
          const placa = kit.caja(largo, 1.3, 0.06, '#18291f', 0, -0.65, 0, 0.02);
          placa.rotation.x = -0.9;
          placa.position.y = 1.0;
          fila.add(placa);
          for (let x = -largo / 2 + 0.6; x < largo / 2; x += 2.4) fila.add(kit.varilla(kit.V(x, 0, 0.1), kit.V(x, 0.95, 0), 0.04, '#16261d'));
          fila.position.set((x0 + x1) / 2, 0, z);
          g.add(kit.fondo(fila));
        }
        // Pila de paneles de descarte (las celdas apagadas, grisáceas).
        const matPila = new THREE.MeshStandardMaterial({ map: celdasPanel(kit), color: 0x8f9a92, roughness: 0.75 });
        const pila = new THREE.Group();
        for (let k = 0; k < 5; k++) {
          const p = panelSolar(kit, matPila, { ancho: 1.6, alto: 1.05, marco: '#8d8676' });
          p.rotation.set(-Math.PI / 2, 0, Math.sin(k * 2.3) * 0.18);
          p.position.set(Math.sin(k * 1.7) * 0.08, 0.035 + k * 0.085, Math.cos(k * 1.3) * 0.06);
          pila.add(p);
        }
        for (const [x, rz] of [[-1.05, 0.25], [1.15, -0.3]]) {
          const p = panelSolar(kit, matPila, { ancho: 1.6, alto: 1.05, marco: '#8d8676' });
          p.rotation.set(-0.35, x > 0 ? -0.5 : 0.45, rz);
          p.position.set(x, 0.55, -0.85);
          pila.add(p);
        }
        g.add(pila);
        const ancla = new THREE.Object3D();
        ancla.position.set(0, 0.46 + kit.LEVITA, 0);
        g.add(ancla);
        return { ancla };
      },
    },
    // 1. Energía: el panel se enciende y aparece el medidor; atrás, el pozo y la gota con arsénico.
    {
      nombre: 'energia', tema: 'claro', encuadre: 'editorial', color: '--color-1', escala: 0.95, balanceo: 0.35,
      construir(g, kit) {
        const { THREE } = kit;
        g.add(kit.pisoSombra(30, 20));
        g.add(kit.pedestal('--arena', 1.35, ALTO_PEDESTAL));
        // Últimas filas del parque solar, a lo lejos.
        for (const [z, x0, x1] of [[-6.5, 1.5, 7], [-8.8, 1, 7]]) {
          const placa = kit.caja(x1 - x0, 1.3, 0.06, '#9db29b', (x0 + x1) / 2, 0.35, z, 0.02);
          placa.rotation.x = -0.9;
          g.add(kit.fondo(placa));
        }
        for (const [x, z, r, c] of [[4, -12, 3.5, '#e8d8ab']]) {
          const colina = kit.esfera(r, c, x, -r * 0.6, z);
          colina.scale.y = 0.5;
          g.add(kit.fondo(colina));
        }
        // Pozo: caño que entra en la tierra con la bomba arriba (como en el video).
        const pozo = new THREE.Group();
        const monticulo = kit.esfera(0.55, '#c9b48a', 0, 0, 0);
        monticulo.scale.y = 0.3;
        pozo.add(monticulo);
        pozo.add(kit.cilindro(0.08, 0.7, '--claro', 0, 0, 0));
        pozo.add(kit.caja(0.46, 0.3, 0.36, '--claro', 0, 0.62, 0, 0.06));
        pozo.position.set(2.0, 0, -1.1);
        g.add(pozo);
        // Gota de agua de pozo con arsénico adentro.
        const gota = new THREE.Group();
        gota.add(kit.torno([[0, 0], [0.24, 0.04], [0.36, 0.2], [0.36, 0.38], [0.26, 0.62], [0.11, 0.86], [0, 1.0]], translucido(kit, '--agua', 0.62)));
        for (const [x, y, z] of [[-0.1, 0.25, 0.05], [0.12, 0.33, -0.04], [0.0, 0.47, 0.08], [-0.05, 0.17, -0.12], [0.1, 0.16, 0.1]]) {
          gota.add(kit.esfera(0.06, '--arsenico', x, y, z));
        }
        gota.position.set(2.0, 1.45, -1.1);
        gota.scale.setScalar(1.1);
        g.add(kit.flotante(gota, { amplitud: 0.12, periodo: 4.5, giro: 0.3 }));
        const anclaGota = new THREE.Object3D();
        anclaGota.position.set(2.0, 0, -0.75);
        g.add(anclaGota);
        const ancla = new THREE.Object3D();
        ancla.position.set(0, ALTO_PEDESTAL + kit.LEVITA, 0);
        g.add(ancla);
        return { ancla, anclas: { gota: anclaGota } };
      },
    },
    // 2. TRIZ: el campo con alambrado y molino; el panel se conecta con la celda.
    {
      nombre: 'triz', tema: 'claro', encuadre: 'editorial', color: '--color-1', escala: 0.95, balanceo: 0.28,
      construir(g, kit) {
        const { THREE, V } = kit;
        g.add(kit.pisoSombra(30, 20));
        g.add(kit.caja(2.9, 0.16, 1.7, '--arena', 0, 0, 0, 0.06));
        for (const [x, z, r, c] of [[4, -12, 3.5, '#ddd8aa']]) {
          const colina = kit.esfera(r, c, x, -r * 0.6, z);
          colina.scale.y = 0.5;
          g.add(kit.fondo(colina));
        }
        // Alambrado.
        const alambrado = new THREE.Group();
        for (let x = 0; x <= 7; x += 0.9) alambrado.add(kit.cilindro(0.05, 0.85, '#b39a70', x, 0, 0));
        for (const y of [0.45, 0.72]) alambrado.add(kit.varilla(V(0, y, 0), V(7.2, y, 0), 0.008, '#8c7a5c'));
        alambrado.position.set(0.2, 0, -3.6);
        alambrado.scale.x = 0.95;
        g.add(alambrado);
        // Molino de campo.
        const molino = new THREE.Group();
        for (const [x, z] of [[-0.55, -0.55], [0.55, -0.55], [-0.55, 0.55], [0.55, 0.55]]) molino.add(kit.varilla(V(x, 0, z), V(0, 3.5, 0), 0.04, '#a99f88'));
        const rotor = new THREE.Group();
        for (let i = 0; i < 12; i++) {
          const pala = kit.caja(0.14, 0.7, 0.02, '#c8bfa8', 0, 0.12, 0, 0.01);
          const brazo = new THREE.Group();
          brazo.add(pala);
          brazo.rotation.z = (i / 12) * Math.PI * 2;
          rotor.add(brazo);
        }
        rotor.add(kit.esfera(0.1, '#8c836e'));
        rotor.position.set(0, 3.6, 0.15);
        molino.add(rotor);
        molino.add(kit.caja(0.9, 0.35, 0.03, '#c8bfa8', 0, 3.42, -0.55, 0.01));
        molino.position.set(3.0, 0, -7.5);
        g.add(molino);
        const ancla = new THREE.Object3D();
        ancla.position.set(0, 0.16 + kit.LEVITA, 0);
        g.add(ancla);
        return {
          ancla,
          actualizar(dt) { rotor.rotation.z -= dt * 0.8; },
        };
      },
    },
    // 3. Validar: el equipo desarmado con lo que falta probar; una mesa con tubos de ensayo.
    {
      nombre: 'validar', tema: 'claro', encuadre: 'editorial', color: '--color-3', escala: 0.82, balanceo: 0.2, desarmar: true,
      construir(g, kit) {
        const { THREE, V } = kit;
        g.add(kit.pisoSombra(30, 20));
        g.add(kit.caja(3.6, 0.16, 1.8, '--arena', 0, 0, 0, 0.06));
        for (const [x, z, r, c] of [[4, -12, 3.5, '#ddd6aa']]) {
          const colina = kit.esfera(r, c, x, -r * 0.6, z);
          colina.scale.y = 0.5;
          g.add(kit.fondo(colina));
        }
        // Mesa de ensayos con gradilla y tubos.
        const mesa = new THREE.Group();
        mesa.add(kit.caja(1.5, 0.08, 0.8, '#c9ad7f', 0, 0.82, 0, 0.03));
        for (const [x, z] of [[-0.65, -0.3], [0.65, -0.3], [-0.65, 0.3], [0.65, 0.3]]) mesa.add(kit.varilla(V(x, 0, z), V(x, 0.82, z), 0.035, '#a8916a'));
        mesa.add(kit.caja(0.8, 0.1, 0.25, '--claro', -0.15, 0.9, 0, 0.03));
        ['--agua', '--agua-tratada', '#d9a46a', '--agua'].forEach((c, i) => {
          const x = -0.45 + i * 0.2;
          mesa.add(kit.cilindro(0.05, 0.42, translucido(kit, '#ffffff', 0.45), x, 0.9, 0));
          mesa.add(kit.cilindro(0.042, 0.2 + (i % 2) * 0.08, c, x, 0.91, 0));
        });
        mesa.add(kit.caja(0.4, 0.03, 0.3, '#f6f0e2', 0.45, 0.9, 0.05, 0.01));
        mesa.position.set(2.4, 0, -4.2);
        g.add(mesa);
        const ancla = new THREE.Object3D();
        ancla.position.set(0, 0.16 + kit.LEVITA, 0);
        g.add(ancla);
        return { ancla };
      },
    },
    // 4. Cierre: de noche en el campo, el prototipo entero conectado al pozo y al tanque de la casa.
    {
      nombre: 'cierre', tema: 'oscuro', encuadre: 'centro', color: '--color-1', escala: 0.8, subirMira: 0.45,
      apoyada: true, quieta: true, giroReposo: 0,
      construir(g, kit) {
        const { THREE, V } = kit;
        g.add(kit.pisoSombra(30, 20));
        g.add(kit.caja(3.2, 0.14, 1.7, '--piso-oscuro', 0, 0, 0, 0.05));
        kit.foco(g, 0, 6.2, 0, { intensidad: 0.8, radio: 2.3 });
        // Pozo con la bomba, a la izquierda.
        const pozo = new THREE.Group();
        pozo.add(kit.cilindro(0.08, 0.7, '--claro-suave', 0, 0, 0));
        pozo.add(kit.caja(0.46, 0.3, 0.36, '--claro-suave', 0, 0.62, 0, 0.06));
        pozo.position.set(-3.1, 0, 0.2);
        g.add(pozo);
        // Tanque elevado de la casa.
        const torre = new THREE.Group();
        for (const [x, z] of [[-0.35, -0.3], [0.35, -0.3], [-0.35, 0.3], [0.35, 0.3]]) torre.add(kit.varilla(V(x, 0, z), V(x * 0.8, 1.5, z * 0.8), 0.035, '#5c7564'));
        torre.add(kit.caja(0.8, 0.06, 0.7, '#5c7564', 0, 1.5, 0, 0.02));
        torre.add(kit.caja(0.66, 0.6, 0.6, '--color-1', 0, 1.56, 0, 0.1));
        torre.position.set(-2.3, 0, -0.9);
        g.add(torre);
        // Casa al fondo, con la ventana encendida.
        const casa = new THREE.Group();
        casa.add(kit.caja(2.2, 1.3, 1.6, '#30493b', 0, 0, 0, 0.05));
        for (const s of [-1, 1]) {
          const techo = kit.caja(1.45, 0.08, 1.8, '#3e5a49', s * 0.55, 1.62, 0, 0.03);
          techo.rotation.z = -s * 0.55;
          casa.add(techo);
        }
        casa.add(kit.caja(0.5, 0.4, 0.04, kit.clay('#f3c97a', { emissive: kit.color('#e9a23b'), emissiveIntensity: 0.9 }), 0.45, 0.5, 0.8, 0.02));
        casa.position.set(3.6, 0, -3.4);
        g.add(kit.fondo(casa));
        // Cañería punteada: pozo → tanque elevado → celda (como en el video), con agua que corre.
        const recorrido = new THREE.CatmullRomCurve3([V(-3.1, 0.75, 0.2), V(-3.0, 1.95, -0.2), V(-2.6, 2.05, -0.9), V(-2.0, 1.4, -0.9), V(-1.9, 0.25, -0.3), V(-0.9, 0.22, 0.2), V(-0.4, 0.3, 0.25)], false, 'catmullrom', 0.2);
        const tramos = 46;
        for (let i = 0; i < tramos; i += 2) {
          const a = recorrido.getPointAt(i / tramos), b = recorrido.getPointAt((i + 1) / tramos);
          g.add(kit.varilla(a, b, 0.035, '#5c7564'));
        }
        const matGota = kit.clay('--agua-tratada', { emissive: kit.color('--agua-tratada'), emissiveIntensity: 0.6 });
        const gotas = Array.from({ length: 8 }, (_, i) => {
          const gota = kit.esfera(0.05, matGota);
          gota.castShadow = false;
          g.add(gota);
          return { gota, fase: i / 8 };
        });
        const anclas = {};
        for (const [nombre, x, y, z] of [['pozo', -2.9, 0.75, 0.2], ['casa', -2.3, 0, -0.5]]) {
          const a = new THREE.Object3D();
          a.position.set(x, y, z);
          g.add(a);
          anclas[nombre] = a;
        }
        const ancla = new THREE.Object3D();
        ancla.position.set(0, 0.14, 0);
        g.add(ancla);
        return {
          ancla, anclas,
          actualizar(dt, t) { for (const { gota, fase } of gotas) recorrido.getPointAt((t * 0.12 + fase) % 1, gota.position); },
        };
      },
    },
  ],
};

// Cada estación avisa su presencia en cada cuadro: así el héroe sabe qué piezas mostrar.
tema.estaciones.forEach((e, i) => {
  const construir = e.construir;
  e.construir = (g, kit) => {
    const r = construir(g, kit) ?? {};
    const propia = r.actualizar;
    r.actualizar = (dt, t, presencia) => { presencias[i] = presencia; propia?.(dt, t, presencia); };
    return r;
  };
});

export default tema;
