import { Building2, ClipboardList, Files, Kanban } from "lucide-react";
import type { AppShellItem } from "../../layouts/app-shell";
import { routeHref, type CollectionRoute } from "../../flows/invoice-approval";

export const meridianNav: readonly {
  route: CollectionRoute;
  href: string;
  label: string;
  description: string;
  icon: AppShellItem["icon"];
}[] = [
  {
    route: "to-approve",
    href: routeHref("to-approve"),
    label: "To approve",
    description: "Vendor invoices waiting for a decision.",
    icon: ClipboardList,
  },
  {
    route: "invoices",
    href: routeHref("invoices"),
    label: "All invoices",
    description: "Every invoice in the payables ledger.",
    icon: Files,
  },
  {
    route: "tracking",
    href: routeHref("tracking"),
    label: "Tracking",
    description: "Invoices by status. Open one to approve it or request changes.",
    icon: Kanban,
  },
  {
    route: "vendors",
    href: routeHref("vendors"),
    label: "Vendors",
    description: "Vendors with invoices in Meridian.",
    icon: Building2,
  },
];

export function navCopy(route: CollectionRoute) {
  const item = meridianNav.find((entry) => entry.route === route) ?? meridianNav[0];
  if (!item) throw new Error("Meridian navigation is empty.");
  return item;
}
