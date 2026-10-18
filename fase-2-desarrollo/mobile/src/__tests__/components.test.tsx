import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { HonorBadge } from '@/components/HonorBadge';
import { SlotBar } from '@/components/SlotBar';
import { SportFilter } from '@/components/SportFilter';
import { MatchCard } from '@/components/MatchCard';
import type { MatchSummary } from '@/api/types';

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
  it('M-07 · sin reseñas dice "Sin calificaciones aún", nunca 0', () => {
    render(<HonorBadge score={null} />);
    expect(screen.getByText('Sin calificaciones aún')).toBeTruthy();
    expect(screen.queryByText('0.0')).toBeNull();
  });

  it('M-08 · con reseñas muestra el puntaje con un decimal', () => {
    render(<HonorBadge score={8.5} />);
    expect(screen.getByText('8.5')).toBeTruthy();
  });
});

describe('SlotBar', () => {
  it('M-09 · informa ocupados y total a los lectores de pantalla', () => {
    render(<SlotBar filled={3} total={4} />);
    expect(screen.getByLabelText('3 de 4 jugadores')).toBeTruthy();
  });
});

describe('SportFilter (DESIGN.md §4.4)', () => {
  it('M-10 · muestra los tres deportes en orden Fútbol → Pádel → Básquet', () => {
    render(<SportFilter active={['FUTBOL', 'PADEL', 'BASQUETBOL']} onToggle={() => undefined} />);
    const labels = screen.getAllByRole('button').map((b) => b.props.accessibilityState?.selected);
    expect(labels).toEqual([true, true, true]);
    expect(screen.getByText('Fútbol')).toBeTruthy();
    expect(screen.getByText('Pádel')).toBeTruthy();
    expect(screen.getByText('Básquet')).toBeTruthy();
  });

  it('M-11 · tocar un chip avisa qué deporte cambió', () => {
    const onToggle = jest.fn();
    render(<SportFilter active={['FUTBOL', 'PADEL', 'BASQUETBOL']} onToggle={onToggle} />);
    fireEvent.press(screen.getByText('Pádel'));
    expect(onToggle).toHaveBeenCalledWith('PADEL');
  });
});

describe('MatchCard (DESIGN.md §4.2)', () => {
  it('M-12 · muestra cupos, cuota por jugador, lugar y distancia', () => {
    render(<MatchCard match={partido} onPress={() => undefined} />);
    expect(screen.getByText('Pádel dobles · Falta uno')).toBeTruthy();
    expect(screen.getByText(/Pádel Bellavista, a 2,4 km/)).toBeTruthy();
    expect(screen.getByText('3/4')).toBeTruthy();
    expect(screen.getByText(/\$6\.000/)).toBeTruthy();
  });

  it('M-13 · tocar la carta abre el partido', () => {
    const onPress = jest.fn();
    render(<MatchCard match={partido} onPress={onPress} />);
    fireEvent.press(screen.getByText('Pádel dobles · Falta uno'));
    expect(onPress).toHaveBeenCalled();
  });
});
