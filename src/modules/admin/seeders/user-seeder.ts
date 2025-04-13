import { Injectable } from '@nestjs/common';
import { UsersService } from '../../users/users.service';
import { CreateUserDto } from '../../users/dto/create-user.dto';
import { UserRole } from '../../users/schemas/user.schema';
import { faker } from '@faker-js/faker';

@Injectable()
export class UserSeeder {
  constructor(private readonly usersService: UsersService) {}

  async seedUsers(): Promise<void> {
    console.log('Hola desde el seeder de usuarios!');
    const users: CreateUserDto[] = [];
    const handymen: CreateUserDto[] = [];

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
        municipality: "sanyorsh",
        neighborhood: "the puebleishon",
        address: "ya te la sabes we",
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
        municipality: "sanyorsh",
        profilePicture: `https://api.dicebear.com/9.x/pixel-art/svg?seed=${faker.name.firstName()}`,
        neighborhood: "the puebleishon",
        personalDescription: faker.lorem.sentence(),
        address: "ya te la sabes we",
        source: faker.lorem.sentence(),
        skills: randomSkills,
        coverageArea: [faker.address.city()],
        rating: 0,
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