import { Injectable, NotFoundException } from '@nestjs/common';
import { UsersService } from '../common/users.service';

@Injectable()
export class ClientsService extends UsersService {
  

}