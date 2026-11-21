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

## Equipamiento verificado (21 de noviembre de 2026, KAN-43)

La lista de KAN-40 marcaba cada multicancha pública como "fútbol y básquetbol" por ser multicancha, sin
confirmar arcos ni aros. Ninguna fuente pública detalla el equipamiento cancha por cancha: La Tercera
habla de "carpetas de asfalto y pasto sintético", iluminación LED, galerías y cierres, y la Municipalidad
dice que las canchas recuperadas quedaron con pasto sintético. El sitio de la Corporación de Deportes no
publica sus recintos. Por eso cada cancha se revisó así:

- **OpenStreetMap:** el deporte de cada cancha dibujada a menos de 150 m y su tamaño (una de pádel mide
  20 × 10 m; en OpenStreetMap muchas están etiquetadas como tenis).
- **Foto satelital** (Esri World Imagery, unos 75 m de lado, revisada a mano): si la carpeta es pasto
  sintético (verde oscuro, sin líneas de básquetbol) o pintada (azul o verde claro, con zonas y arcos de
  triple pintados). En pasto sintético el balón de básquetbol no bota: esas canchas son solo de fútbol.
- **Límite del método:** los aros y los arcos son demasiado delgados para verse desde arriba. Las líneas
  pintadas de básquetbol indican que hay aros, pero no lo prueban. La fecha de las fotos no es pública.

| # | Cancha | Qué se ve | Deportes en la app |
|---|---|---|---|
| 1 | Ancud con Calama | Carpeta azul con líneas de básquetbol | Fútbol y básquetbol |
| 2 | Calle 1 con Tocopilla | Carpeta azul con líneas de básquetbol; OSM: fútbol y básquetbol | Fútbol y básquetbol |
| 3 | Cerro Moreno con Puerto Edén | Carpeta azul con líneas de básquetbol, a 50 m del cruce: **pin movido** a la cancha | Fútbol y básquetbol |
| 4 | El Acero con San Pedro | Una cancha de pasto sintético y otra azul con un escudo pintado, sin líneas de básquetbol visibles | Fútbol y básquetbol · **básquetbol sin confirmar** |
| 5 | Gerónimo de Alderete con Manutara | Pasto sintético | **Solo fútbol** (antes también básquetbol) |
| 6 | José Miguel Carrera con Cerro Colorado | Carpeta azul con líneas de básquetbol, a 35 m del cruce: **pin movido** a la cancha | Fútbol y básquetbol |
| 7 | Juan Rulfo 8320 | **No hay ninguna cancha** a menos de 75 m del pin | Sin verificar |
| 8 | La Primavera 1868 | Carpeta verde clara con líneas de básquetbol | Fútbol y básquetbol |
| 9 | Lago Chungará con Copiapó | Carpeta azul con líneas de básquetbol | Fútbol y básquetbol |
| 10 | Las Gardenias con Los Clarines | Pasto sintético | **Solo fútbol** (antes también básquetbol) |
| 11 | Los Jazmines con Los Recuerdos | Carpeta azul con líneas de básquetbol | Fútbol y básquetbol |
| 12 | Los Quillayes (Río 1 con Oriente) | Pasto sintético | **Solo fútbol** (antes también básquetbol) |
| 13 | Los Quillayes con Los Peumos | Carpeta azul tapada por árboles; no se distinguen líneas | Fútbol y básquetbol · **sin confirmar** |
| 14 | Paseo Los Limones con Las Mandarinas | Carpeta verde clara con líneas de básquetbol | Fútbol y básquetbol |
| 15 | Plaza Diego Portales con Mariano Egaña | Carpeta azul con líneas de básquetbol | Fútbol y básquetbol |
| 16 | San José de la Estrella con Punta Arenas | Pasto sintético; OSM: fútbol | **Solo fútbol** (antes también básquetbol) |
| 17 | Santa Raquel con María Elena | **No hay ninguna cancha** a menos de 75 m del pin | Sin verificar |
| 18 | Santa Raquel con Trinidad | Carpeta azul con líneas de básquetbol | Fútbol y básquetbol |
| 19 | Sótero del Río con Anita Cortés | Carpeta azul con líneas de básquetbol | Fútbol y básquetbol |
| 20 | Sótero del Río con Rebeca Matte | Carpeta azul con líneas de básquetbol; OSM: fútbol, básquetbol y tenis | Fútbol y básquetbol |
| 21 | Troncal San Francisco con Lontananza | Una cancha de pasto sintético y otra celeste; OSM: dos de básquetbol | Fútbol y básquetbol |
| 22 | Valentina Leppe con Juan Fernández | Dos carpetas azules con líneas de básquetbol | Fútbol y básquetbol |
| 23 | Vicuña Mackenna con Toledo | Pasto sintético | **Solo fútbol** (antes también básquetbol) |
| 24 | Parque La Quebrada de Macul | Cancha de fútbol grande con su trazado | Fútbol |
| 25–28 | CENDYR Ignacio Carrera Pinto, Manutara, Nuevo Amanecer y Villa O'Higgins | Canchas de fútbol de pasto sintético (70 a 108 m), arcos visibles en Ignacio Carrera Pinto | Fútbol |
| 29 | Centro Deportivo Municipal | Dos multicanchas azules de básquetbol, canchas de tenis de arcilla, gimnasio techado y una cancha azul del tamaño de una de pádel. No se ve cancha de fútbol al aire libre | Pádel, básquetbol y fútbol · **pádel probable, fútbol sin confirmar** (puede ser en el gimnasio) |
| 30 | Club Cordillera Futbolito | Varias canchas de futbolito de pasto sintético, con arcos visibles | Fútbol |
| 31 | Club de Pádel La Florida y Florida Soccer | 5 canchas de pádel (OSM: 18 × 9 m) y canchas de fútbol | Pádel y fútbol |
| 32 | Club de Pádel Recrear | Unas 8 canchas de pádel | Pádel |
| 33 | EntrePadel | Unas 6 canchas de pádel | Pádel |
| 34 | Maiclub La Florida (Mega Sport) | Canchas grandes de pasto sintético y una cancha azul del tamaño de una de pádel | Pádel y fútbol · **pádel probable** |
| 35 | Parque Deportivo La Florida (La Araucana) | Canchas de tenis de arcilla; cerca del pin no se distingue una de fútbol | Fútbol · **sin confirmar** |
| 36 | Pádel La Florida (ex Cordep) | 5 canchas de pádel (OSM: 19 × 8,5 m) | Pádel |

**Resultado.** Básquetbol confirmado (líneas pintadas) en 14 multicanchas y en el Centro Deportivo
Municipal; cinco multicanchas de pasto sintético quedaron solo para fútbol. Pádel confirmado en los cuatro
clubes de pádel; probable en Maiclub y en el Centro Deportivo Municipal. **Ninguna cancha pública tiene
pádel:** exige muros y vidrio. Dos pines (Juan Rulfo 8320 y Santa Raquel con María Elena) no tienen una
cancha cerca: siguen en la app hasta que el autor decida si se quitan.

Fuentes: [La Tercera, 22-oct-2024](https://www.latercera.com/el-deportivo/noticia/la-millonaria-inversion-de-la-florida-para-recuperar-23-canchas-deportivas/42ITJC7F4VGXRHNS3QYGSOYGPY/),
[Municipalidad de La Florida](https://www.laflorida.cl/sitio/noticias_florida/reinauguracion-de-canchas-deportivas-para-los-vecinos-y-vecinas-de-la-florida/),
OpenStreetMap (ODbL) y fotos satelitales © Esri World Imagery, revisadas sin guardarlas en la app.

