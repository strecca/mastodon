import { useMemo } from "react";

import { configureStore } from "@reduxjs/toolkit";
import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { Provider } from "react-redux";
import { expect, userEvent, waitFor } from "storybook/test";

import { COMPOSE_UPLOAD_SUCCESS } from "flavours/glitch/actions/compose";
import { rootReducer } from "flavours/glitch/reducers";
import { defaultMiddleware } from "flavours/glitch/store/store";
import "flavours/glitch/styles/application.scss";

import { UploadForm } from "./upload_form";

// The compose form lives in a narrow left-hand column on desktop; 320px is
// representative. Photo tiles must stay a usable size in it however many photos
// are attached -- with 3-4 photos they used to shrink to about half height and
// the remove (X) button became hard to hit, so members could not delete photos
// from an existing post (reported 2026-09-19).
const COLUMN_WIDTH = 320;

const photo = (id: number) => {
  const hue = (id * 70) % 360;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600"><rect width="400" height="600" fill="hsl(${hue},60%,55%)"/></svg>`;
  const uri = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

  return {
    id: String(id),
    type: "image",
    url: uri,
    preview_url: uri,
    description: "",
    blurhash: null,
    meta: { focus: { x: 0, y: 0 } },
  };
};

// A real glitch store (glitch's own reducers, so slices like `local_settings`
// exist), filled through the same upload-success action the app uses.
const storeWithPhotos = (count: number) => {
  const store = configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) => getDefaultMiddleware(defaultMiddleware),
  });

  for (let i = 1; i <= count; i += 1) {
    store.dispatch({ type: COMPOSE_UPLOAD_SUCCESS, media: photo(i), file: undefined });
  }

  return store;
};

const PhotoStore: React.FC<{ count: number; children: React.ReactNode }> = ({
  count,
  children,
}) => {
  const store = useMemo(() => storeWithPhotos(count), [count]);

  return (
    <Provider store={store}>
      <div className="compose-form" style={{ width: COLUMN_WIDTH }}>
        {children}
      </div>
    </Provider>
  );
};

// Each story says how many photos to attach via `parameters.photoCount`.
const withPhotos: Decorator = (Story, { parameters }) => (
  <PhotoStore count={Number(parameters.photoCount)}>
    <Story />
  </PhotoStore>
);

const removeButtons = (root: HTMLElement) =>
  Array.from(root.querySelectorAll<HTMLButtonElement>(".compose-form__upload__delete"));

const tiles = (root: HTMLElement) =>
  Array.from(root.querySelectorAll<HTMLElement>(".compose-form__upload"));

async function removeEveryPhoto(root: HTMLElement, total: number) {
  await waitFor(() => expect(removeButtons(root)).toHaveLength(total));

  // Nothing may cover any remove button: it must be the topmost element at its
  // own centre, and a comfortable size to hit.
  for (const button of removeButtons(root)) {
    const rect = button.getBoundingClientRect();
    const topmost = document.elementFromPoint(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
    );

    await expect(button.contains(topmost)).toBe(true);
    await expect(rect.width).toBeGreaterThanOrEqual(30);
    await expect(rect.height).toBeGreaterThanOrEqual(30);
  }

  // Click them one by one, the way a member would, until none are left.
  for (let remaining = total; remaining > 0; remaining -= 1) {
    const [first] = removeButtons(root);

    if (!first) {
      throw new Error("remove button missing");
    }

    await userEvent.click(first);
    await waitFor(() => expect(removeButtons(root)).toHaveLength(remaining - 1));
  }
}

async function expectUsableTiles(root: HTMLElement, total: number) {
  await waitFor(() => expect(tiles(root)).toHaveLength(total));

  for (const tile of tiles(root)) {
    const { width, height } = tile.getBoundingClientRect();

    // Same tall tile shape as the two-photo layout (height/width is about 1.5),
    // and never the ~86px-tall squashed tile the old 2x2 layout produced.
    await expect(height / width).toBeGreaterThan(1.3);
    await expect(height).toBeGreaterThanOrEqual(150);
  }
}

const meta = {
  title: "Compose/Upload form",
  component: UploadForm,
  tags: ["test"],
} satisfies Meta<typeof UploadForm>;

export default meta;

type Story = StoryObj<typeof meta>;

export const OnePhoto: Story = {
  parameters: { photoCount: 1 },
  decorators: [withPhotos],
  play: async ({ canvasElement }) => {
    await removeEveryPhoto(canvasElement, 1);
  },
};

export const TwoPhotos: Story = {
  parameters: { photoCount: 2 },
  decorators: [withPhotos],
  play: async ({ canvasElement }) => {
    await expectUsableTiles(canvasElement, 2);
    await removeEveryPhoto(canvasElement, 2);
  },
};

export const ThreePhotos: Story = {
  parameters: { photoCount: 3 },
  decorators: [withPhotos],
  play: async ({ canvasElement }) => {
    await expectUsableTiles(canvasElement, 3);
    await removeEveryPhoto(canvasElement, 3);
  },
};

export const FourPhotos: Story = {
  parameters: { photoCount: 4 },
  decorators: [withPhotos],
  play: async ({ canvasElement }) => {
    await expectUsableTiles(canvasElement, 4);
    await removeEveryPhoto(canvasElement, 4);
  },
};
