import { createContext, useContext, useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore, type ComponentType, type ReactNode, type RefObject } from "react";
import { Menu as MenuIcon, PanelLeft } from "lucide-react";
import { Button, Drawer, Link, Nav, Splitter, Stack, useAnnouncer, useFocusHandoff, VisuallyHidden } from "../../catalog";

/**
 * Product frame encoded from the Todae app shell recipe:
 * https://todae.omsoo.design/recipes/app-shell
 *
 * There is no AppShell export in `@tounsoo/todae`. This shell owns the chrome.
 * Callers fill `brand`, the nav items, optional `headerActions`, and `main`.
 */

const WIDE = "(min-width: 48rem)";
const MAIN_ID = "meridian-main";

const PageHeadingContext = createContext<RefObject<HTMLElement | null> | null>(null);

export function usePageHeading(): RefObject<HTMLElement | null> | null {
  return useContext(PageHeadingContext);
}

function subscribe(onChange: () => void) {
  const query = window.matchMedia(WIDE);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function useWide() {
  return useSyncExternalStore(subscribe, () => window.matchMedia(WIDE).matches, () => false);
}

export type AppShellItem = {
  href: string;
  label: string;
  current: boolean;
  icon: ComponentType<{ "aria-hidden"?: boolean | "true" }>;
};

export function AppShell({
  brand,
  items,
  url,
  pageTitle,
  onNavigate,
  headerActions,
  children,
}: {
  brand: ReactNode;
  items: readonly AppShellItem[];
  url: string;
  pageTitle: string;
  onNavigate: (href: string) => void;
  headerActions?: ReactNode;
  children: ReactNode;
}) {
  const wide = useWide();
  const sidebarId = useId();
  const navButton = useRef<HTMLButtonElement>(null);
  const heading = useRef<HTMLElement>(null);
  const handle = useRef<HTMLDivElement>(null);
  const sidebarHandoff = useFocusHandoff({ to: navButton });
  const announce = useAnnouncer();
  const [width, setWidth] = useState(240);
  const [lastWidth, setLastWidth] = useState(240);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [navigated, setNavigated] = useState(false);
  const [shownUrl, setShownUrl] = useState(url);
  const announced = useRef<string | null>(null);

  if (url !== shownUrl) {
    setShownUrl(url);
    setNavigated(drawerOpen && !wide);
    setDrawerOpen(false);
  } else if (wide && drawerOpen) {
    setDrawerOpen(false);
  }

  useLayoutEffect(() => {
    if (!wide && handle.current === handle.current?.ownerDocument.activeElement) navButton.current?.focus();
  }, [wide]);

  useEffect(() => {
    document.title = `${pageTitle} · Meridian`;
    if (announced.current === null) {
      announced.current = pageTitle;
      return;
    }
    if (announced.current === pageTitle) return;
    announced.current = pageTitle;
    announce(pageTitle);
  }, [announce, pageTitle]);

  const resize = (next: number) => {
    if (next > 0) setLastWidth(next);
    setWidth(next);
  };
  const toggleSidebar = () => setWidth(width === 0 ? lastWidth : 0);
  const openDrawer = () => {
    setNavigated(false);
    setDrawerOpen(true);
  };

  const navigation = (
    <Nav.Root aria-label="Main">
      <Nav.Group>
        {items.map(({ href, label, current, icon: Icon }) => (
          <Nav.Item key={href}>
            <Nav.Link
              href={href}
              aria-current={current ? "page" : undefined}
              onClick={(event) => {
                if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                event.preventDefault();
                onNavigate(href);
              }}
            >
              <Icon aria-hidden="true" />
              {label}
            </Nav.Link>
          </Nav.Item>
        ))}
      </Nav.Group>
    </Nav.Root>
  );

  return (
    <PageHeadingContext.Provider value={heading}>
      <div className="app-shell">
        <Stack.Root as="header" align="center" className="app-shell-header" direction="row" gap="condensed">
          <VisuallyHidden.Root focusable>
            <Link.Root href={`#${MAIN_ID}`}>Skip to content</Link.Root>
          </VisuallyHidden.Root>
          <Button.Root
            ref={navButton}
            aria-label="Navigation"
            type="button"
            variant="ghost"
            {...(wide
              ? { "aria-controls": sidebarId, "aria-expanded": width > 0 }
              : { "aria-haspopup": "dialog" as const })}
            onClick={wide ? toggleSidebar : openDrawer}
          >
            <Button.Icon>{wide ? <PanelLeft /> : <MenuIcon />}</Button.Icon>
          </Button.Root>
          {brand}
          {headerActions ? <div className="app-shell-header-actions">{headerActions}</div> : null}
        </Stack.Root>
        <Splitter.Root
          className="app-shell-splitter"
          collapsible
          max={360}
          min={180}
          show={wide ? "both" : "end"}
          value={width}
          onValueChange={resize}
        >
          <Splitter.Panel className="app-shell-pad" id={sidebarId}>
            {wide ? <div ref={sidebarHandoff}>{navigation}</div> : null}
          </Splitter.Panel>
          <Splitter.Handle ref={handle} aria-label="Resize navigation" />
          <Splitter.Panel className="app-shell-pad">
            <main className="app-shell-main" id={MAIN_ID} tabIndex={-1}>
              {children}
            </main>
          </Splitter.Panel>
        </Splitter.Root>
        <Drawer.Root
          open={drawerOpen}
          restoreFocusRef={navigated ? heading : navButton}
          side="start"
          onOpenChange={setDrawerOpen}
        >
          <Drawer.Header>
            <Drawer.Title>Navigation</Drawer.Title>
            <Drawer.Close />
          </Drawer.Header>
          <Drawer.Body
            onClick={(event) => {
              const elsewhere = event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
              const target = event.target;
              if (!elsewhere && target instanceof Element && target.closest('a[aria-current="page"]')) {
                setDrawerOpen(false);
              }
            }}
          >
            {!wide ? navigation : null}
          </Drawer.Body>
        </Drawer.Root>
      </div>
    </PageHeadingContext.Provider>
  );
}
