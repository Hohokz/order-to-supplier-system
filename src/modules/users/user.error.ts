export class UserNotFoundError extends Error {
  constructor(message = 'User not found') {
    super(message);
    this.name = 'UserNotFoundError';
  }
}

export class UsernameAlreadyExistsError extends Error {
  constructor(message = 'Username is already taken') {
    super(message);
    this.name = 'UserAlreadyExistsError';
  }
}

export class InvalidCredentialsError extends Error {
  constructor(message = 'Invalid user or password') {
    super(message);
    this.name = 'InvalidCredentialsError';
  }
}

export class IncorrectPasswordError extends Error {
  constructor(message = 'Current password is incorrect') {
    super(message);
    this.name = 'IncorrectPasswordError';
  }
}

export class CannotModifySelfRoleError extends Error {
  constructor(message = 'You cannot change your own role') {
    super(message);
    this.name = 'CannotModifySelfRoleError';
  }
}