import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Rating } from './schemas/rating.schema';
import { User } from '../users/common/schemas/user.schema';

@Injectable()
export class RatingService {
  constructor(
    @InjectModel(Rating.name) private readonly ratingModel: Model<Rating>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  async rateHandyman(
    clientEmail: string,
    handymanEmail: string,
    ratingValue: number,
  ): Promise<{ averageRating: number; totalRatings: number }> {

    // Revisar si el handyman existe
    const handyman = await this.userModel.findOne({
      email: handymanEmail,
      role: 'handyman',
    });
    if (!handyman) {
      throw new NotFoundException('Handyman not found');
    }

    // Revisar si el cliente existe
    const client = await this.userModel.findOne({
      email: clientEmail,
      role: 'client',
    });
    if (!client) {
      throw new NotFoundException('Client not found');
    }

    const handymanId = handyman._id;
    const clientId = client._id;

    // Verificar si ya existe una calificación del cliente hacia el handyman
    const existingRating = await this.ratingModel.findOne({
      clientId,
      handymanId,
    });

    if (existingRating) {
      // Actualizar la calificación existente
      existingRating.rating = ratingValue;
      await existingRating.save();
    } else {
      // Crear una nueva calificación
      await this.ratingModel.create({
        clientId,
        handymanId,
        rating: ratingValue,
      });
    }

    // Recalcular el promedio de calificaciones del handyman
    const ratings = await this.ratingModel.find({ handymanId });
    const totalRatings = ratings.length;
    const averageRating =
      ratings.reduce((sum, r) => sum + r.rating, 0) / totalRatings;

    // Actualizar el promedio en el perfil del handyman
    handyman.rating = averageRating;
    await handyman.save();

    return { averageRating, totalRatings };
  }
}
