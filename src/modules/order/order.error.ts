export class OrderNotFoundError extends Error {
  constructor(message = 'Order not found') {
    super(message);
    this.name = 'OrderNotFoundError';
  }
}

export class OrderSignatureIsEmpty extends Error {
  constructor(message = 'Signature is not sign') {
    super(message);
    this.name = 'SignatureIsNotSign';
  }
}