import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body('username') username: string, @Body('password') password: string) {
    return this.authService.login(username, password);
  }

  @Get('me')
  profile(@Req() request: any) {
    return this.authService.profile(request.user.sub);
  }

  @Post('change-password')
  changePassword(
    @Req() request: any,
    @Body('oldPassword') oldPassword: string,
    @Body('newPassword') newPassword: string,
  ) {
    return this.authService.changePassword(request.user.sub, oldPassword, newPassword);
  }
}
