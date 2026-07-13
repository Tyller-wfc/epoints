import { Controller, Get, Post, Body } from '@nestjs/common';
import { EpointsService } from './epoints.service';

@Controller('api')
export class EpointsController {
  constructor(private readonly epointsService: EpointsService) {}

  @Get('state')
  async getAppState() {
    return this.epointsService.getAppState();
  }

  @Post('users/current')
  async setCurrentUser(@Body('userId') userId: string) {
    return this.epointsService.setCurrentUser(userId);
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
    @Body('missionId') missionId: string, 
    @Body('isApproved') isApproved: boolean, 
    @Body('penalize') penalize?: boolean
  ) {
    return this.epointsService.verifyMission(missionId, isApproved, !!penalize);
  }

  @Post('missions/multiplier')
  async updateMultiplier(@Body('missionId') missionId: string, @Body('newMultiplier') newMultiplier: number) {
    return this.epointsService.updateMultiplier(missionId, Number(newMultiplier));
  }

  @Post('missions/create')
  async createMission(@Body() missionData: any) {
    return this.epointsService.createMission(missionData);
  }

  @Post('rewards/purchase')
  async purchaseReward(@Body('rewardId') rewardId: string, @Body('userId') userId: string) {
    return this.epointsService.purchaseReward(rewardId, userId);
  }

  @Get('transactions')
  async getTransactions() {
    return this.epointsService.getTransactions();
  }

  @Post('rewards/deliver')
  async deliverReward(@Body('txId') txId: string) {
    return this.epointsService.deliverReward(txId);
  }

  @Post('tickets/raise')
  async raiseAlert(@Body() ticketData: any) {
    return this.epointsService.raiseAlert(ticketData);
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

  @Post('settings/webhook')
  async updateWebhookUrl(@Body('url') url: string) {
    return this.epointsService.updateWebhookUrl(url);
  }

  @Post('duty/active')
  async setActiveDuty(@Body('dutyId') dutyId: string) {
    return this.epointsService.setActiveDuty(dutyId);
  }

  @Post('system/reset')
  async resetData() {
    return this.epointsService.resetData();
  }
}
