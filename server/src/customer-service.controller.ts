import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { CustomerServiceService } from './customer-service.service';

@Controller('api/service-center')
export class CustomerServiceController {
  constructor(private readonly service: CustomerServiceService) {}

  @Get()
  getCenter(@Req() request: any) {
    return this.service.getCenter(request.user.sub);
  }

  @Post('customers')
  createCustomer(@Req() request: any, @Body() data: any) {
    return this.service.createCustomer(request.user.sub, data);
  }

  @Post('records')
  createRecord(@Req() request: any, @Body() data: any) {
    return this.service.createRecord(request.user.sub, data);
  }

  @Post('records/:id/transition')
  transition(@Req() request: any, @Param('id') id: string, @Body() data: any) {
    return this.service.transitionRecord(request.user.sub, id, data);
  }

  @Post('records/:id/feedback')
  addFeedback(@Req() request: any, @Param('id') id: string, @Body() data: any) {
    return this.service.addFeedback(request.user.sub, id, data);
  }

  @Post('records/:id/participants/:participantId/evaluate')
  evaluate(@Req() request: any, @Param('id') id: string, @Param('participantId') participantId: string, @Body() data: any) {
    return this.service.evaluateParticipant(request.user.sub, id, participantId, data);
  }
}
