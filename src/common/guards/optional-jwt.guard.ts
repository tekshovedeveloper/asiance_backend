import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtGuard extends AuthGuard('jwt') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      await super.canActivate(context);
    } catch {
      // No token or invalid token — allow request through with no user
    }
    return true;
  }

  handleRequest(_err: any, user: any) {
    return user ?? null;
  }
}
