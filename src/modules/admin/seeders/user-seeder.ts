import { Injectable } from '@nestjs/common';
import { UsersService } from '../../users/common/users.service';
import { CreateUserDto } from '../../users/common/dto/create-user.dto';
import { UserRole } from '../../users/common/schemas/user.schema';
import { faker } from '@faker-js/faker';
import { CreateClientDto } from 'src/modules/users/clients/dto/create-client.dto';
import { CreateHandymanDto } from 'src/modules/users/handymen/dto/create-handyman.dto';

@Injectable()
export class UserSeeder {
  constructor(private readonly usersService: UsersService) {}

  async seedUsers(): Promise<void> {
    console.log('Hola desde el seeder de usuarios!');
    const users: CreateClientDto[] = [];
    const handymen: CreateHandymanDto[] = [];

    const skills = [
        "Carpintería",
        "Albañilería",
        "Electricista",
        "Fontanería",
        "Pintura",
        "Soldadura",
        "Cerrajería",
        "Jardinería",
        "Refrigeración y aire acondicionado"
      ]

    function getRandomSkills(skills: string[], count: number): string[] {
      const shuffled = [...skills].sort(() => 0.5 - Math.random()); // Mezclar aleatoriamente
      return shuffled.slice(0, count); // Tomar los primeros `count` elementos
    }
      
    // Generar 20 usuarios
    for (let i = 0; i < 20; i++) {

        const randomSkills = getRandomSkills(skills, faker.number.int({ min: 2, max: 5 }));
      users.push({
        googleId: "password",
        name: faker.name.firstName(),
        lastName: faker.name.lastName(),
        email: faker.internet.email(),
        phone: faker.phone.number(),
        role: UserRole.CLIENT,
        profilePicture: `https://api.dicebear.com/9.x/pixel-art/svg?seed=${faker.name.firstName()}`,
        municipality: faker.address.city(),
        neighborhood: faker.address.city(),
        address: faker.address.streetAddress(),
        source: faker.lorem.sentence(),
      preferences: randomSkills,
      });
    }

    // Generar 20 handymen
    for (let i = 0; i < 20; i++) {
      const randomSkills = getRandomSkills(skills, faker.number.int({ min: 2, max: 5 }));
      handymen.push({
        googleId: "password",
        name: faker.name.firstName(),
        lastName: faker.name.lastName(),
        email: faker.internet.email(),
        phone: faker.phone.number(),
        role: UserRole.HANDYMAN,
        profilePicture: `https://api.dicebear.com/9.x/pixel-art/svg?seed=${faker.name.firstName()}`,
        personalDescription: faker.lorem.sentence(),
        skills: randomSkills,
        coverageArea: [faker.address.city()],
      });
    }

    // Crear usuarios en la base de datos
    for (const user of users) {
      await this.usersService.createUser(user);
    }

    // Crear handymen en la base de datos
    for (const handyman of handymen) {
      await this.usersService.createUser(handyman);
    }

    console.log('Seeder completed: 20 users and 20 handymen created.');
  }
}