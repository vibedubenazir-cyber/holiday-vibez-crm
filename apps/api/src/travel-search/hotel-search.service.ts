import { Injectable } from '@nestjs/common';
import { SearchHotelsQueryDto } from './dto/travel-search.dto';

const HOTEL_NAMES = ['Grand Palm Resort', 'Ocean Breeze Suites', 'The Regency', 'Sunset Villas', 'Harbor View Hotel', 'Emerald Bay Retreat'];
const ROOM_TYPES = ['Standard', 'Deluxe', 'Suite'];
const MEAL_PLANS = ['Room Only', 'Breakfast Included', 'Half Board'];

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/**
 * No hotel-supplier API key exists in this environment — this generates plausible,
 * deterministic-per-destination results (same destination always returns the same
 * hotel set/rates) rather than either a static fixture or true randomness, so a
 * consultant re-searching the same trip sees consistent options. Swapping in a real
 * GDS/hotel API means replacing this class's search() method, not any caller.
 */
@Injectable()
export class HotelSearchService {
  search(query: SearchHotelsQueryDto) {
    const nights = Math.max(1, Math.round((new Date(query.checkOut).getTime() - new Date(query.checkIn).getTime()) / 86400000));
    const baseSeed = hashString(query.destination.toLowerCase().trim());
    const hotelCount = 4 + (baseSeed % 3); // 4-6 hotels

    return Array.from({ length: hotelCount }).map((_, hotelIndex) => {
      const seed = baseSeed + hotelIndex * 97;
      const starRating = 3 + (seed % 3); // 3-5 stars
      const name = HOTEL_NAMES[(seed >> 3) % HOTEL_NAMES.length];
      const roomCount = 2 + (seed % 2); // 2-3 rooms

      const rooms = Array.from({ length: roomCount }).map((__, roomIndex) => {
        const roomSeed = seed + roomIndex * 13;
        const roomType = ROOM_TYPES[roomIndex % ROOM_TYPES.length];
        const mealPlan = MEAL_PLANS[roomSeed % MEAL_PLANS.length];
        const baseNightly = 2500 + starRating * 1200 + (roomIndex * 1800) + (roomSeed % 500);
        return {
          roomType,
          mealPlan,
          nightlyRate: baseNightly,
          totalRate: baseNightly * nights,
        };
      });

      return {
        hotelName: `${name} ${query.destination}`,
        destination: query.destination,
        starRating,
        address: `${100 + (seed % 900)} Beach Road, ${query.destination}`,
        checkIn: query.checkIn,
        checkOut: query.checkOut,
        nights,
        rooms,
      };
    });
  }
}
