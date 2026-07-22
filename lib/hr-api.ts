// ============================================
// T-014: HR Management API
// ============================================
import { supabase } from "@/integrations/supabase/client";
import { logEvent, EVENTS } from "./event-logger";

export interface Employee {
  id: string;
  tenant_id: string;
  user_id?: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  role: string;
  department?: string;
  hire_date: string;
  salary?: number;
  status: 'active' | 'inactive' | 'terminated';
}

export async function getEmployees(tenantId: string): Promise<Employee[]> {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .order('first_name', { ascending: true });

  if (error) {
    console.error('Failed to fetch employees:', error);
    return [];
  }

  return data as any || [];
}

export async function createEmployee(
  tenantId: string,
  employee: Omit<Employee, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>
): Promise<{ success: boolean; data?: Employee; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('employees')
      .insert({ ...employee, tenant_id: tenantId })
      .select()
      .single();

    if (error) {
      console.error('Failed to create employee:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data as any };
  } catch (error) {
    console.error('Unexpected error in createEmployee:', error);
    return { success: false, error: 'حدث خطأ غير متوقع' };
  }
}

export async function clockIn(employeeId: string, tenantId: string): Promise<{ success: boolean; error?: string }> {
  const today = new Date().toISOString().split('T')[0];

  // التحقق من وجود تسجيل حضور اليوم
  const { data: existing, error: checkError } = await supabase
    .from('attendance')
    .select('id')
    .eq('employee_id', employeeId)
    .eq('date', today)
    .maybeSingle();

  if (checkError) {
    return { success: false, error: 'فشل التحقق من الحضور' };
  }

  if (existing) {
    return { success: false, error: 'تم تسجيل الحضور مسبقاً اليوم' };
  }

  const { error } = await supabase.from('attendance').insert({
    employee_id: employeeId,
    check_in: new Date().toISOString(),
    date: today,
  });

  if (error) {
    console.error('Failed to clock in:', error);
    return { success: false, error: error.message };
  }

  // تسجيل حدث
  await logEvent({
    event_type: EVENTS.EMPLOYEE_CHECKED_IN,
    tenant_id: tenantId,
    payload: { employee_id: employeeId, timestamp: new Date().toISOString() },
  });

  return { success: true };
}
