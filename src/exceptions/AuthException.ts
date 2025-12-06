import { StatusCodes } from 'http-status-codes';

export class AuthException extends Error {
  status: number;
  reportable: boolean;

  constructor(message: string, status: number = StatusCodes.INTERNAL_SERVER_ERROR) {
    super(message);
    this.status = status;
    this.reportable = true;
    Object.setPrototypeOf(this, AuthException.prototype);
  }
}

export class UserNotFoundException extends AuthException {
  constructor(message: string = 'User not found') {
    super(message, StatusCodes.NOT_FOUND);
    this.reportable = false;
    Object.setPrototypeOf(this, UserNotFoundException.prototype);
  }
}

export class InvalidOtpException extends AuthException {
  constructor(message: string = 'Invalid OTP') {
    super(message, StatusCodes.PRECONDITION_FAILED);
    this.reportable = false;
    Object.setPrototypeOf(this, InvalidOtpException.prototype);
  }
}

export class OtpExpiredException extends AuthException {
  constructor(message: string = 'OTP has expired') {
    super(message, StatusCodes.PRECONDITION_FAILED);
    this.reportable = false;
    Object.setPrototypeOf(this, OtpExpiredException.prototype);
  }
}

export class UserAccountAlreadyExistsException extends AuthException {
  constructor(message: string = 'User account already exists') {
    super(message, StatusCodes.CONFLICT);
    this.reportable = false;
    Object.setPrototypeOf(this, UserAccountAlreadyExistsException.prototype);
  }
}

export class InvalidCredentialException extends AuthException {
  constructor(message: string = 'Invalid credentials') {
    super(message, StatusCodes.UNAUTHORIZED);
    this.reportable = false;
    Object.setPrototypeOf(this, InvalidCredentialException.prototype);
  }
}

export class UserIdentifierNotVerifiedException extends AuthException {
  constructor(message: string = 'User identifier is not verified') {
    super(message, StatusCodes.PRECONDITION_FAILED);
    this.reportable = false;
    Object.setPrototypeOf(this, UserIdentifierNotVerifiedException.prototype);
  }
}

export class OldAndNewPasswordSameException extends AuthException {
  constructor(message: string = 'Old and new password cannot be the same') {
    super(message, StatusCodes.PRECONDITION_FAILED);
    this.reportable = false;
    Object.setPrototypeOf(this, OldAndNewPasswordSameException.prototype);
  }
}

export class ValidationException extends AuthException {
  errors: any[];

  constructor(errors: any[], message: string = 'Validation failed') {
    super(message, StatusCodes.BAD_REQUEST);
    this.errors = errors;
    this.reportable = false;
    Object.setPrototypeOf(this, ValidationException.prototype);
  }
}

export class InvalidTokenException extends AuthException {
  constructor(message: string = 'Invalid token') {
    super(message, StatusCodes.UNAUTHORIZED);
    this.reportable = false;
    Object.setPrototypeOf(this, InvalidTokenException.prototype);
  }
}

export class PreconditionFailedException extends AuthException {
  constructor(message: string = 'Precondition failed') {
    super(message, StatusCodes.PRECONDITION_FAILED);
    this.reportable = false;
    Object.setPrototypeOf(this, PreconditionFailedException.prototype);
  }
}

export class ForbiddenException extends AuthException {
  constructor(message: string = 'Forbidden') {
    super(message, StatusCodes.FORBIDDEN);
    this.reportable = false;
    Object.setPrototypeOf(this, ForbiddenException.prototype);
  }
}

