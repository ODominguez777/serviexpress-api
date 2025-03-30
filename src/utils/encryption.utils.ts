import * as bcrypt from 'bcrypt';

export const encryptGoogleId = async (googleId: string): Promise<string> => {
  const saltRounds = 10;
  return await bcrypt.hash(googleId, saltRounds);
};

export const compareGoogleId = async (googleId: string, storedHash: string): Promise<boolean> => {
  return await bcrypt.compare(googleId, storedHash);
};
