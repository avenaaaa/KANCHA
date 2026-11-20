import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { HonorBadge } from '@/components/HonorBadge';
import { SlotBar } from '@/components/SlotBar';
import { SportFilter } from '@/components/SportFilter';
import { MatchCard } from '@/components/MatchCard';
import { RatingPicker } from '@/components/RatingPicker';
import { PlayerCard } from '@/components/PlayerCard';
import { UrgentButton } from '@/components/UrgentButton';
import { sheetSnap } from '@/components/ui/DragSheet';
import type { MatchSummary, User } from '@/api/types';

const partido: MatchSummary = {
  id: 'm1',
  title: 'Pádel dobles · Falta uno',
  sport: 'PADEL',
  level: 'MEDIO',
  venueName: 'Pádel Bellavista',
  address: 'Av. Bellavista, La Florida',
  lat: -33.52,
  lng: -70.57,
  startsAt: new Date(Date.now() + 3 * 3_600_000).toISOString(),
  durationMin: 90,
  totalSlots: 4,
  filledSlots: 3,
  slotsLeft: 1,
  totalCost: 24000,
  pricePerPlayer: 6000,
  status: 'OPEN',
  organizer: { id: 'u1', name: 'Diego Cáceres', honorScore: null },
  distanceM: 2428,
};

describe('HonorBadge (DESIGN.md §4.5)', () => {
  it('M-07 · sin reseñas dice "Sin calificaciones aún", nunca 0', async () => {
    await render(<HonorBadge score={null} />);
    expect(screen.getByText('Sin calificaciones aún')).toBeTruthy();
    expect(screen.queryByText('0.0')).toBeNull();
  });

  it('M-08 · con reseñas muestra el puntaje con un decimal', async () => {
    await render(<HonorBadge score={8.5} />);
    expect(screen.getByText('8.5')).toBeTruthy();
  });
});

describe('SlotBar', () => {
  it('M-09 · informa ocupados y total a los lectores de pantalla', async () => {
    await render(<SlotBar filled={3} total={4} />);
    expect(screen.getByLabelText('3 de 4 jugadores')).toBeTruthy();
  });
});

describe('SportFilter (DESIGN.md §4.4)', () => {
  it('M-10 · muestra los tres deportes en orden Fútbol → Pádel → Básquet', async () => {
    await render(<SportFilter active={['FUTBOL', 'PADEL', 'BASQUETBOL']} onToggle={() => undefined} />);
    const chips = screen.getAllByRole('button');
    expect(chips.map((b) => b.props.accessibilityState?.selected)).toEqual([true, true, true]);
    // El orden se comprueba de verdad: el texto de cada chip, en la posición en que se dibuja.
    const texto = (i: number) => within(chips[i]!).getByText(/Fútbol|Pádel|Básquet/).props.children;
    expect([texto(0), texto(1), texto(2)]).toEqual(['Fútbol', 'Pádel', 'Básquet']);
  });

  it('M-11 · tocar un chip avisa qué deporte cambió', async () => {
    const onToggle = jest.fn();
    await render(<SportFilter active={['FUTBOL', 'PADEL', 'BASQUETBOL']} onToggle={onToggle} />);
    await fireEvent.press(screen.getByText('Pádel'));
    expect(onToggle).toHaveBeenCalledWith('PADEL');
  });
});

describe('MatchCard (DESIGN.md §4.2)', () => {
  it('M-12 · muestra cupos, cuota por jugador, lugar y distancia', async () => {
    await render(<MatchCard match={partido} onPress={() => undefined} />);
    expect(screen.getByText('Pádel dobles · Falta uno')).toBeTruthy();
    expect(screen.getByText(/Pádel Bellavista, a 2,4 km/)).toBeTruthy();
    expect(screen.getByText('3/4')).toBeTruthy();
    expect(screen.getByText(/\$6\.000/)).toBeTruthy();
  });

  it('M-13 · tocar la carta abre el partido', async () => {
    const onPress = jest.fn();
    await render(<MatchCard match={partido} onPress={onPress} />);
    await fireEvent.press(screen.getByText('Pádel dobles · Falta uno'));
    expect(onPress).toHaveBeenCalled();
  });
});

describe('RatingPicker (HU-06)', () => {
  it('M-17 · ofrece notas de 1 a 5, marca la elegida y avisa al tocar otra', async () => {
    const onChange = jest.fn();
    await render(<RatingPicker label="Puntualidad" value={4} onChange={onChange} />);
    expect(screen.getAllByRole('button')).toHaveLength(5);
    expect(screen.getByRole('button', { name: '4' }).props.accessibilityState).toMatchObject({ selected: true });
    await fireEvent.press(screen.getByText('2'));
    expect(onChange).toHaveBeenCalledWith(2);
  });
});

describe('PlayerCard (HU-02)', () => {
  const jugador: User = {
    id: 'u2',
    name: 'Valentina Soto',
    email: 'valentina@kancha.cl',
    favoriteSport: 'FUTBOL',
    matchesPlayed: 0,
    honorScore: null,
    attendanceRate: null,
    punctualityRate: null,
    fairPlayRate: null,
    createdAt: '2026-11-01T12:00:00.000Z',
  };

  it('M-18 · sin reseñas dice "Sin calificaciones aún" y nunca muestra el correo', async () => {
    await render(<PlayerCard user={jugador} />);
    expect(screen.getAllByText('Sin calificaciones aún').length).toBeGreaterThan(0);
    expect(screen.queryByText('0.0')).toBeNull();
    expect(screen.queryByText('valentina@kancha.cl')).toBeNull();
  });

  it('M-19 · con reseñas muestra honor, partidos jugados y las tres métricas', async () => {
    await render(
      <PlayerCard user={{ ...jugador, matchesPlayed: 12, honorScore: 8.8, attendanceRate: 100, punctualityRate: 75, fairPlayRate: 92 }} />,
    );
    expect(screen.getByText('8.8')).toBeTruthy();
    expect(screen.getByText('12')).toBeTruthy();
    expect(screen.getByText('100 %')).toBeTruthy();
    expect(screen.getByText('75 %')).toBeTruthy();
    expect(screen.getByText('92 %')).toBeTruthy();
  });
});

describe('Panel de partidos que se desliza', () => {
  it('M-32 · al soltar, un gesto rápido manda y si fue lento gana la posición más cercana', () => {
    const range = 250;
    expect(sheetSnap(200, -1.2, range)).toBe(true); // casi cerrado, pero lanzado hacia arriba: abre
    expect(sheetSnap(20, 1.2, range)).toBe(false); // casi abierto, pero lanzado hacia abajo: cierra
    expect(sheetSnap(100, 0, range)).toBe(true); // lento y más cerca de abierto
    expect(sheetSnap(160, 0.2, range)).toBe(false); // lento y más cerca de cerrado
  });
});

describe('Botón "Falta uno" (KAN-37)', () => {
  it('M-33 · avisa si está encendido a los lectores de pantalla y responde al toque', async () => {
    const onPress = jest.fn();
    const { rerender } = await render(<UrgentButton active={false} onPress={onPress} hours={2} />);
    const boton = screen.getByRole('button', { name: 'Falta uno' });
    expect(boton.props.accessibilityState).toMatchObject({ selected: false });
    await fireEvent.press(boton);
    expect(onPress).toHaveBeenCalledTimes(1);

    await rerender(<UrgentButton active onPress={onPress} hours={2} />);
    expect(screen.getByRole('button', { name: 'Falta uno' }).props.accessibilityState).toMatchObject({ selected: true });
  });
});
