import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model, ObjectId, Types } from 'mongoose';
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
  QuotationStatus,
} from '../quotations/schemas/quotation.schema';
import { ChatAdapter } from '../chat/adapter/chat.adapter';
import { CHAT_ADAPTER } from '../chat/chat.constants';
import { Cron, CronExpression } from '@nestjs/schedule';
import _ from 'mongoose-paginate-v2';
import { ConfigService } from '@nestjs/config';
import { ne } from '@faker-js/faker/.';
import { request } from 'http';

@Injectable()
export class RequestsService implements OnModuleInit {
  private adminId: string;
  constructor(
    @InjectModel(Request.name)
    private readonly requestModel: Model<RequestDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Quotation.name)
    private readonly quotationModel: Model<QuotationDocument>,
    private readonly skillService: SkillService,
    @Inject(CHAT_ADAPTER) private readonly chat: ChatAdapter,
    private readonly configService: ConfigService,
  ) {
    this.adminId = this.configService.get<string>('ADMIN_ID') as string;
  }

  async onModuleInit() {
    // Inicia el listener al arrancar el módulo
    this.listenForCompletedRequests();
  }

  private listenForCompletedRequests() {
    const changeStream = this.requestModel.watch([
      { $match: { operationType: 'update' } },
    ]);

    changeStream.on('change', async (change) => {
      const requestId = change.documentKey._id;
      const request = await this.requestModel.findById(requestId);
      if (
        request &&
        request.isHandymanCompleted &&
        request.isClientCompleted &&
        request.status !== RequestStatus.COMPLETED
      ) {
        request.status = RequestStatus.COMPLETED;
        await request.save();
        console.log('SE COMPLETO LA SOLICITUD', requestId);
        const channelId = `request-${request._id}`;
        await this.chat.sendMessage(
          channelId,
          this.adminId,
          `<strong>La solicitud ha sido marcada como COMPLETADA por ambas partes</strong>`,
        );
        await this.chat.updateMetadataChannel(channelId, {
          requestStatus: RequestStatus.COMPLETED,
        });
      }
    });

    changeStream.on('error', (err) => {
      console.error('ChangeStream error:', err);
    });
  }

  @Cron(CronExpression.EVERY_HOUR)
  private async handleExpiredRequests() {
    const now = new Date();
    const expiredRequests = await this.requestModel.find({
      expiresAt: { $lt: now },
      status: RequestStatus.PENDING,
    });

    for (const request of expiredRequests) {
      request.status = RequestStatus.EXPIRED;
      await request.save();
      const channelId = `request-${request._id}`;
      const text = `<strong>Mensaje Automatizado<strong/>\n<strong>Tu solicitud:<strong/> <strong>${request.title}<strong/> ha expirado el ${request.expiresAt.toLocaleString()}.`;

      try {
        await this.chat.sendMessage(channelId, this.adminId, text);
      } catch (error) {
        console.error(
          `Error notificando expiración para ${request._id}:`,
          error,
        );
      }
    }
  }
  async createRequest(
    clientId: string,
    createRequestDto: CreateRequestDto,
  ): Promise<ApiResponse<any>> {
    const session = await this.requestModel.db.startSession();
    session.startTransaction();

    try {
      const { handymanEmail, description, location, categories, title } =
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
        savedRequest,
      );

      // Asociar el canal con la solicitud
      await savedRequest.save({ session });

      // Confirmar la transacción
      await session.commitTransaction();
      session.endSession();

      // Enviar mensaje al canal
      const messageText = `<strong>Nueva solicitud:<strong/>\n <strong>Título:<strong/> ${title}\n <strong>Descripción:<strong/> ${description}\n<strong>Municipio:<strong/> ${location.municipality}\n<strong>Barrio:<strong/> ${location.neighborhood}\n<strong>Dirección:<strong/> ${location.address}\n<strong>Categorías:<strong/> ${categories.join(
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
        requestId: savedRequest._id,
        channelId: 'request-' + savedRequest._id,
      });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  async acceptRequest(
    handymanId: string,
    requestId: string,
  ): Promise<ApiResponse<any>> {
    const request = await this.validateAndGetRequestForHandyman(
      handymanId,
      requestId,
      RequestStatus.PENDING,
    );
    request.status = RequestStatus.ACCEPTED;
    const message = `<strong>Solicitud aceptada<strong/>\n\n<strong>La solicitud:<strong> ${request.title}, ha sido aceptada.`;
    const channelId = `request-${request._id}`;
    try {
      await this.chat.updateMetadataChannel(channelId, {
        requestStatus: RequestStatus.ACCEPTED,
      });
      await this.chat.sendMessage(channelId, this.adminId, message);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
    await request.save();

    return new ApiResponse(200, 'Request accepted successfully', {
      requestId: requestId,
    });
  }

  async rejectRequest(
    handymanId: string,
    requestId: string,
  ): Promise<ApiResponse<any>> {
    const request = await this.validateAndGetRequestForHandyman(
      handymanId,
      requestId,
      RequestStatus.PENDING,
    );
    request.status = RequestStatus.REJECTED;
    const message = `<strong>Solicitud rechazada<strong/>\n\n<strong>La solicitud:<strong/> ${request.title} ha sido rechazada.`;
    const channelId = `request-${request._id}`;
    try {
      await this.chat.updateMetadataChannel(channelId, {
        requestStatus: RequestStatus.REJECTED,
      });
      await this.chat.sendMessage(channelId, this.adminId, message);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
    await request.save();

    return new ApiResponse(200, 'Request rejected successfully', {
      requestId: requestId,
    });
  }

  async completeRequest(
    activeUserId: string,
    requestId: string,
    role: string,
  ): Promise<ApiResponse<any>> {
    const request = await this.requestModel.findById(requestId);

    if (!request) {
      throw new NotFoundException('Request not found');
    }
    const channelId = `request-${request._id}`;

    if (role === 'handyman') {
      if (request.handymanId.toString() !== activeUserId) {
        throw new ForbiddenException(
          'You are not authorized to operate on this request',
        );
      }

      if (request.status !== RequestStatus.PAYED) {
        throw new ConflictException('This request cannot be completed');
      }

      request.isHandymanCompleted = true;
      this.chat.updateMetadataChannel(channelId, { isHandymanCompleted: true });
      const message = `<strong>El handyman ha marcado como completada la solicitud:<strong/> ${request.title}`;
      this.chat.sendMessage(channelId, this.adminId, message);
    } else if (role === 'client') {
      if (request.clientId.toString() !== activeUserId) {
        throw new ForbiddenException(
          'You are not authorized to operate on this request',
        );
      }

      if (request.status !== RequestStatus.PAYED) {
        throw new ConflictException(
          'This request cannot be completed because it is not payed yet',
        );
      }
      request.isClientCompleted = true;
      this.chat.updateMetadataChannel(channelId, { isClientCompleted: true });
      const message = `<strong>El cliente ha marcado como completada la solicitud:<strong/> ${request.title}`;
      this.chat.sendMessage(channelId, this.adminId, message);
    }

    await request.save();
    return new ApiResponse(200, 'Request completed successfully', {});
  }

  async getClientRequests(clientId: string): Promise<Request[]> {
    if (!Types.ObjectId.isValid(clientId)) {
      throw new BadRequestException('Invalid clientId ID');
    }
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
  async getHandymanRequests(handymanId: string): Promise<Request[]> {
    const requests = await this.requestModel
      .find({ handymanId: new Types.ObjectId(handymanId) }) // Filtrar por el ID del cliente
      .populate('clientId', 'name lastName email') // Poblar datos del handyman
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

  async getActiveRequestByHandymanId(
    activeUserId: Types.ObjectId,
    otherUserId: Types.ObjectId,
    role: string,
  ): Promise<any> {
    let request: RequestDocument | null = null;

    if (role === 'client') {
      request = await this.requestModel
        .findOne({
          clientId: activeUserId,
          handymanId: otherUserId,
          status: {
            $in: [
              RequestStatus.PENDING,
              RequestStatus.ACCEPTED,
              RequestStatus.PAYED,
              RequestStatus.IN_PROGRESS,
              RequestStatus.QUOTED,
              RequestStatus.INVOICED,
            ],
          },
        })
        .exec();
    } else if (role === 'handyman') {
      request = await this.requestModel
        .findOne({
          handymanId: activeUserId,
          clientId: otherUserId,
          status: {
            $in: [
              RequestStatus.PENDING,
              RequestStatus.ACCEPTED,
              RequestStatus.PAYED,
              RequestStatus.IN_PROGRESS,
              RequestStatus.QUOTED,
              RequestStatus.INVOICED,
            ],
          },
        })
        .exec();
    }

    if (!request) {
      return null;
    }

    return { requestId: request._id as unknown as Types.ObjectId };
  }
  async cancelRequest(
    requestId: Types.ObjectId,
    clientId: Types.ObjectId,
  ): Promise<ApiResponse<any>> {
    if (!Types.ObjectId.isValid(requestId)) {
      throw new BadRequestException('Invalid requestId ID');
    }
    if (!Types.ObjectId.isValid(clientId)) {
      throw new BadRequestException('Invalid clientId ID');
    }
    const request = await this.requestModel.findById(requestId);
    if (!request) {
      throw new NotFoundException('Request not found');
    }
    if (request.clientId.toString() !== clientId.toString()) {
      throw new ForbiddenException(
        'You are not authorized to cancel this request',
      );
    }
    if (
      request.status !== RequestStatus.PENDING &&
      request.status !== RequestStatus.ACCEPTED
    ) {
      throw new ConflictException('This request cannot be canceled');
    }
    request.status = RequestStatus.CANCELLED;
    const message = `<strong>Solicitud cancelada<strong/>\n\n<strong>La solicitud:<strong/> ${request.title}, ha sido cancelada.`;
    const channelId = `request-${request._id}`;
    try {
      await this.chat.sendMessage(channelId, this.adminId, message);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
    await request.save();
    return new ApiResponse(200, 'Request canceled successfully', request);
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
    skillIds: Types.ObjectId[],
  ): Promise<RequestDocument> {
    const req = new this.requestModel({
      clientId: client._id,
      handymanId: handyman._id,
      title: dto.title,
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
    request: RequestDocument,
  ) {
    const channelId = `request-${requestId}`;
    await this.chat.createChannel(channelId, [clientId, handymanId], clientId, {
      requestId: requestId,
      handymanId: handymanId,
      clientId: clientId,
      requestStatus: request.status,
      isHandymanCompleted: false,
      isClientCompleted: false,
    });
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

  private async validateAndGetRequestForHandyman(
    handymanId: string,
    requestId: string,
    expectedStatus: RequestStatus,
  ): Promise<RequestDocument> {
    if (!Types.ObjectId.isValid(requestId)) {
      throw new BadRequestException('Invalid requestId ID');
    }
    if (!Types.ObjectId.isValid(handymanId)) {
      throw new BadRequestException('Invalid handymanId ID');
    }

    const request = await this.requestModel.findById(requestId);

    if (!request) {
      throw new NotFoundException('Request not found');
    }
    if (request.handymanId.toString() !== handymanId) {
      throw new ForbiddenException(
        'You are not authorized to operate on this request',
      );
    }
    if (request.status !== expectedStatus) {
      throw new ConflictException(
        `This request has already been ${request.status}`,
      );
    }
    return request;
  }
}
