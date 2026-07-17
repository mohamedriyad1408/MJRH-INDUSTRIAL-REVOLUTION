import { createFileRoute } from '@tanstack/react-router';
import SovereignCommandCenter from '@/components/v4-command-center';

export const Route = createFileRoute('/v4-dashboard')({
  component: SovereignCommandCenter,
});
