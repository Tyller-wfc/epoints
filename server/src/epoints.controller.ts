import { Controller, Delete, Get, Post, Put, Body, Req, UseInterceptors, UploadedFile, UploadedFiles, Param, Res } from '@nestjs/common';
import { EpointsService } from './epoints.service';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';

const uploadOptions = {
  storage: memoryStorage(),
  limits: { files: 10, fileSize: 20 * 1024 * 1024 },
};

const avatarUploadOptions = {
  storage: memoryStorage(),
  limits: { files: 1, fileSize: 5 * 1024 * 1024 },
};

const rewardImageUploadOptions = {
  storage: memoryStorage(),
  limits: { files: 1, fileSize: 5 * 1024 * 1024 },
};

@Controller('api')
export class EpointsController {
  constructor(private readonly epointsService: EpointsService) {}

  @Get('state')
  async getAppState(@Req() request: any) {
    return this.epointsService.getAppState(request.user.sub);
  }

  @Get('personnel')
  async getPersonnel(@Req() request: any) {
    return this.epointsService.getPersonnel(request.user.sub);
  }

  @Put('personnel/:id')
  async updatePersonnel(@Req() request: any, @Param('id') id: string, @Body() data: any) {
    return this.epointsService.updatePersonnel(request.user.sub, id, data);
  }

  @Post('personnel')
  async createPersonnel(@Req() request: any, @Body() data: any) {
    return this.epointsService.createPersonnel(request.user.sub, data);
  }

  @Delete('personnel/:id')
  async deletePersonnel(@Req() request: any, @Param('id') id: string) {
    return this.epointsService.deletePersonnel(request.user.sub, id);
  }

  @Post('personnel/:id/avatar')
  @UseInterceptors(FileInterceptor('avatar', avatarUploadOptions))
  async updatePersonnelAvatar(@Req() request: any, @Param('id') id: string, @UploadedFile() file?: Express.Multer.File) {
    return this.epointsService.updatePersonnelAvatar(request.user.sub, id, file);
  }

  @Delete('personnel/:id/avatar')
  async resetPersonnelAvatar(@Req() request: any, @Param('id') id: string) {
    return this.epointsService.resetPersonnelAvatar(request.user.sub, id);
  }

  @Get('personnel/:id/avatar')
  async getPersonnelAvatar(@Param('id') id: string, @Res() response: Response) {
    const { mimeType, stream } = await this.epointsService.getPersonnelAvatar(id);
    response.setHeader('Content-Type', mimeType);
    response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    stream.pipe(response);
  }

  @Post('missions/notification-preview')
  async previewMissionRecipients(@Req() request: any, @Body() data: any) {
    return this.epointsService.previewMissionRecipients(request.user.sub, data);
  }

  @Post('missions/claim')
  async claimMission(@Body('missionId') missionId: string, @Body('userId') userId: string) {
    return this.epointsService.claimMission(missionId, userId);
  }

  @Post('missions/submit')
  async submitProof(@Body('missionId') missionId: string, @Body('proofText') proofText: string) {
    return this.epointsService.submitProof(missionId, proofText);
  }

  @Post('missions/verify')
  async verifyMission(
    @Req() request: any,
    @Body('missionId') missionId: string, 
    @Body('isApproved') isApproved: boolean, 
    @Body('penalize') penalize?: boolean
  ) {
    return this.epointsService.verifyMission(request.user.sub, missionId, isApproved, !!penalize);
  }

  @Post('missions/multiplier')
  async updateMultiplier(@Req() request: any, @Body('missionId') missionId: string, @Body('newMultiplier') newMultiplier: number) {
    return this.epointsService.updateMultiplier(request.user.sub, missionId, Number(newMultiplier));
  }

  @Post('missions/create')
  @UseInterceptors(FilesInterceptor('files', 10, uploadOptions))
  async createMission(@Req() request: any, @Body() missionData: any, @UploadedFiles() files: Express.Multer.File[]) {
    return this.epointsService.createMission(missionData, files || [], request.user.sub, request.headers.origin || '');
  }

  @Post('rewards/purchase')
  async purchaseReward(@Body('rewardId') rewardId: string, @Body('userId') userId: string) {
    return this.epointsService.purchaseReward(rewardId, userId);
  }

