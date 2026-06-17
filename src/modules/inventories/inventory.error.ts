export class InventoryNotFoundError extends Error {
  constructor(message = 'Inventory not found') {
    super(message);
    this.name = 'InventoryNotFoundError';
  }
}

export class InventoryNameAlreadyExist extends Error{
  constructor(message = 'Inventory name is already exist'){
    super(message);
    this.name = 'InventoryNameExist';
  }
}

export class InventoryUsingUnit extends Error {
  constructor(message = 'It is inventory still using unit') {
    super(message);
    this.name = 'InventoryUsingUnitError';
  }
}

export class InventoryUsingSupplier extends Error {
  constructor(message = 'It is inventory still using supplier') {
    super(message);
    this.name = 'InventoryUsingSupplierError';
  }
}