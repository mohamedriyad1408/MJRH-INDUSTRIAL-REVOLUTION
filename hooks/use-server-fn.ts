import { useState, useCallback } from 'react';
import { toast } from 'sonner';

export function useServerFn<TArgs, TResult>(fn: (args: TArgs) => Promise<TResult>) {
  const [isLoading, setIsLoading] = useState(false);

  const execute = useCallback(async (args: TArgs): Promise<TResult | null> => {
    setIsLoading(true);
    try {
      const result = await fn(args);
      return result;
    } catch (error: any) {
      const message = error?.message || 'حدث خطأ غير متوقع';
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [fn]);

  return { execute, isLoading };
}
