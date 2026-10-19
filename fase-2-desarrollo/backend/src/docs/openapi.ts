/**
 * Contrato OpenAPI 3 de la API de Kancha. Se sirve en /api/docs (Swagger UI)
 * y en /api/docs.json. Cada endpoint nuevo se documenta aquí en el mismo commit
 * (criterio de entrada del plan de pruebas, §10).
 */

const error = (example: { code: string; message: string }) => ({
  description: example.message,
  content: {
    'application/json': {
      schema: { $ref: '#/components/schemas/Error' },
      example: { error: { ...example, details: null } },
    },
  },
});

const json = (ref: string) => ({ 'application/json': { schema: { $ref: `#/components/schemas/${ref}` } } });

const idParam = { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } };

export const openapi = {
  openapi: '3.0.3',
  info: {
    title: 'Kancha API',
    version: '0.6.0',
    description:
      'API REST de Kancha: partidos amateur geolocalizados en La Florida. ' +
      'Montos en CLP como enteros. Para probar los endpoints protegidos: registra o inicia sesión, ' +
      'copia el token y pégalo en **Authorize**. Cuentas de demo: `camila@kancha.cl` / `kancha2026`.',
  },
  servers: [{ url: '/api/v1' }],
  tags: [
    { name: 'Sistema' },
    { name: 'Cuentas', description: 'HU-01 · KAN-7' },
    { name: 'Partidos', description: 'HU-03 · KAN-9 · HU-04 · KAN-10' },
    { name: 'Postulaciones', description: 'HU-05 · KAN-11' },
  ],
  components: {
    securitySchemes: { bearer: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
              details: { nullable: true },
            },
          },
        },
      },
      Sport: { type: 'string', enum: ['FUTBOL', 'PADEL', 'BASQUETBOL'] },
      Level: { type: 'string', enum: ['PRINCIPIANTE', 'MEDIO', 'AVANZADO'] },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          email: { type: 'string', description: 'Solo en el perfil propio' },
          favoriteSport: { $ref: '#/components/schemas/Sport' },
          matchesPlayed: { type: 'integer' },
          honorScore: {
            type: 'number',
            nullable: true,
            description: '0.0–10.0. null = "Sin calificaciones aún" (nunca 0 para un usuario nuevo)',
          },
          attendanceRate: { type: 'number', nullable: true },
          punctualityRate: { type: 'number', nullable: true },
          fairPlayRate: { type: 'number', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      AuthResult: {
        type: 'object',
        properties: { token: { type: 'string' }, user: { $ref: '#/components/schemas/User' } },
      },
      RegisterInput: {
        type: 'object',
        required: ['email', 'password', 'name', 'favoriteSport'],
        properties: {
          email: { type: 'string', example: 'nuevo@kancha.cl' },
          password: { type: 'string', minLength: 8, example: 'kancha2026' },
          name: { type: 'string', example: 'Agente Libre' },
          favoriteSport: { $ref: '#/components/schemas/Sport' },
        },
      },
      LoginInput: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', example: 'camila@kancha.cl' },
          password: { type: 'string', example: 'kancha2026' },
        },
      },
      CreateMatchInput: {
        type: 'object',
        required: ['title', 'sport', 'venueName', 'address', 'lat', 'lng', 'startsAt', 'totalSlots', 'filledSlots'],
        properties: {
          title: { type: 'string', example: 'Pádel dobles · Falta uno' },
          sport: { $ref: '#/components/schemas/Sport' },
          level: { $ref: '#/components/schemas/Level' },
          venueName: { type: 'string', example: 'Pádel Bellavista' },
          address: { type: 'string', example: 'Av. Vicuña Mackenna 7110, La Florida' },
          lat: { type: 'number', example: -33.5228 },
          lng: { type: 'number', example: -70.5983 },
          startsAt: { type: 'string', format: 'date-time', description: 'Debe ser futura (si no, 422 MATCH_IN_PAST)' },
          durationMin: { type: 'integer', minimum: 30, maximum: 240, default: 60 },
          totalSlots: { type: 'integer', minimum: 2, maximum: 30, example: 4 },
          filledSlots: { type: 'integer', minimum: 1, description: 'Jugadores que ya tienes, contándote. Menor que totalSlots', example: 3 },
          totalCost: { type: 'integer', minimum: 0, description: 'Arriendo total en CLP. 0 = gratis', example: 24000 },
        },
      },
      MatchSummary: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          title: { type: 'string' },
          sport: { $ref: '#/components/schemas/Sport' },
          level: { $ref: '#/components/schemas/Level' },
          venueName: { type: 'string' },
          address: { type: 'string' },
          lat: { type: 'number' },
          lng: { type: 'number' },
          startsAt: { type: 'string', format: 'date-time' },
          durationMin: { type: 'integer' },
          totalSlots: { type: 'integer' },
          filledSlots: { type: 'integer' },
          slotsLeft: { type: 'integer' },
          totalCost: { type: 'integer' },
          pricePerPlayer: { type: 'integer', description: 'ceil(totalCost / totalSlots)' },
          status: { type: 'string' },
          distanceM: { type: 'integer', description: 'Solo en /matches/nearby' },
          organizer: {
            type: 'object',
            properties: { id: { type: 'string' }, name: { type: 'string' }, honorScore: { type: 'number', nullable: true } },
          },
        },
      },
      MatchDetail: {
        allOf: [
          { $ref: '#/components/schemas/MatchSummary' },
          {
            type: 'object',
            properties: {
              serviceFee: { type: 'integer', description: 'Comisión de Kancha (10 %) sobre la cuota' },
              viewer: {
                type: 'object',
                properties: {
                  isOrganizer: { type: 'boolean' },
                  participationId: { type: 'string', nullable: true },
                  status: { type: 'string', nullable: true },
                },
              },
              participants: { type: 'array', items: { type: 'object' } },
            },
          },
        ],
      },
    },
  },
  security: [{ bearer: [] }],
  paths: {
    '/health': {
      get: {
        tags: ['Sistema'],
        security: [],
        summary: 'Estado de la API y de la base de datos',
        responses: { 200: { description: 'API y base conectadas' }, 503: { description: 'Base de datos caída' } },
      },
    },
    '/auth/register': {
      post: {
        tags: ['Cuentas'],
        security: [],
        summary: 'Registro de agente libre (HU-01)',
        requestBody: { required: true, content: json('RegisterInput') },
        responses: {
          201: { description: 'Cuenta creada. honorScore = null', content: json('AuthResult') },
          409: error({ code: 'EMAIL_TAKEN', message: 'Este correo ya está en uso' }),
          422: error({ code: 'VALIDATION_ERROR', message: 'Los datos enviados no son válidos' }),
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Cuentas'],
        security: [],
        summary: 'Inicio de sesión',
        requestBody: { required: true, content: json('LoginInput') },
        responses: {
          200: { description: 'Sesión iniciada', content: json('AuthResult') },
          401: error({ code: 'INVALID_CREDENTIALS', message: 'El correo o la contraseña no son correctos' }),
        },
      },
    },
    '/users/me': {
      get: {
        tags: ['Cuentas'],
        summary: 'Perfil propio',
        responses: { 200: { description: 'Perfil', content: json('User') }, 401: error({ code: 'UNAUTHORIZED', message: 'Falta el token de autenticación' }) },
      },
    },
    '/users/me/matches': {
      get: {
        tags: ['Partidos'],
        summary: 'Partidos que organizo o a los que postulé',
        responses: { 200: { description: 'Lista con mi rol y estado en cada partido' } },
      },
    },
    '/users/{id}': {
      get: {
        tags: ['Cuentas'],
        summary: 'Carta pública de un jugador',
        parameters: [idParam],
        responses: { 200: { description: 'Jugador', content: json('User') }, 404: error({ code: 'USER_NOT_FOUND', message: 'El jugador no existe' }) },
      },
    },
    '/matches': {
      post: {
        tags: ['Partidos'],
        summary: 'Publicar partido con cupos incompletos (HU-03)',
        requestBody: { required: true, content: json('CreateMatchInput') },
        responses: {
          201: { description: 'Partido publicado como OPEN', content: json('MatchDetail') },
          422: error({ code: 'MATCH_IN_PAST', message: 'La fecha y hora del partido ya pasaron' }),
        },
      },
    },
    '/matches/nearby': {
      get: {
        tags: ['Partidos'],
        summary: 'Partidos con cupo cerca de un punto (HU-04)',
        description: 'ST_DWithin sobre el índice GIST idx_match_location. Ordena por distancia.',
        parameters: [
          { name: 'lat', in: 'query', required: true, schema: { type: 'number' }, example: -33.5228 },
          { name: 'lng', in: 'query', required: true, schema: { type: 'number' }, example: -70.5983 },
          { name: 'radius', in: 'query', schema: { type: 'integer', default: 5000, minimum: 500, maximum: 20000 }, description: 'Metros' },
          { name: 'sport', in: 'query', schema: { type: 'string' }, description: 'Uno o varios separados por coma: FUTBOL,PADEL' },
          { name: 'level', in: 'query', schema: { $ref: '#/components/schemas/Level' } },
          { name: 'from', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'to', in: 'query', schema: { type: 'string', format: 'date-time' } },
        ],
        responses: {
          200: {
            description: 'Partidos abiertos, futuros y con cupo dentro del radio',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    matches: { type: 'array', items: { $ref: '#/components/schemas/MatchSummary' } },
                    count: { type: 'integer' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/matches/{id}': {
      get: {
        tags: ['Partidos'],
        summary: 'Detalle del partido, participantes y mi estado',
        parameters: [idParam],
        responses: { 200: { description: 'Detalle', content: json('MatchDetail') }, 404: error({ code: 'MATCH_NOT_FOUND', message: 'El partido no existe' }) },
      },
    },
    '/matches/{id}/join': {
      post: {
        tags: ['Postulaciones'],
        summary: 'Postular a un partido (HU-05). Queda en PENDING',
        parameters: [idParam],
        responses: {
          201: { description: 'Postulación registrada como pendiente' },
          409: error({ code: 'ALREADY_JOINED', message: 'Ya postulaste a este partido' }),
        },
      },
    },
    '/participations/{id}/approve': {
      patch: {
        tags: ['Postulaciones'],
        summary: 'El organizador aprueba una postulación (HU-05)',
        description: 'Transacción con bloqueo de fila (SELECT … FOR UPDATE): el último cupo nunca se vende dos veces.',
        parameters: [idParam],
        responses: {
          200: { description: 'Postulación aprobada. El partido pasa a FULL si era el último cupo' },
          403: error({ code: 'FORBIDDEN', message: 'Solo el organizador puede aprobar postulaciones' }),
          409: error({ code: 'MATCH_FULL', message: 'El partido ya no tiene cupos disponibles' }),
        },
      },
    },
  },
} as const;
