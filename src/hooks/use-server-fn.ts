import { useState } from 'react';
import { toast } from 'sonner';

export function useServerFn<TArgs extends any[], TResult>(fn: (...args: TArgs) => Promise<TResult>) {
  const [isLoading, setIsLoading] = useState(false);

  const execute = async (...args: TArgs): Promise<TResult | null> => {
    setIsLoading(true);
    try {
      const result = await fn(...args);
      return result;
    } catch (error: any) {
      const message = error?.message || 'حدث خطأ غير متوقع';
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // نربط حالة التحميل بالدالة نفسها لكي يمكن الوصول إليها كـ fn.isLoading
  return Object.assign(execute, { isLoading });
}
