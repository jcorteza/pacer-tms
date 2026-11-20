import { ArgumentsHost, BadRequestException, Catch, ConflictException } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';

/** Postgres SQLSTATE → the HTTP error a client can act on. */
const STATUS_BY_SQLSTATE: Record<string, () => Error> = {
  '23505': () => new ConflictException('A row with that unique value already exists'),
  '23503': () => new BadRequestException('A referenced row does not exist'),
  '23502': () => new BadRequestException('A required value is missing'),
  '23514': () => new BadRequestException('A value violates a table rule'),
  '22001': () => new BadRequestException('A value is too long'),
  '22P02': () => new BadRequestException('A value has an invalid format'),
};

type DriverError = { code?: string; cause?: { code?: string } };

/** Drizzle wraps the driver error, so the SQLSTATE is on `cause` when present. */
const sqlState = (error: DriverError) => error.cause?.code ?? error.code;

/** Turns known database failures into 4xx responses; everything else keeps Nest's default handling. */
@Catch()
export class PostgresExceptionFilter extends BaseExceptionFilter {
  override catch(error: unknown, host: ArgumentsHost) {
    const toHttp = STATUS_BY_SQLSTATE[sqlState(error as DriverError) ?? ''];
    super.catch(toHttp ? toHttp() : error, host);
  }
}
