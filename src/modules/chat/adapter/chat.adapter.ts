export interface ChatAdapter {
  createChannel(
    channelId: string,
    members: string[],
    createdBy: string,
  ): Promise<void>;
  sendMessage(channelId: string, userId: string, text: string): Promise<void>;
  upsertUser(
    userId: string,
    name: string,
    email: string,
    image: string,
  ): Promise<void>;
  generateUserToken(userId: string): Promise<string>;

  connectUser(userId: string, name: string): Promise<any>;
  accessChannel(type:string, channelId:string): Promise<any>;
  createUserAdmin(id:string, name:string, email:string, image:string): Promise<any>;

  //INSERTAR ADMIN EN UN CANAL
}
