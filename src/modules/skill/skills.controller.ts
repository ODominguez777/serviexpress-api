import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  NotFoundException,
} from '@nestjs/common';
import { SkillService } from './skills.service';
import { CreateSkillDto } from './dto/create-skill.dto';
import { ApiResponse } from '../users/dto/response.dto';

@Controller('skills')
export class SkillController {
  constructor(private readonly skillService: SkillService) {}

  @Post()
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
