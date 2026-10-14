import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/customers")({
  component: CustomersLayout,
});

function CustomersLayout() {
  return <Outlet />;
}
