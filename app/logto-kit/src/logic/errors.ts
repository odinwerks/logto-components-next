export class LogtoApiError extends Error {
  constructor(
    message: string,
    public operation: string,
    public status: number,
    public response: string,
    public endpoint?: string
  ) {
    super(message);
    this.name = 'LogtoApiError';
  }
}
