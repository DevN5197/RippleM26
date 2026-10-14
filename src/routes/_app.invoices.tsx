import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/invoices")({
  component: InvoicesLayout,
});

function InvoicesLayout() {
  return <Outlet />;
}
