import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";

import "flavours/glitch/styles/application.scss";

import { CheckForUpdatesButton } from "./check_for_updates_button";

// __BUILD_ID__ is "test-build-id" under Storybook/Vitest (see vitest.config.mts).
const swText = (buildId: string) => `const BUILD_ID="${buildId}";`;

// Stand in for the server: whatever sw.js says decides "up to date" vs "update".
const serveSw = (buildId: string) => {
  const original = window.fetch;

  window.fetch = () =>
    Promise.resolve(new Response(swText(buildId), { status: 200 })) as unknown as ReturnType<
      typeof fetch
    >;

  return () => {
    window.fetch = original;
  };
};

const inNavigationPanel: Decorator = (Story) => (
  <div className="navigation-panel" style={{ width: 280 }}>
    <div className="navigation-panel__check-updates">
      <Story />
    </div>
  </div>
);

// The update check goes through the browser's service worker machinery, which can be
// slow when many story files run in parallel.
const SLOW_MACHINE_MS = 8000;

const meta = {
  title: "Navigation panel/Check for updates button",
  component: CheckForUpdatesButton,
  decorators: [inNavigationPanel],
  tags: ["test"],
} satisfies Meta<typeof CheckForUpdatesButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const UpToDate: Story = {
  beforeEach: () => serveSw("test-build-id"),
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole("button");

    await expect(button).toHaveTextContent("Click here to check for updates on MiaCivezza.com");

    // High-visibility: green, and larger than ordinary menu text.
    const style = getComputedStyle(button);
    await expect(style.backgroundColor).toBe("rgb(27, 127, 59)");
    await expect(Number.parseFloat(style.fontSize)).toBeGreaterThanOrEqual(17);

    await userEvent.click(button);
    await waitFor(() => expect(button).toHaveTextContent("You're up to date"), {
      timeout: SLOW_MACHINE_MS,
    });
  },
};

export const UpdateAvailable: Story = {
  beforeEach: () => serveSw("a-newer-build"),
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole("button");

    await userEvent.click(button);
    await waitFor(
      () =>
        expect(button).toHaveTextContent(
          "YES, new update available. Click here to update and continue",
        ),
      { timeout: SLOW_MACHINE_MS },
    );
  },
};

export const CannotReachServer: Story = {
  beforeEach: () => {
    const original = window.fetch;
    window.fetch = () => Promise.reject(new TypeError("offline"));

    return () => {
      window.fetch = original;
    };
  },
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole("button");

    await userEvent.click(button);
    await waitFor(() => expect(button).toHaveTextContent("Couldn't check for updates"), {
      timeout: SLOW_MACHINE_MS,
    });
  },
};
