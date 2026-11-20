# Fuentes de las canchas de La Florida (KAN-40)

Investigación del 20 de noviembre de 2026. Resultado: 36 canchas en `fase-2-desarrollo/mobile/src/data/laFlorida.json`.

## De dónde salió cada grupo

| Grupo | Cuántas | Fuente |
|---|---|---|
| Multicanchas recuperadas en 2024 | 20 de 22 | [La Tercera: la inversión de La Florida para recuperar 23 canchas](https://www.latercera.com/el-deportivo/noticia/la-millonaria-inversion-de-la-florida-para-recuperar-23-canchas-deportivas/42ITJC7F4VGXRHNS3QYGSOYGPY/) |
| Multicanchas reinauguradas | 3 | [Municipalidad de La Florida: reinauguración de canchas deportivas](https://www.laflorida.cl/sitio/noticias_florida/reinauguracion-de-canchas-deportivas-para-los-vecinos-y-vecinas-de-la-florida/) |
| Recintos municipales que se arriendan | 5 | [Corporación de Deportes de La Florida](https://www.deporteslaflorida.cl/) (arriendo por EasyCancha) y OpenStreetMap |
| Clubes privados de pádel | 4 | Fichas de reserva en [EasyCancha](https://www.easycancha.com/) y sitios de cada club |
| Complejos privados de fútbol | 3 | Sitios y fichas de cada complejo (Florida Soccer, Club Cordillera, Parque Deportivo La Araucana) |
| Parque público | 1 | OpenStreetMap (Parque La Quebrada de Macul) |

## Cómo se ubicaron

- **Cruces de calles:** el nodo que comparten ambas calles en OpenStreetMap, dentro de la comuna.
- **Direcciones con número:** Nominatim (OpenStreetMap).
- **Afinado:** si había una cancha dibujada en OpenStreetMap a menos de 120 m, se usó su centro.
- **Control:** todas quedan dentro del límite real de la comuna (prueba M-29).

## Lo que quedó fuera, y por qué

| Recinto | Motivo |
|---|---|
| Multicancha Huenchún con Leonora Latorre | La calle Huenchún no existe en OpenStreetMap |
| Multicancha Pasaje 9 con Pasaje 3 (Villa La Florida) | Nombres genéricos de pasaje: no se puede ubicar sin ambigüedad |
| CENDYR Nuevo Amanecer (como multicancha de la lista 2024) | Ya estaba incluido con su ubicación de OpenStreetMap |
| Club Oasis Pádel La Florida | Solo se encontró la avenida (1,8 km), no el número |
| Club Alto Macul | Solo se encontró la calle (1,7 km), no el número |
| Club Soccer 7 | Solo se encontró la calle (1,3 km), no el número |
| Donosport | No se pudo confirmar su ubicación |

No se copiaron datos de Google Maps: sus términos prohíben guardarlos en otra aplicación. Horarios y
precios no se incluyen porque cambian; las páginas de cada club los informan.
