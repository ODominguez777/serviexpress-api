import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId, Types } from 'mongoose';
import {
  Request,
  RequestDocument,
  RequestStatus,
} from './schemas/request.schema';
import { User, UserDocument } from '../users/common/schemas/user.schema';
import { CreateRequestDto } from './dto/create-request/create-request.dto';
import { SkillService } from '../skill/skills.service';
import { ApiResponse } from '../users/dto/response.dto';
import { ChatService } from '../chat/chat.service';
import {
  Quotation,
  QuotationDocument,
} from './schemas/quotation-schema/quotation.schema';
import { CreateQuotationDto } from './dto/create-quotations/create-quotation.dto';
@Injectable()
export class RequestsService {
  constructor(
    @InjectModel(Request.name)
    private readonly requestModel: Model<RequestDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Quotation.name)
    private readonly quotationModel: Model<QuotationDocument>,
    private readonly skillService: SkillService,
    private readonly chatService: ChatService,
  ) {}

  async createRequest(
    clientId: string,
    createRequestDto: CreateRequestDto,
  ): Promise<ApiResponse<any>> {
    const session = await this.requestModel.db.startSession();
    session.startTransaction();

    try {
      const { handymanEmail, description, location, categories } = createRequestDto;

      const client: UserDocument | null = await this.userModel.findById(clientId).session(session);
      if (!client) {
        throw new NotFoundException('Client not found');
      }

      const handyman: UserDocument | null = await this.userModel
        .findOne({ email: handymanEmail, role: 'handyman' })
        .session(session);
      if (!handyman) {
        throw new NotFoundException('Handyman not found');
      }

      const existingRequest = await this.requestModel
        .findOne({ clientId: client._id, handymanId: handyman._id, status: {$in: ['pending', "accepted", "payed"]} })
        .session(session);

      if (existingRequest) {
        throw new ConflictException(`You already have one ${existingRequest.status} request with this handyman, wait until it is completed`);
      }

      if (!handyman.coverageArea?.includes(location.municipality)) {
        throw new ForbiddenException(
          `The handyman does not cover the municipality: ${location.municipality}`,
        );
      }

      const skillIds = await Promise.all(
        categories.map(async (category) => {
          const skill = await this.skillService.getSkillByName(category);
          if (!skill) {
            throw new NotFoundException(`Skill ${category} not found`);
          }
          return skill.data._id;
        }),
      );

      const handymanSkills = handyman.skills?.map((skill) => skill.toString());
      const invalidSkills = skillIds.filter(
        (skillId) => !handymanSkills?.includes(skillId.toString()),
      );

      if (invalidSkills.length > 0) {
        throw new ForbiddenException(
          `The handyman does not have the required skills: ${categories.join(', ')}`,
        );
      }

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const newRequest = new this.requestModel({
        clientId: client._id,
        handymanId: handyman._id,
        description,
        expiresAt,
        location,
        categories: skillIds,
      });

      const savedRequest = await newRequest.save({ session });

      if(!savedRequest._id || !client._id || !handyman._id) {
        throw new ConflictException('Error saving request');
      }
    
      const channelId = `request-${savedRequest._id.toString()}`;
      await this.chatService.createChannel(
        channelId,
        [client._id.toString(), handyman._id.toString()],
        client._id.toString(),
      );

      // Asociar el canal con la solicitud
      savedRequest.channelId = channelId;
      await savedRequest.save({ session });

      // Confirmar la transacción
      await session.commitTransaction();
      session.endSession();

      // Enviar mensaje al canal
      const messageText = `Nueva solicitud: ${description}\nMunicipio: ${location.municipality}\nBarrio: ${location.neighborhood}\nDirección: ${location.address}\nCategorías: ${categories.join(
        ', ',
      )}`;
      try {
        await this.chatService.sendMessage(channelId, client._id.toString(), messageText);
      } catch (error) {
        // Manejar el error del mensaje sin afectar la base de datos
        console.error('Error al enviar el mensaje:', error);
      }

      return new ApiResponse(200, 'Request created successfully', savedRequest);
    } catch (error) {
      await session.abortTransaction(); 
      session.endSession();
      throw error;
    }
  }

  async getClientRequests(clientId: string): Promise<Request[]> {
    const requests = await this.requestModel
      .find({ clientId: new Types.ObjectId(clientId) }) // Filtrar por el ID del cliente
      .populate('handymanId', 'name lastName email') // Poblar datos del handyman
      .populate('categories', 'skillName') // Poblar categorías
      .exec();
  
    if (!requests || requests.length === 0) {
      throw new NotFoundException('No requests found for this client');
    }
  
    return requests;
  }
  async getRequestById(requestId: string): Promise<Request> {
    const request = await this.requestModel
      .findById(requestId)
      .populate('clientId', 'name email')
      .populate('handymanId', 'name email')
      .populate('categories', 'skillName')
      .exec();

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    return request;
  }

  async createQuotation(
    handymanId: string,
    requestId: string,
    createQuotationDto: CreateQuotationDto,
  ): Promise<ApiResponse<any>> {
    const {  amount, description, action } = createQuotationDto;
    const request = await this.requestModel.findById(requestId);

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    if (request.handymanId.toString() !== handymanId) {
      throw new ForbiddenException(
        'You are not authorized to respond to this request',
      );
    }

    if (request.status !== RequestStatus.PENDING) {
      throw new ConflictException('This request has already been processed');
    }

    if(!request._id){
      throw new NotFoundException('Request ID not found');

    }
    const channelId = `request-${request._id.toString()}`;

    if (action === 'accept') {
      // Actualizar el estado de la solicitud a "accepted"
      request.status = RequestStatus.ACCEPTED;
      await request.save();

      // Enviar mensaje de aceptación
      const acceptanceMessage = `La solicitud ha sido aceptada.`;
      await this.chatService.sendMessage(
        channelId,
        handymanId,
        acceptanceMessage,
      );

      // Enviar detalles de la factura

      const invoiceMessage = `Detalles de la factura: \n Costo: C$${amount} \n Descripción: ${description}`;
      await this.chatService.sendMessage(channelId, handymanId, invoiceMessage);

      const newQuotation = new this.quotationModel({
        requestId: request._id,
        handymanId: handymanId,
        amount,
        description,
        status: 'pending',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Expira en 7 días
      });
      const savedQuotation = await newQuotation.save();
      return new ApiResponse(200, 'Request accepted successfully', null);
    } else if (action === 'reject') {
      // Actualizar el estado de la solicitud a "rejected"
      request.status = RequestStatus.REJECTED;


      // Enviar mensaje de rechazo
      const rejectionMessage = `La solicitud ha sido rechazada.`;
      await this.chatService.sendMessage(
        channelId,
        handymanId,
        rejectionMessage,
      );
      await request.save();

      return new ApiResponse(200, 'Request rejected successfully', request);
    }

    throw new BadRequestException('Invalid action');
  }
}
