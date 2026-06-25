-- When an order moves out of a station, close the open task assignment for that station.
CREATE OR REPLACE FUNCTION public.complete_task_assignment_on_order_move()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_station public.workstation;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    old_station := CASE OLD.status
      WHEN 'received' THEN 'reception'::public.workstation
      WHEN 'cleaning' THEN 'cleaning'::public.workstation
      WHEN 'ironing' THEN 'ironing'::public.workstation
      WHEN 'packing' THEN 'packing'::public.workstation
      WHEN 'out_for_delivery' THEN 'delivery'::public.workstation
      ELSE NULL
    END;

    IF old_station IS NOT NULL THEN
      UPDATE public.task_assignments
      SET completed_at = COALESCE(completed_at, now())
      WHERE order_id = NEW.id
        AND station = old_station
        AND completed_at IS NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_complete_task_assignment_on_order_move ON public.orders;
CREATE TRIGGER trg_complete_task_assignment_on_order_move
AFTER UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.complete_task_assignment_on_order_move();