  @Post('rewards')
  @UseInterceptors(FileInterceptor('imageFile', rewardImageUploadOptions))
  async createReward(@Req() request: any, @Body() data: any, @UploadedFile() imageFile?: Express.Multer.File) {
    return this.epointsService.createReward(request.user.sub, data, imageFile);
  }

  @Put('rewards/:id')
  @UseInterceptors(FileInterceptor('imageFile', rewardImageUploadOptions))
  async updateReward(@Req() request: any, @Param('id') id: string, @Body() data: any, @UploadedFile() imageFile?: Express.Multer.File) {
    return this.epointsService.updateReward(request.user.sub, id, data, imageFile);
  }

  @Delete('rewards/:id')
  async deleteReward(@Req() request: any, @Param('id') id: string) {
    return this.epointsService.deleteReward(request.user.sub, id);
  }

  @Get('rewards/:id/image')
  async getRewardImage(@Param('id') id: string, @Res() response: Response) {
    const { attachment, stream } = await this.epointsService.getRewardImage(id);
    response.setHeader('Content-Type', attachment.mimeType);
    response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    stream.pipe(response);
  }

  @Get('transactions')
  async getTransactions(@Req() request: any) {
    return this.epointsService.getTransactions(request.user.sub);
  }

  @Post('rewards/deliver')
  async deliverReward(@Req() request: any, @Body('txId') txId: string) {
    return this.epointsService.deliverReward(request.user.sub, txId);
  }

  @Post('tickets/raise')
  @UseInterceptors(FilesInterceptor('files', 10, uploadOptions))
  async raiseAlert(@Req() request: any, @Body() ticketData: any, @UploadedFiles() files: Express.Multer.File[]) {
    return this.epointsService.raiseAlert(ticketData, files || [], request.user.sub);
  }

  @Get('attachments/:id/content')
  async getAttachment(@Param('id') id: string, @Res() response: Response) {
    const { attachment, stream } = await this.epointsService.getAttachmentFile(id);
    response.setHeader('Content-Type', attachment.mimeType);
    response.setHeader('Content-Length', attachment.fileSize);
    response.setHeader('Content-Disposition', `${attachment.isImage ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(attachment.originalName)}`);
    response.setHeader('Cache-Control', 'private, max-age=3600');
    stream.pipe(response);
  }

  @Post('tickets/acknowledge')
  async acknowledgeTicket(@Body('ticketId') ticketId: string, @Body('userId') userId: string) {
    return this.epointsService.acknowledgeTicket(ticketId, userId);
  }

  @Post('tickets/resolve')
  async resolveTicket(@Body('ticketId') ticketId: string, @Body('resolutionNote') resolutionNote: string) {
    return this.epointsService.resolveTicket(ticketId, resolutionNote);
  }

  @Post('tickets/negligence')
  async penalizeNegligence(@Body('ticketId') ticketId: string) {
    return this.epointsService.penalizeNegligence(ticketId);
  }

  @Post('tickets/secondary')
  async flagSecondaryIncident(@Body('ticketId') ticketId: string) {
    return this.epointsService.flagSecondaryIncident(ticketId);
  }

  @Post('settings/wecom')
  async updateWecomConfig(@Req() request: any, @Body('url') url: string, @Body('mentionMobiles') mentionMobiles: string[]) {
    return this.epointsService.updateWecomConfig(request.user.sub, url, mentionMobiles);
  }

  @Post('settings/wecom/test')
  async testWecomWebhook(@Req() request: any, @Body('url') url?: string, @Body('mentionMobiles') mentionMobiles?: string[]) {
    return this.epointsService.testWecomWebhook(request.user.sub, url, mentionMobiles);
  }

  @Post('duty/active')
  async setActiveDuty(@Req() request: any, @Body('dutyId') dutyId: string) {
    return this.epointsService.setActiveDuty(request.user.sub, dutyId);
  }

  @Post('duty')
  async createDuty(@Req() request: any, @Body() data: { userId: string; dutyDate: string; shiftStart: string; shiftEnd: string }) {
    return this.epointsService.createDuty(request.user.sub, data);
  }

  @Delete('duty/:id')
  async deleteDuty(@Req() request: any, @Param('id') id: string) {
    return this.epointsService.deleteDuty(request.user.sub, id);
  }

  @Post('system/reset')
  async resetData(@Req() request: any) {
    return this.epointsService.resetData(request.user.sub);
  }
}
