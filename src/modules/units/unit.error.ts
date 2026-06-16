export class UnitNotFoundError extends Error {
  constructor(message = 'Unit not found') {
    super(message);
    this.name = 'UnitNotFoundError';
  }
}