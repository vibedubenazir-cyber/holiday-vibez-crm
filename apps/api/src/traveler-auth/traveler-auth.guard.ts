import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { TravelerAuthService } from './traveler-auth.service';

/**
 * Guards every traveller-app route. Reads the opaque bearer token the PWA
 * stores after OTP verification and attaches the resolved session to the
 * request, so controllers never take a travelerId/bookingId from the client —
 * both come from the server-side session, which is what keeps one traveller
 * from reading another's trip by editing an id.
 */
@Injectable()
export class TravelerAuthGuard implements CanActivate {
  constructor(private readonly travelerAuth: TravelerAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const header: string | undefined = request.headers?.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Sign in to view your trip');
    }

    const session = await this.travelerAuth.resolveSession(header.slice('Bearer '.length).trim());
    if (!session) throw new UnauthorizedException('Your session has expired — sign in again');

    request.travelerSession = session;
    return true;
  }
}
