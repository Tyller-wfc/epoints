import { Body, Controller, Get, Param, Post, Put, Req, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CustomerServiceService } from './customer-service.service';

const uploadOptions = {
  storage: memoryStorage(),
  limits: { files: 10, fileSize: 20 * 1024 * 1024 },
};

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
  @UseInterceptors(FilesInterceptor('files', 10, uploadOptions))
  createRecord(@Req() request: any, @Body() data: any, @UploadedFiles() files: Express.Multer.File[]) {
    return this.service.createRecord(request.user.sub, data, request.headers?.origin || '', files || []);
  }

  @Put('records/:id')
  updateReturnedRecord(@Req() request: any, @Param('id') id: string, @Body() data: any) {
    return this.service.updateReturnedRecord(request.user.sub, id, data, request.headers?.origin || '');
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
