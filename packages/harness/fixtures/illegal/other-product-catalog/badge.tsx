/** Illegal: Notice comes from the fake-ds fixture's catalog, not the fixture product's. */
import { Notice } from "../../fake-ds/catalog";

export function BorrowedNotice() {
  return <Notice>New</Notice>;
}
