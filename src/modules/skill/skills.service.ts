import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';
import { Skill, SkillDocument } from './schemas/skill.schema';
import { CreateSkillDto } from './dto/create-skill.dto';
import { ApiResponse } from '../users/dto/response.dto';
import {Types} from 'mongoose';
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

  async mapIdsToSkillNames(skillIds: ObjectId[]): Promise<string[]> {
    const skills = await this.skillModel.find({ _id: { $in: skillIds } }, 'skillName -_id');
    if (!skills || skills.length === 0) {
      throw new NotFoundException('Skills not found');
    }
    return skills.map((skill) => skill.skillName);
  }

  async mapSkillNamesToIds(skillNames: string[]): Promise<ObjectId[]> {
    const skills = await this.skillModel.find({ skillName: { $in: skillNames } });
    if (!skills || skills.length === 0) {
      throw new NotFoundException('Skills not found');
    }

  
    
     return skills.map((skill) => skill._id as ObjectId);
  }

}
