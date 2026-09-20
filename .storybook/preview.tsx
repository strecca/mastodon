import { useEffect, useState } from "react";

import { IntlProvider } from "react-intl";

import { MemoryRouter, Route } from "react-router";

import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";

import type { Preview } from "@storybook/react-vite";
import { initialize, mswLoader } from "msw-storybook-addon";
import { action } from "storybook/actions";

import {
  importCustomEmojiData,
  importLegacyShortcodes,
  importEmojiData,
} from "@/mastodon/features/emoji/loader";
import { IdentityContext as GlitchIdentityContext } from "@/flavours/glitch/identity_context";
import { reducerWithInitialState as glitchReducerWithInitialState } from "@/flavours/glitch/reducers";
import { IdentityContext } from "@/mastodon/identity_context";
import type { LocaleData } from "@/mastodon/locales";
import { reducerWithInitialState } from "@/mastodon/reducers";
import { defaultMiddleware } from "@/mastodon/store/store";
import { mockHandlers, unhandledRequestHandler } from "@/testing/api";

import { modes } from "./modes";

import "../app/javascript/styles/application.scss";
import "./styles.css";

// Disabling locales in Storybook as it's breaking with Vite 8.
// const localeFiles = import.meta.glob('@/mastodon/locales/*.json', {
//   query: { as: 'json' },
// });

// Initialize MSW
initialize({
  onUnhandledRequest: unhandledRequestHandler,
});

const preview: Preview = {
  // Auto-generate docs: https://storybook.js.org/docs/writing-docs/autodocs
  tags: ["autodocs"],
  globalTypes: {
    // locale: {
    //   description: 'Locale for the story',
    //   toolbar: {
    //     title: 'Locale',
    //     icon: 'globe',
    //     items: Object.keys(localeFiles).map((path) =>
    //       path.replace('/mastodon/locales/', '').replace('.json', ''),
    //     ),
    //     dynamicTitle: true,
    //   },
    // },
    theme: {
      description: "Theme for the story",
      toolbar: {
        title: "Theme",
        items: [
          { value: "light", icon: "circlehollow" },
          { value: "dark", icon: "circle" },
        ],
      },
    },
    loggedIn: {
      description: "Whether a user is logged in",
      toolbar: {
        title: "Logged in",
        icon: "user",
        items: [
          { value: "true", title: "logged in" },
          { value: "false", title: "logged out" },
        ],
      },
    },
  },
  initialGlobals: {
    locale: "en",
    theme: "light",
    loggedIn: "true",
  },
  decorators: [
    (Story, { parameters, globals, args, argTypes, title }) => {
      // Get the locale from the global toolbar
      // and merge it with any parameters or args state.
      const { locale } = globals as { locale: string };
      const { state = {}, stateFn } = parameters;

      const argsState: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(args)) {
        const argType = argTypes[key];
        if (argType?.reduxPath) {
          const reduxPath = Array.isArray(argType.reduxPath)
            ? argType.reduxPath.map((p) => p.toString())
            : argType.reduxPath.split(".");

          reduxPath.reduce((acc, key, i) => {
            if (acc[key] === undefined) {
              acc[key] = {};
            }
            if (i === reduxPath.length - 1) {
              acc[key] = value;
            }
            return acc[key] as Record<string, unknown>;
          }, argsState);
        }
      }

      let stateFnState: Record<string, unknown> = {};
      if (typeof stateFn === "function") {
        stateFnState =
          (
            stateFn as (args: Record<string, unknown>) => Record<string, unknown> | undefined | null
          )(args) ?? {};
      }

      // Glitch components read glitch-only state (e.g. `local_settings`), which the
      // vanilla reducers don't have, so glitch stories get glitch's own reducers.
      const createReducer = (
        title.startsWith("Glitch/") ? glitchReducerWithInitialState : reducerWithInitialState
      ) as typeof reducerWithInitialState;

      const reducer = createReducer(
        {
          meta: {
            locale,
          },
        },
        state,
        stateFnState,
        argsState,
      );

      const store = configureStore({
        reducer,
        middleware(getDefaultMiddleware) {
          return getDefaultMiddleware(defaultMiddleware);
        },
      });
      return (
        <Provider store={store}>
          <Story />
        </Provider>
      );
    },
    (Story, { globals }) => {
      const currentLocale = globals.locale || "en";
      const [messages, setMessages] = useState<Record<string, Record<string, string>>>({});
      const currentLocaleData = messages[currentLocale];

      useEffect(() => {
        async function loadLocaleData() {
          const { default: localeFile } = (await import(
            `@/mastodon/locales/${currentLocale}.json`
          )) as { default: LocaleData["messages"] };
          setMessages((prevLocales) => ({
            ...prevLocales,
            [currentLocale]: localeFile,
          }));
        }
        if (!currentLocaleData) {
          void loadLocaleData();
        }
      }, [currentLocale, currentLocaleData]);

      return (
        <IntlProvider locale={currentLocale} messages={currentLocaleData}>
          <Story />
        </IntlProvider>
      );
    },
    (Story, { globals }) => {
      const theme = globals.theme;
      useEffect(() => {
        document.documentElement.dataset.colorScheme = theme;
      }, [theme]);
      return <Story />;
    },
    (Story) => (
      <MemoryRouter>
        <Story />
        <Route
          path="*"
          // eslint-disable-next-line react/jsx-no-bind
          render={({ location }) => {
            if (location.pathname !== "/") {
              action(`route change to ${location.pathname}`)(location);
            }
            return null;
          }}
        />
      </MemoryRouter>
    ),
    (Story, { globals }) => {
      const signedIn = globals.loggedIn !== "false";
      const identity = {
        signedIn,
        accountId: signedIn ? "123" : undefined,
        disabledAccountId: undefined,
        permissions: 0,
      };
      // Each flavour has its own context object; provide both so a story works
      // whichever one its components read.
      return (
        <IdentityContext.Provider value={identity}>
          <GlitchIdentityContext.Provider value={identity}>
            <Story />
          </GlitchIdentityContext.Provider>
        </IdentityContext.Provider>
      );
    },
    (Story, { parameters }) => {
      useEffect(() => {
        document.documentElement.dataset.redesign = parameters.redesign ? "true" : "false";
      }, [parameters.redesign]);
      return <Story />;
    },
  ],
  loaders: [
    // Storybook runs loaders in parallel, but the emoji loaders fetch from the mocked
    // API, so MSW must be ready first. Otherwise, on a busy machine, they race it and
    // fail with "Failed to fetch emoji data ... Not Found".
    async (context) => {
      await mswLoader(context);
      await importCustomEmojiData();
      await importLegacyShortcodes();
      await importEmojiData(context.globals.locale);
    },
  ],
  parameters: {
    layout: "centered",

    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: "todo",
    },

    state: {},

    docs: {},

    msw: {
      handlers: mockHandlers,
    },

    chromatic: {
      modes: {
        dark: modes.darkTheme,
        light: modes.lightTheme,
      },
    },
  },
};

export default preview;
