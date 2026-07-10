interface ValidationErrorDetail {
  field?: string;
  message?: string;
  error?: string;
}

interface BackendErrorResponse {
  error?: string;
  message?: string;
  details?: ValidationErrorDetail[];
}

interface HttpClientError {
  response?: {
    data?: BackendErrorResponse;
  };
  error?: string;
  message?: string;
  details?: ValidationErrorDetail[];
}

export function extractErrorMessage(err: unknown, defaultMessage = 'เกิดข้อผิดพลาดในการบันทึกข้อมูล'): string {
  console.error('Raw Error:', err);

  if (!err || typeof err !== 'object') {
    return defaultMessage;
  }

  const errorObj = err as HttpClientError;

  // 💡 1. ดักแกะจาก details ชั้นนอกสุด (โครงสร้างก้อน JSON ที่คุณส่งมา)
  if (Array.isArray(errorObj.details) && errorObj.details.length > 0) {
    return errorObj.details
      .map((d: ValidationErrorDetail) => {
        if (d.field && d.message) {
          return `${d.field}: ${d.message}`;
        }
        return d.message || (d.field && d.error ? `${d.field}: ${d.error}` : '');
      })
      .filter(Boolean)
      .join(', ');
  }

  // 💡 2. ดักแกะจาก response.data.details (เผื่อกรณีวิ่งผ่าน Axios ปกติ)
  const responseDetails = errorObj.response?.data?.details;
  if (Array.isArray(responseDetails) && responseDetails.length > 0) {
    return responseDetails
      .map((d: ValidationErrorDetail) => {
        if (d.field && d.message) {
          return `${d.field}: ${d.message}`;
        }
        return d.message || (d.field && d.error ? `${d.field}: ${d.error}` : '');
      })
      .filter(Boolean)
      .join(', ');
  }

  // 💡 3. เช็คฟิลด์ error หรือ message แต่ "ต้องไม่ใช่" คำว่า Validation failed
  const directError = errorObj.error;
  if (typeof directError === 'string' && directError !== 'Validation failed') {
    return directError;
  }

  const responseError = errorObj.response?.data?.error;
  if (typeof responseError === 'string' && responseError !== 'Validation failed') {
    return responseError;
  }

  const directMessage = errorObj.message;
  if (typeof directMessage === 'string' && directMessage !== 'Validation failed') {
    return directMessage;
  }

  // 4. กรณีเป็นมาตรฐาน JavaScript Error instance
  if (err instanceof Error) {
    return err.message;
  }

  return defaultMessage;
}