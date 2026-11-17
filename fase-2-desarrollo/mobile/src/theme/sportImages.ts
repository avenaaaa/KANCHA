import type { ImageSourcePropType } from 'react-native';
import type { SportKey } from './sports';

/**
 * Fotografía en blanco y negro de la presentación de Fase 1, una por deporte y con
 * el mismo tratamiento para los tres. Portada: encabezado del partido.
 * Jugador: recorte sin fondo para la carta de jugador y las pantallas de entrada.
 */
export const SPORT_COVER: Record<SportKey, ImageSourcePropType> = {
  FUTBOL: require('../../assets/img/cover-futbol.jpg'),
  PADEL: require('../../assets/img/cover-padel.jpg'),
  BASQUETBOL: require('../../assets/img/cover-basquet.jpg'),
};

export const SPORT_PLAYER: Record<SportKey, ImageSourcePropType> = {
  FUTBOL: require('../../assets/img/player-futbol.png'),
  PADEL: require('../../assets/img/player-padel.png'),
  BASQUETBOL: require('../../assets/img/player-basquet.png'),
};
