export class UnitNotFoundError extends Error {
  constructor(message = 'ไม่พบข้อมูลหน่วยนับนี้ในระบบ') {
    super(message);
    this.name = 'UnitNotFoundError';
  }
}