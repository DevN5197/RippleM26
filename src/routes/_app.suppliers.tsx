import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/suppliers")({
  component: SuppliersLayout,
});

function SuppliersLayout() {
  return <Outlet />;
}
