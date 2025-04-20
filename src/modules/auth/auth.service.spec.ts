import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/common/users.service';
import { UnauthorizedException } from '@nestjs/common';

describe('AuthService', () => {
  let authService: AuthService;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: {
            verify: jest.fn(), // Mock del método verify
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-secret'), // Mock del JWT_SECRET
          },
        },
        {
          provide: UsersService,
          useValue: {}, // Puedes agregar mocks si necesitas probar otros métodos
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
  });

  it('should be defined', () => {
    expect(authService).toBeDefined();
  });

  it('should return the payload if the token is valid', () => {
    const mockPayload = { sub: '123', role: 'user' };
    jest.spyOn(jwtService, 'verify').mockReturnValue(mockPayload);

    const result = authService.validateToken('valid-token');
    expect(result).toEqual(mockPayload);
  });

  it('should throw an UnauthorizedException if the token is expired', () => {
    jest.spyOn(jwtService, 'verify').mockImplementation(() => {
      throw { message: 'jwt expired' };
    });

    expect(() => authService.validateToken('expired-token')).toThrow(
      new UnauthorizedException('Token expired, please log in again'),
    );
  });

  it('should throw an UnauthorizedException if the token is invalid', () => {
    jest.spyOn(jwtService, 'verify').mockImplementation(() => {
      throw { message: 'invalid token' };
    });

    expect(() => authService.validateToken('invalid-token')).toThrow(
      new UnauthorizedException('Invalid token signature'),
    );
  });

  it('should throw an UnauthorizedException for other errors', () => {
    jest.spyOn(jwtService, 'verify').mockImplementation(() => {
      throw { message: 'some other error' };
    });

    expect(() => authService.validateToken('random-token')).toThrow(
      new UnauthorizedException('Authentication failed'),
    );
  });
});