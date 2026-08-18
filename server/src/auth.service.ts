import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from './entities/user.entity';
import { EpointsService } from './epoints.service';
import { Credential } from './entities/credential.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Credential) private readonly credentialRepo: Repository<Credential>,
    private readonly jwtService: JwtService,
    private readonly epointsService: EpointsService,
  ) {}

  async login(username: string, password: string) {
    if (!username || !password) throw new UnauthorizedException('请输入账号和密码');
    const credential = await this.credentialRepo
      .createQueryBuilder('credential')
      .addSelect('credential.passwordHash')
      .where('credential.username = :username', { username: username.trim() })
      .getOne();
    if (!credential?.passwordHash || !(await bcrypt.compare(password, credential.passwordHash))) {
      throw new UnauthorizedException('账号或密码错误');
    }
    const user = await this.userRepo.findOne({ where: { id: credential.userId } });
    if (!user) throw new UnauthorizedException('登录用户不存在');
    await this.epointsService.setCurrentUser(user.id);
    return {
      accessToken: await this.jwtService.signAsync({ sub: user.id, username: credential.username }),
      user,
    };
  }

  async profile(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('登录用户不存在');
    await this.epointsService.setCurrentUser(user.id);
    return user;
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    if (!oldPassword || !newPassword) throw new BadRequestException('请填写旧密码和新密码');
    if (newPassword.length < 6) throw new BadRequestException('新密码不能少于 6 位');
    const credential = await this.credentialRepo
      .createQueryBuilder('credential')
      .addSelect('credential.passwordHash')
      .where('credential.userId = :userId', { userId })
      .getOne();
    if (!credential) throw new UnauthorizedException('凭证不存在');
    if (!(await bcrypt.compare(oldPassword, credential.passwordHash))) {
      throw new BadRequestException('旧密码不正确');
    }
    credential.passwordHash = await bcrypt.hash(newPassword, 10);
    await this.credentialRepo.save(credential);
    return { message: '密码修改成功' };
  }
}
