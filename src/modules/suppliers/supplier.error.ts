export class SupplierNotFoundError extends Error {
  constructor(message = 'Supplier not found') {
    super(message);
    this.name = 'SupplierNotFoundError';
  }
}

export class SupplierAlreadyExistsError extends Error {
  constructor(message = 'Supplier with this Tax ID or Email already exists') {
    super(message);
    this.name = 'SupplierAlreadyExistsError';
  }
}

export class SupplierStatusError extends Error {
  constructor(message = 'Invalid supplier status transition') {
    super(message);
    this.name = 'SupplierStatusError';
  }
}

export class CannotDeleteSupplierError extends Error {
  constructor(message = 'Cannot delete supplier because it is linked to existing inventory') {
    super(message);
    this.name = 'CannotDeleteSupplierError';
  }
}