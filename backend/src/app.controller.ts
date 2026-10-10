import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('api/resources')
  listResources(
    @Query('q') query?: string,
    @Query('category') category?: string,
    @Query('visitorId') visitorId?: string,
  ) {
    return this.appService.listResources(query, category, visitorId);
  }

  @Post('api/resources')
  submitResource(
    @Body()
    submission: {
      name: string;
      url: string;
      description: string;
      category: string;
      subcategory: string;
      tags: string;
      collection?: string;
    },
  ) {
    return this.appService.submitResource(submission);
  }

  @Post('api/resources/:id/save')
  saveResource(@Param('id') id: string, @Body('visitorId') visitorId?: string) {
    return this.appService.toggleSaved(id, visitorId || 'anonymous');
  }
}
