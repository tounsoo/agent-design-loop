import { useEffect, useState } from "react";
import { DensityProvider, Stack, Text, ThemeProvider } from "./catalog";
import { InvoiceApproval } from "./features/invoice-approval";
import { meridianNav, navCopy } from "./features/invoice-approval/navigation";
import { invoiceById, type AppLocation } from "./flows/invoice-approval";
import { readLocation, StatePreviewMenu } from "./preview";
import { AppShell } from "./layouts/app-shell";

function pageTitle(location: AppLocation): string {
  const detail =
    location.invoiceId != null ||
    location.preview.page === "detail" ||
    location.preview.state === "invoice-approved" ||
    location.preview.state === "changes-requested";
  if (detail && location.preview.state !== "loading" && location.preview.state !== "empty" && location.preview.state !== "error") {
    const id = location.invoiceId ?? invoiceById("inv-1842")?.id;
    const invoice = (id ? invoiceById(id) : undefined) ?? invoiceById("inv-1842");
    return invoice?.vendor ?? "Invoice";
  }
  return navCopy(location.route).label;
}

export function App() {
  const [search, setSearch] = useState(() => window.location.search);
  useEffect(() => {
    const onPop = () => setSearch(window.location.search);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const location = readLocation(search);
  const navigate = (href: string) => {
    const next = new URL(href, window.location.href);
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    const target = `${next.pathname}${next.search}${next.hash}`;
    if (target === current) return;
    window.history.pushState(null, "", target);
    setSearch(window.location.search);
  };
  // The page, not where on it: a hash, such as the skip link's, is no page change.
  const url = `${window.location.pathname}${search}`;

  return (
    <ThemeProvider appearance="system">
      <DensityProvider density="comfortable">
        <AppShell
          brand={
            <Stack.Root align="baseline" direction="row" gap="condensed">
              <Text.Root as="span" weight="bold">
                Meridian
              </Text.Root>
              <Text.Root as="span" tone="muted">
                Payables
              </Text.Root>
            </Stack.Root>
          }
          headerActions={<StatePreviewMenu onNavigate={navigate} />}
          items={meridianNav.map((item) => ({
            href: item.href,
            label: item.label,
            icon: item.icon,
            current: item.route === location.route,
          }))}
          pageTitle={pageTitle(location)}
          url={url}
          onNavigate={navigate}
        >
          <InvoiceApproval location={location} onNavigate={navigate} />
        </AppShell>
      </DensityProvider>
    </ThemeProvider>
  );
}
