-- Keep piece stages in sync with order movement through stations.
CREATE OR REPLACE FUNCTION public.sync_service_units_with_order_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN
    UPDATE public.service_units
    SET status = CASE WHEN NEW.status IN ('delivered','cancelled') THEN NEW.status::text ELSE status END,
        current_stage = CASE
          WHEN NEW.status = 'received' THEN 'received'
          WHEN NEW.status = 'cleaning' THEN 'cleaning'
          WHEN NEW.status = 'ironing' THEN 'ironing'
          WHEN NEW.status = 'packing' THEN 'packing'
          WHEN NEW.status = 'ready' THEN 'ready'
          WHEN NEW.status = 'out_for_delivery' THEN 'out_for_delivery'
          WHEN NEW.status = 'delivered' THEN 'delivered'
          WHEN NEW.status = 'cancelled' THEN 'cancelled'
          ELSE current_stage
        END,
        updated_at = now()
    WHERE order_id = NEW.id
      AND COALESCE(needs_reclean, false) = false
      AND current_stage <> 'cancelled';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_sync_service_units_status ON public.orders;
CREATE TRIGGER trg_orders_sync_service_units_status
AFTER INSERT OR UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.sync_service_units_with_order_status();

-- Backfill active orders into piece stage once.
UPDATE public.service_units su
SET current_stage = CASE
  WHEN o.status = 'received' THEN 'received'
  WHEN o.status = 'cleaning' THEN 'cleaning'
  WHEN o.status = 'ironing' THEN 'ironing'
  WHEN o.status = 'packing' THEN 'packing'
  WHEN o.status = 'ready' THEN 'ready'
  WHEN o.status = 'out_for_delivery' THEN 'out_for_delivery'
  WHEN o.status = 'delivered' THEN 'delivered'
  WHEN o.status = 'cancelled' THEN 'cancelled'
  ELSE su.current_stage
END,
status = CASE WHEN o.status IN ('delivered','cancelled') THEN o.status::text ELSE su.status END,
updated_at = now()
FROM public.orders o
WHERE su.order_id = o.id
  AND COALESCE(su.needs_reclean, false) = false
  AND su.current_stage <> 'cancelled';
