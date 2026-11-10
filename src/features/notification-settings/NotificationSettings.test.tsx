import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { DensityProvider, ThemeProvider } from "../../catalog";
import type { ModeledState } from "../../flows/notification-prefs";
import { NotificationSettings } from "./NotificationSettings";

function renderSettings(preview: ModeledState | null = null) {
  return render(
    <ThemeProvider appearance="light">
      <DensityProvider density="comfortable">
        <NotificationSettings preview={preview} />
      </DensityProvider>
    </ThemeProvider>,
  );
}

describe("notification settings views", () => {
  it("renders every modeled state", () => {
    const { unmount } = renderSettings("loading");
    expect(screen.getAllByText("Loading notification preferences").length).toBeGreaterThan(0);
    unmount();

    renderSettings("empty");
    expect(screen.getByRole("heading", { name: "No notification preferences yet" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("shows the error and a secondary retry", () => {
    render(
      <ThemeProvider appearance="light">
        <DensityProvider density="comfortable">
          <NotificationSettings preview="error" />
        </DensityProvider>
      </ThemeProvider>,
    );
    expect(screen.getByText("Couldn't load notification preferences.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("shows one primary Save and delivery windows as a disclosure", () => {
    renderSettings("ready");
    const primary = document.querySelector("[data-slot='primary']");
    expect(primary?.querySelectorAll("button")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
    expect(screen.getByText("Delivery windows").tagName).toBe("SUMMARY");
    expect(screen.queryByRole("button", { name: "Delivery windows" })).toBeNull();
  });

  it("saves after a channel change, opening delivery, and a window change", async () => {
    const user = userEvent.setup();
    renderSettings(null);
    await user.click(screen.getByRole("checkbox", { name: "Push" }));
    const details = document.querySelector("details");
    expect(details).not.toBeNull();
    if (details) details.open = true;
    details?.dispatchEvent(new Event("toggle", { bubbles: true }));
    await user.click(await screen.findByRole("radio", { name: "Afternoon" }));
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByText("Preferences saved")).toBeInTheDocument();
    expect(screen.getByText("Delivery window: Afternoon.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });
});
