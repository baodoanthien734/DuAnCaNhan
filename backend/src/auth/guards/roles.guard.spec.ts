import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  // Giả lập ExecutionContext của NestJS
  const createMockContext = (userRoles: string[]): ExecutionContext => {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({
          user: {
            id: 1,
            email: 'test@example.com',
            roles: userRoles,
          },
        }),
      }),
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  it('nên cho phép truy cập nếu Route KHÔNG yêu cầu Role cụ thể', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(null);
    const context = createMockContext(['CUSTOMER']);

    const canActivate = guard.canActivate(context);
    expect(canActivate).toBe(true);
  });

  it('nên cho phép truy cập nếu User sở hữu Role được yêu cầu (VD: ADMIN)', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);
    const context = createMockContext(['ADMIN']);

    const canActivate = guard.canActivate(context);
    expect(canActivate).toBe(true);
  });

  it('nên ném lỗi ForbiddenException nếu User KHÔNG có Role phù hợp (VD: CUSTOMER truy cập route ADMIN)', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);
    const context = createMockContext(['CUSTOMER']);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});