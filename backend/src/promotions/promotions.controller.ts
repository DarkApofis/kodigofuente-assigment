import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ApiErrorResponse } from '../common/api-error.response';
import { ChangeStatusDto } from './dto/change-status.dto';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { ListPromotionsQueryDto } from './dto/list-promotions.query';
import {
  PromotionResponse,
  PromotionsSummaryResponse,
} from './dto/promotion-response';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import {
  PromotionsService,
  PromotionsSummary,
  PromotionView,
} from './promotions.service';

@ApiTags('promotions')
@Controller('promotions')
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Get()
  @ApiOperation({
    summary: 'List promotions with the derived isActiveToday flag',
  })
  @ApiOkResponse({ type: PromotionResponse, isArray: true })
  findAll(@Query() query: ListPromotionsQueryDto): Promise<PromotionView[]> {
    return this.promotionsService.findAll(query.status);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Counts by status plus promotions in force today' })
  @ApiOkResponse({ type: PromotionsSummaryResponse })
  getSummary(): Promise<PromotionsSummary> {
    return this.promotionsService.getSummary();
  }

  @Post()
  @ApiOperation({ summary: 'Create a promotion (always starts as SCHEDULED)' })
  @ApiCreatedResponse({ type: PromotionResponse })
  @ApiBadRequestResponse({
    type: ApiErrorResponse,
    description: 'Payload violates a validation rule or business invariant',
  })
  @ApiNotFoundResponse({
    type: ApiErrorResponse,
    description: 'Target product or category does not exist',
  })
  create(@Body() dto: CreatePromotionDto): Promise<PromotionView> {
    return this.promotionsService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Partially update a promotion (rejected once ENDED)',
  })
  @ApiOkResponse({ type: PromotionResponse })
  @ApiConflictResponse({
    type: ApiErrorResponse,
    description: 'The promotion is ENDED and can no longer be modified',
  })
  @ApiNotFoundResponse({ type: ApiErrorResponse })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePromotionDto,
  ): Promise<PromotionView> {
    return this.promotionsService.update(id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary:
      'Manual status transition (SCHEDULED -> ACTIVE -> ENDED, no skips)',
  })
  @ApiOkResponse({ type: PromotionResponse })
  @ApiConflictResponse({
    type: ApiErrorResponse,
    description: 'The requested transition is not allowed',
  })
  @ApiNotFoundResponse({ type: ApiErrorResponse })
  changeStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeStatusDto,
  ): Promise<PromotionView> {
    return this.promotionsService.changeStatus(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a promotion (only while SCHEDULED)' })
  @ApiNoContentResponse({ description: 'Promotion deleted' })
  @ApiConflictResponse({
    type: ApiErrorResponse,
    description: 'Only SCHEDULED promotions can be deleted',
  })
  @ApiNotFoundResponse({ type: ApiErrorResponse })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.promotionsService.remove(id);
  }
}
