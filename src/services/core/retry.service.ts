export class RetryService {
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return fn();
  }
}
