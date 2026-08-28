import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  // Service identity at the API root; useful as a minimal reachability probe
  @Get()
  getServiceInfo(): { service: string } {
    return { service: 'promotions-api' };
  }
}
