export const SHOP_PERSONAS = {
  lia: {
    name: 'Maela',
    title: 'La Candilera',
    background: 'tienda/fondo-maela.webp',
    portrait: 'heroes/maela.webp',
    lines: {
      greet: [
        'Soy Maela. Acércate: aquí hasta las brasas encuentran repuesto.',
        'Una luz para el camino, Lía. Y un precio para mantenerla encendida.',
      ],
      hint: ['Un farol pequeño también revela una gran salida.', 'Te presto claridad. El aceite va incluido.'],
      moves3: ['Un poco de aire para esa brasa.', 'A veces basta con un instante más.'],
      moves: ['Paciencia de fragua. Lleva una buena reserva.', 'Con esto tendrás margen para volver a intentarlo.'],
      redo: ['Sacudimos la ceniza. La llama empieza de nuevo.'],
      skip: ['Hay puertas que conviene dejar atrás.'],
      poor: ['Guarda lo que tienes. La fragua seguirá aquí.', 'Todavía no alcanza para esta luz.'],
      bought: ['Que esta luz te acompañe.', 'Buen trato. Cuida esa brasa.'],
      decline: ['Piénsalo al calor del farol.'],
      nothing: ['La fragua aún está intacta. Haz tu primer movimiento.'],
    },
  },
  jean: {
    name: 'Don Dublón',
    title: 'El Mercader',
    background: 'tienda/fondo-tienda.webp',
    portrait: 'heroes/vendedor.webp',
  },
  van: {
    name: 'Azhar',
    title: 'El Tasador de Runas',
    background: 'tienda/fondo-azhar.webp',
    portrait: 'heroes/azhar.webp',
    lines: {
      greet: [
        'Azhar, a tu servicio. Todo tiene un precio; los nombres, dos.',
        'Juth, traes páginas en blanco. Tengo algo para llenarlas.',
      ],
      hint: ['Una palabra bien puesta abre más que una espada.', 'Esta pista merece una nota al margen.'],
      moves3: ['Un margen pequeño para una historia grande.'],
      moves: ['Más espacio entre líneas. Úsalo con juicio.'],
      redo: ['La tinta vuelve al tintero. Conserva lo aprendido.'],
      skip: ['Pasamos página. Esta no dará puntos.'],
      poor: ['Tu bolsa aún no cuenta esa historia.', 'Ni una runa convierte el vacío en monedas.'],
      bought: ['El códice reconoce un buen trato.', 'Llévalo. Y recuerda quién te lo tasó.'],
      decline: ['Las páginas pacientes esperan a su lector.'],
      nothing: ['Aún no hay tinta que borrar.'],
    },
  },
};
export const shopPersona = (hero) => SHOP_PERSONAS[hero] || SHOP_PERSONAS.jean;
