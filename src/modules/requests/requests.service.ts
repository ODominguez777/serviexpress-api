import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  InternalServerErrorException,
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
import {
  Quotation,
  QuotationDocument,
} from './schemas/quotation-schema/quotation.schema';
import { CreateQuotationDto } from './dto/create-quotations/create-quotation.dto';
import { ChatAdapter } from '../chat/adapter/chat.adapter';
import { CHAT_ADAPTER } from '../chat/chat.constants';
@Injectable()
export class RequestsService {
  constructor(
    @InjectModel(Request.name)
    private readonly requestModel: Model<RequestDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Quotation.name)
    private readonly quotationModel: Model<QuotationDocument>,
    private readonly skillService: SkillService,
    @Inject(CHAT_ADAPTER) private readonly chat: ChatAdapter,
  ) {}

  async createRequest(
    clientId: string,
    createRequestDto: CreateRequestDto,
  ): Promise<ApiResponse<any>> {
    const session = await this.requestModel.db.startSession();
    session.startTransaction();

    try {
      const { handymanEmail, description, location, categories } =
        createRequestDto;

      const { client, handyman } = await this.validateActors(
        clientId,
        createRequestDto,
        session,
      );

      const skillIds = await this.skillService.mapSkillNamesToIds(categories);

      const handymanSkills = handyman.skills?.map((skill) => skill.toString());
      const invalidSkills = skillIds.filter(
        (skillId) => !handymanSkills?.includes(skillId.toString()),
      );

      if (invalidSkills.length > 0) {
        throw new ForbiddenException(
          `The handyman does not have the required skills: ${categories.join(', ')}`,
        );
      }

      const savedRequest = await this.persistRequest(
        client,
        handyman,
        createRequestDto,
        session,
        skillIds,
      );

      if (!savedRequest._id || !client._id || !handyman._id) {
        throw new ConflictException('Error saving request');
      }

      await this.setupChatChannel(
        savedRequest._id as string,
        client._id as string,
        handyman._id as string,
      );

      // Asociar el canal con la solicitud
      await savedRequest.save({ session });

      // Confirmar la transacción
      await session.commitTransaction();
      session.endSession();

      // Enviar mensaje al canal
      const messageText = `Nueva solicitud: ${description}\nMunicipio: ${location.municipality}\nBarrio: ${location.neighborhood}\nDirección: ${location.address}\nCategorías: ${categories.join(
        ', ',
      )}`;
      await this.notifyChannel(
        savedRequest,
        client._id.toString(),
        messageText,
      );
      return new ApiResponse(201, 'Request created successfully', {
        expiresAt: savedRequest.expiresAt,
        status: savedRequest.status,
        channelId: savedRequest.channelId,
      });
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
    const { amount, description, action } = createQuotationDto;
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

    if (!request._id) {
      throw new NotFoundException('Request ID not found');
    }
    const channelId = `request-${request._id.toString()}`;

    if (action === 'accept') {
      // Actualizar el estado de la solicitud a "accepted"
      request.status = RequestStatus.ACCEPTED;
      await request.save();

      // Enviar mensaje de aceptación
      const acceptanceMessage = `La solicitud ha sido aceptada.`;
      await this.chat.sendMessage(channelId, handymanId, acceptanceMessage);

      // Enviar detalles de la factura

      const invoiceMessage = `Detalles de la factura: \n Costo: C$${amount} \n Descripción: ${description}`;
      await this.chat.sendMessage(channelId, handymanId, invoiceMessage);

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
      await this.chat.sendMessage(channelId, handymanId, rejectionMessage);
      await request.save();

      return new ApiResponse(200, 'Request rejected successfully', request);
    }

    throw new BadRequestException('Invalid action');
  }

  private async validateActors(
    clientId: string,
    dto: CreateRequestDto,
    session: any,
  ) {
    const client = await this.userModel.findById(clientId).session(session);
    if (!client) throw new NotFoundException('Client not found');
    const handyman = await this.userModel
      .findOne({ email: dto.handymanEmail, role: 'handyman' })
      .session(session);
    if (!handyman) throw new NotFoundException('Handyman not found');
    if (!handyman.coverageArea?.includes(dto.location.municipality)) {
      throw new ForbiddenException('Coverage area mismatch');
    }
    const existingRequest = await this.requestModel
      .findOne({
        clientId: client._id,
        handymanId: handyman._id,
        status: { $in: ['pending', 'accepted', 'payed'] },
      })
      .session(session);
    if (existingRequest) {
      throw new ConflictException(
        `You have already one ${existingRequest.status} request with this handyman`,
      );
    }
    return { client, handyman };
  }

  private async persistRequest(
    client: UserDocument,
    handyman: UserDocument,
    dto: CreateRequestDto,
    session: any,
    skillIds: ObjectId[],
  ): Promise<RequestDocument> {
    const req = new this.requestModel({
      clientId: client._id,
      handymanId: handyman._id,
      description: dto.description,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      location: dto.location,
      categories: skillIds,
    });
    return await req.save({ session });
  }

  private async setupChatChannel(
    requestId: string,
    clientId: string,
    handymanId: string,
  ) {
    const channelId = `request-${requestId}`;
    await this.chat.createChannel(channelId, [clientId, handymanId], clientId);
    // guardamos channelId en la request si quieres…
    const doc = await this.requestModel
      .updateOne({ _id: requestId }, { channelId })
      .exec();
  }

  private async notifyChannel(
    saved: RequestDocument,
    clientId: string,
    text: string,
  ): Promise<boolean> {
    const id = (saved._id as Types.ObjectId).toString();
    const channelId = `request-${id}`;
    try {
      await this.chat.sendMessage(channelId, clientId, text);
      return true;
    } catch {
      return false;
    }
  }
}
