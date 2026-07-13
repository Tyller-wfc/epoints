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

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: '192.168.31.180',
      port: 3306,
      username: 'root',
      password: '1qaz@WSX',
      database: 'epoints',
      entities: [User, Mission, Reward, Transaction, Ticket, Duty, Feed, Setting],
      synchronize: true,
      charset: 'utf8mb4',
    }),
    TypeOrmModule.forFeature([User, Mission, Reward, Transaction, Ticket, Duty, Feed, Setting]),
  ],
  controllers: [EpointsController],
  providers: [EpointsService, DatabaseSeedService],
})
export class AppModule {}
