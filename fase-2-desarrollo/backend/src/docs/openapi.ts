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
    { name: 'Pagos', description: 'HU-08 · KAN-14 · HU-09 · KAN-15 · Transbank Webpay Plus, ambiente de Integración' },
    { name: 'Calificaciones', description: 'HU-06 · KAN-12 · HU-07 · KAN-13 · Sistema de Honor' },
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
      RatingWindow: {
        type: 'string',
        enum: ['NOT_FINISHED', 'OPEN', 'CLOSED'],
        description: 'Ventana para calificar (HU-06): abre al terminar el partido y dura 48 h',
      },
      MatchDetail: {
        allOf: [
          { $ref: '#/components/schemas/MatchSummary' },
          {
            type: 'object',
            properties: {
              serviceFee: { type: 'integer', description: 'Comisión de Kancha (10 %) sobre la cuota' },
              ratingWindow: { $ref: '#/components/schemas/RatingWindow' },
              viewer: {
                type: 'object',
                properties: {
                  isOrganizer: { type: 'boolean' },
                  participationId: { type: 'string', nullable: true },
                  status: { type: 'string', nullable: true, description: 'Incluye CANCELLED si el jugador perdió el cupo' },
                  payment: {
                    type: 'object',
                    nullable: true,
                    description: 'Último intento de pago (HU-08). Con status AUTHORIZED es el comprobante',
                    properties: {
                      status: { type: 'string', enum: ['INITIATED', 'AUTHORIZED', 'FAILED', 'REFUNDED', 'RETAINED'] },
                      amount: { type: 'integer' },
                      retained: { type: 'integer', description: 'Retenido al cancelar a menos de 12 h (HU-09)' },
                      buyOrder: { type: 'string' },
                      authorizedAt: { type: 'string', format: 'date-time', nullable: true },
                    },
                  },
                  refundIfCancelled: {
                    type: 'object',
                    nullable: true,
                    description: 'Solo con el cupo pagado: qué se devolvería al cancelar ahora (HU-09)',
                    properties: {
                      refunded: { type: 'integer' },
                      retained: { type: 'integer' },
                      withinRetentionWindow: { type: 'boolean' },
                    },
                  },
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
        description: 'Quien perdió su cupo (pago fallido) puede volver a postular: se reactiva su postulación.',
        parameters: [idParam],
        responses: {
          201: { description: 'Postulación registrada como pendiente' },
          409: error({ code: 'ALREADY_JOINED', message: 'Ya postulaste a este partido' }),
        },
      },
    },
    '/matches/{id}/ratings': {
      post: {
        tags: ['Calificaciones'],
        summary: 'Calificar a un compañero del partido (HU-06) y recalcular su honor (HU-07)',
        description:
          'Solo entre jugadores del partido (organizador o cupo aprobado/pagado), una vez por compañero ' +
          '(UNIQUE matchId, raterId, ratedId) y dentro de las 48 h tras el término. Notas de 1 a 5, validadas ' +
          'con Zod y con CHECK en la base. El honor se recalcula en la misma transacción, con la fila del ' +
          'calificado bloqueada. Vencido el plazo el partido se archiva.',
        parameters: [idParam],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['ratedId', 'punctuality', 'conduct'],
                properties: {
                  ratedId: { type: 'string', format: 'uuid' },
                  punctuality: { type: 'integer', minimum: 1, maximum: 5 },
                  conduct: { type: 'integer', minimum: 1, maximum: 5 },
                },
              },
              example: { ratedId: '3f8a…', punctuality: 5, conduct: 4 },
            },
          },
        },
        responses: {
          201: {
            description: 'Reseña guardada con el honor ya recalculado del calificado',
            content: {
              'application/json': {
                example: {
                  ratedId: '3f8a…',
                  honor: { attendanceRate: null, punctualityRate: 100, fairPlayRate: 75, honorScore: 8.8 },
                },
              },
            },
          },
          403: error({ code: 'FORBIDDEN', message: 'Solo los jugadores del partido pueden calificar' }),
          409: error({ code: 'ALREADY_RATED', message: 'Ya calificaste a este jugador en este partido' }),
          422: error({ code: 'SELF_RATING', message: 'No puedes calificarte a ti mismo' }),
        },
      },
    },
    '/matches/{id}/ratings/pending': {
      get: {
        tags: ['Calificaciones'],
        summary: 'Compañeros que aún no califico en este partido (HU-06)',
        parameters: [idParam],
        responses: {
          200: {
            description: 'Estado de la ventana y pendientes',
            content: {
              'application/json': {
                example: {
                  window: 'OPEN',
                  closesAt: '2026-11-10T22:30:00.000Z',
                  pending: [{ userId: '3f8a…', name: 'Valentina Rojas', honorScore: null }],
                },
              },
            },
          },
          403: error({ code: 'FORBIDDEN', message: 'Solo los jugadores del partido pueden calificar' }),
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
    '/participations/{id}/attendance': {
      patch: {
        tags: ['Calificaciones'],
        summary: 'El organizador registra la asistencia de un confirmado (KAN-30)',
        description:
          'Solo cuando el partido terminó y una sola vez por jugador. "Asistió" (true) suma un partido jugado; ' +
          '"no se presentó" (false) deja la participación en NO_SHOW y la saca de las calificaciones. En ambos ' +
          'casos el honor se recalcula en la misma transacción.',
        parameters: [idParam],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object', required: ['attended'], properties: { attended: { type: 'boolean' } } },
              example: { attended: true },
            },
          },
        },
        responses: {
          200: {
            description: 'Asistencia registrada, con el honor ya recalculado',
            content: {
              'application/json': {
                example: {
                  participationId: '3f8a…',
                  attended: true,
                  honor: { attendanceRate: 100, punctualityRate: null, fairPlayRate: null, honorScore: 10 },
                },
              },
            },
          },
          403: error({ code: 'FORBIDDEN', message: 'Solo el organizador registra la asistencia' }),
          409: error({ code: 'ATTENDANCE_ALREADY_SET', message: 'La asistencia de este jugador ya está registrada' }),
        },
      },
    },
    '/participations/{id}': {
      delete: {
        tags: ['Pagos'],
        summary: 'Cancelar mi cupo, con retención por deserción (HU-09)',
        description:
          'Pendiente: se retira la postulación. Aprobado sin pagar: se libera el cupo. Pagado: con 12 h o más se ' +
          'reembolsa el 100 %; a menos de 12 h se retiene el 50 % y el recinto recibe lo retenido menos la comisión ' +
          'de Kancha. El reembolso pasa por Transbank dentro de la transacción con bloqueo de fila.',
        parameters: [idParam],
        responses: {
          200: {
            description: 'Cupo cancelado',
            content: {
              'application/json': {
                example: {
                  participationId: '3f8a…',
                  status: 'CANCELLED',
                  refund: { refunded: 3300, retained: 3300, withinRetentionWindow: true, platformCommission: 330, venueAmount: 2970 },
                },
              },
            },
          },
          403: error({ code: 'FORBIDDEN', message: 'Solo puedes cancelar tu propio cupo' }),
          409: error({ code: 'NOT_CANCELLABLE', message: 'Este cupo ya está cancelado' }),
          502: error({ code: 'PAYMENT_GATEWAY_ERROR', message: 'Transbank no respondió. Intenta de nuevo en unos minutos.' }),
        },
      },
    },
    '/payments/{participationId}/init': {
      post: {
        tags: ['Pagos'],
        summary: 'Iniciar el pago de mi cupo (HU-08)',
        description:
          'Crea la transacción en Webpay por la cuota más el 10 % de servicio. La app abre luego ' +
          '`checkoutPath` en el navegador. Sin TBK_RETURN_URL, Transbank vuelve a la dirección por la que llegó la app.',
        parameters: [{ name: 'participationId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          201: {
            description: 'Pago iniciado',
            content: {
              'application/json': {
                example: { paymentId: '3f8a…', amount: 6600, commission: 600, checkoutPath: '/payments/3f8a…/webpay' },
              },
            },
          },
          403: error({ code: 'FORBIDDEN', message: 'Solo puedes pagar tu propio cupo' }),
          409: error({ code: 'NOT_APPROVED', message: 'El organizador aún no confirma tu cupo' }),
          502: error({ code: 'PAYMENT_GATEWAY_ERROR', message: 'Transbank no respondió. Intenta de nuevo en unos minutos.' }),
        },
      },
    },
    '/payments/{id}/webpay': {
      get: {
        tags: ['Pagos'],
        security: [],
        summary: 'Página que lleva al jugador a Webpay (HTML)',
        description: 'Envía token_ws por POST al formulario de Transbank. La CSP solo permite ese destino.',
        parameters: [idParam],
        responses: {
          200: { description: 'Página de redirección', content: { 'text/html': {} } },
          404: error({ code: 'PAYMENT_NOT_FOUND', message: 'Este pago ya no está disponible' }),
        },
      },
    },
    '/payments/return': {
      get: {
        tags: ['Pagos'],
        security: [],
        summary: 'Vuelta desde Webpay y comprobante (HTML)',
        description:
          'token_ws: se confirma el pago (commit) una sola vez. TBK_TOKEN (anulado) o solo TBK_ORDEN_COMPRA ' +
          '(tiempo agotado): el pago queda FAILED y el cupo se libera. Transbank también puede volver por POST.',
        parameters: [
          { name: 'token_ws', in: 'query', schema: { type: 'string' } },
          { name: 'TBK_TOKEN', in: 'query', schema: { type: 'string' } },
          { name: 'TBK_ORDEN_COMPRA', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Comprobante: pago aprobado o no completado', content: { 'text/html': {} } },
          404: error({ code: 'PAYMENT_NOT_FOUND', message: 'No encontramos este pago' }),
          422: error({ code: 'VALIDATION_ERROR', message: 'Falta el token de Webpay' }),
        },
      },
    },
  },
} as const;
