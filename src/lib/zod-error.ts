import { ZodError } from 'zod';

export interface FormattedZodIssue {
  field: string;
  message: string;
}

export function formatZodError(err: ZodError): FormattedZodIssue[] {
  return err.issues.map((issue) => ({
    field: issue.path.join('.'),
    message: issue.message,
  }));
}