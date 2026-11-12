import { Button, useAnnouncer } from "@tounsoo/todae";
import { useState } from "react";
import { createRoot } from "react-dom/client";

/**
 * A vendor list whose one button reorders it and says the new order through
 * Todae's announcer, as Meridian's tables do. The announcer writes its live
 * region 100 ms after announce(), so check:accessible-names has to read the
 * page after that to hear it.
 */
const vendors = ["Northwind Office Supply", "Brightline Paper Co", "Helios Freight"];

function Vendors() {
  const [ascending, setAscending] = useState(false);
  const announce = useAnnouncer();
  const shown = ascending ? [...vendors].sort() : vendors;
  return (
    <main>
      <h1>Vendors</h1>
      <Button.Root
        onClick={() => {
          setAscending(!ascending);
          announce(ascending ? "Vendors in the order they were added" : "Vendors sorted by name, A to Z");
        }}
        type="button"
        variant="secondary"
      >
        {ascending ? "Show in added order" : "Sort by name"}
      </Button.Root>
      <ul>
        {shown.map((vendor) => (
          <li key={vendor}>{vendor}</li>
        ))}
      </ul>
    </main>
  );
}

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root");
createRoot(root).render(<Vendors />);
