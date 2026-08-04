import { Injectable } from '@nestjs/common';
import { SearchFlightsQueryDto } from './dto/travel-search.dto';

const AIRLINES = ['IndiGo', 'Air India', 'Vistara', 'SpiceJet', 'Emirates'];
const FARE_CLASSES: { label: string; multiplier: number }[] = [
  { label: 'Economy', multiplier: 1 },
  { label: 'Premium Economy', multiplier: 1.6 },
  { label: 'Business', multiplier: 3.2 },
];

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/**
 * Same mock-provider constraint as HotelSearchService — no GDS/flight API key
 * exists here. Deterministic per route so re-searching the same origin/destination
 * returns a stable option set.
 */
@Injectable()
export class FlightSearchService {
  search(query: SearchFlightsQueryDto) {
    const baseSeed = hashString(`${query.origin.toLowerCase()}-${query.destination.toLowerCase()}`);
    const flightCount = 4 + (baseSeed % 2); // 4-5 flights

    return Array.from({ length: flightCount }).map((_, i) => {
      const seed = baseSeed + i * 61;
      const airline = AIRLINES[seed % AIRLINES.length];
      const fareClass = FARE_CLASSES[i % FARE_CLASSES.length];
      const flightNumber = `${airline.slice(0, 2).toUpperCase()}${100 + (seed % 900)}`;
      const departureHour = 5 + (seed % 17);
      const durationHours = 2 + (seed % 6);
      const arrivalHour = (departureHour + durationHours) % 24;
      const baseFare = Math.round((3500 + (seed % 4000)) * fareClass.multiplier);

      return {
        airline,
        flightNumber,
        origin: query.origin,
        destination: query.destination,
        date: query.date,
        departureTime: `${String(departureHour).padStart(2, '0')}:00`,
        arrivalTime: `${String(arrivalHour).padStart(2, '0')}:00`,
        durationHours,
        fareClass: fareClass.label,
        baseFare,
      };
    });
  }
}
