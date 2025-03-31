import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Skill, SkillDocument } from './schemas/skill.schema';
import { CreateSkillDto } from './dto/create-skill.dto';
import { ApiResponse } from '../users/dto/response.dto';

@Injectable()
export class SkillService {
  constructor(
    @InjectModel(Skill.name) private skillModel: Model<SkillDocument>,
  ) {}

  async createSkill(createSkillDto: CreateSkillDto): Promise<Skill> {
    return this.skillModel.create(createSkillDto);
  }

  async getAllSkills(): Promise<ApiResponse<any>> {
    const result = await this.skillModel.find({}, 'skillName description -_id');

    if (!result) {
      throw new NotFoundException('Skill not found');
    }
    return new ApiResponse(200, 'Skills retrieved successfully', result);
  }

  async getSkillByName(skillName: string): Promise<ApiResponse<any>> {
    const result = await this.skillModel.findOne({skillName}).exec();

    if (!result) {
      throw new NotFoundException('Skill not found');
    }
    const skill = {
        skillName:  result.skillName,
        description: result.description,
        _id: result._id
    }
    return new ApiResponse(200, 'Skill retrieved successfully', skill);
  }
}
