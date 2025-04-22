import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, Types } from 'mongoose';
import { Rating } from './schemas/rating.schema';
import { User } from '../users/common/schemas/user.schema';

@Injectable()
export class RatingService {
  constructor(
    @InjectModel(Rating.name) private readonly ratingModel: Model<Rating>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  async rateHandyman(
    clientId: string,
    identifier: string,
    rating: number,
  ): Promise<{ averageRating: number; totalRatings: number }> {
    let handyman;
    if (isValidObjectId(identifier)) {
      handyman = await this.userModel
        .findById(new Types.ObjectId(identifier))
        .exec();
    } else {
      handyman = await this.userModel.findOne({ email: identifier }).exec();
    }

    if (!handyman) {
      throw new NotFoundException('Handyman not found');
    }

    // Revisar si el cliente existe
    const client = await this.userModel.findById(new Types.ObjectId(clientId)).exec();
    if (!client) {
      throw new NotFoundException('Client not found');
    }

    const handymanId = handyman._id;
    const newClientId = client._id;

    // Verificar si ya existe una calificación del cliente hacia el handyman
    const existingRating = await this.ratingModel.findOne({
      clientId:newClientId,
      handymanId,
    });

    if (existingRating) {
      // Actualizar la calificación existente
      existingRating.rating = rating;
      await existingRating.save();
    } else {
      // Crear una nueva calificación
      await this.ratingModel.create({
        clientId: newClientId,
        handymanId,
        rating,
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
