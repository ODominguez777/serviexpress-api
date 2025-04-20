import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { SkillService } from './skills.service';
import { CreateSkillDto } from './dto/create-skill.dto';
import { ApiResponse } from '../users/dto/response.dto';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from 'src/utils/decorators/roles.decorators';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from 'src/guards/roles.guard';

@Controller('skills')
export class SkillController {
  constructor(private readonly skillService: SkillService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async createSkill(
    @Body() createSkillDto: CreateSkillDto,
  ): Promise<ApiResponse<any>> {
    const skill = await this.skillService.createSkill(createSkillDto);
    return new ApiResponse(201, 'Skill created successfully', skill);
  }

  @Get()
  async getAllSkills(): Promise<ApiResponse<any>> {
    return this.skillService.getAllSkills();
  }

  @Get(':skillName')
  async getSkillByName(@Param('skillName') skillName: string): Promise<ApiResponse<any>> {
    return this.skillService.getSkillByName(skillName);
  }
}
