import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Mission } from './entities/mission.entity';
import { Reward } from './entities/reward.entity';
import { Transaction } from './entities/transaction.entity';
import { Ticket } from './entities/ticket.entity';
import { Duty } from './entities/duty.entity';
import { Feed } from './entities/feed.entity';
import { Setting } from './entities/setting.entity';
import { EpointsService } from './epoints.service';
import { EpointsController } from './epoints.controller';
import { DatabaseSeedService } from './database-seed.service';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { Credential } from './entities/credential.entity';
import { Attachment } from './entities/attachment.entity';
import { StorageService } from './storage.service';
import { ConfigModule } from '@nestjs/config';
import { Role } from './entities/role.entity';
import { TaskDomain } from './entities/task-domain.entity';
import { RoleTaskDomain } from './entities/role-task-domain.entity';
import { UserRole } from './entities/user-role.entity';
import { MissionDomain } from './entities/mission-domain.entity';
import { MissionNotificationRecipient } from './entities/mission-notification-recipient.entity';
import { PiiService } from './pii.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT || 3306),
      username: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'epoints',
      entities: [User, Mission, Reward, Transaction, Ticket, Duty, Feed, Setting, Credential, Attachment, Role, TaskDomain, RoleTaskDomain, UserRole, MissionDomain, MissionNotificationRecipient],
      synchronize: false,
      charset: 'utf8mb4',
    }),
    TypeOrmModule.forFeature([User, Mission, Reward, Transaction, Ticket, Duty, Feed, Setting, Credential, Attachment, Role, TaskDomain, RoleTaskDomain, UserRole, MissionDomain, MissionNotificationRecipient]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'epoints-local-development-secret-change-me',
      signOptions: { expiresIn: '8h' },
    }),
  ],
  controllers: [EpointsController, AuthController],
  providers: [EpointsService, DatabaseSeedService, AuthService, StorageService, PiiService, { provide: APP_GUARD, useClass: AuthGuard }],
})
export class AppModule {}
