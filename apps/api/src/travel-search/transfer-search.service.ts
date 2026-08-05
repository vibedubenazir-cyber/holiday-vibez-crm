import { Injectable } from '@nestjs/common';
import { SearchTransfersQueryDto } from './dto/travel-search.dto';

const VEHICLE_TYPES: { label: string; capacity: number; multiplier: number }[] = [
  { label: 'Sedan', capacity: 4, multiplier: 1 },
  { label: 'SUV', capacity: 6, multiplier: 1.5 },
  { label: 'Tempo Traveller', capacity: 12, multiplier: 2.4 },
  { label: 'Luxury Sedan', capacity: 4, multiplier: 2 },
];

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/**
 * Same mock-provider constraint as HotelSearchService/FlightSearchService — no
 * transfer-supplier API key exists here. Deterministic per pickup/drop pair so
 * re-searching the same route returns a stable option set.
 */
@Injectable()
export class TransferSearchService {
  search(query: SearchTransfersQueryDto) {
    const baseSeed = hashString(`${query.pickup.toLowerCase()}-${query.drop.toLowerCase()}`);
    const optionCount = 2 + (baseSeed % (VEHICLE_TYPES.length - 1)); // 2-4 options

    return Array.from({ length: optionCount }).map((_, i) => {
      const vehicle = VEHICLE_TYPES[(baseSeed + i) % VEHICLE_TYPES.length];
      const seed = baseSeed + i * 43;
      const distanceKm = 8 + (seed % 60);
      const baseFare = Math.round((distanceKm * 22 + 300) * vehicle.multiplier);

      return {
        vehicleType: vehicle.label,
        capacity: vehicle.capacity,
        pickup: query.pickup,
        drop: query.drop,
        date: query.date,
        distanceKm,
        baseFare,
      };
    });
  }
}
