import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, test, vi } from "vitest";
import { ThemeSwitcher } from "@/features/theme/components/ThemeSwitcher";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
});

const html = document.documentElement;
const button = () => screen.getByRole("button", { name: "থিম বদলান" });
const items = () => screen.getAllByRole("menuitemradio");
const item = (name: string) => screen.getByRole("menuitemradio", { name });
const menu = () => screen.queryByRole("menu");
const checked = () => items().filter((el) => el.getAttribute("aria-checked") === "true");

function openWithClick() {
  render(<ThemeSwitcher />);
  fireEvent.click(button());
}

describe("server render", () => {
  test("has no menu and no selected state before mount", () => {
    localStorage.setItem("es-theme", "paper");
    html.setAttribute("data-theme", "paper");
    const markup = renderToString(<ThemeSwitcher />);
    expect(markup).toContain('aria-haspopup="menu"');
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).toContain('aria-label="থিম বদলান"');
    expect(markup).not.toContain("menuitemradio");
    expect(markup).not.toContain('aria-checked="true"');
    expect(markup).not.toContain("✓");
  });
});

describe("opening", () => {
  test("button opens a menu with the three themes and checks the current one", () => {
    localStorage.setItem("es-theme", "black");
    html.setAttribute("data-theme", "black");
    openWithClick();
    expect(button().getAttribute("aria-expanded")).toBe("true");
    expect(items().map((el) => el.textContent)).toEqual(["নেভি", "কালো✓", "কাগজ"]);
    expect(checked()).toEqual([item("কালো")]);
    expect(document.activeElement).toBe(item("কালো"));
  });

  test("defaults to navy when nothing is stored", () => {
    openWithClick();
    expect(checked()).toEqual([item("নেভি")]);
  });

  test("ArrowDown on the button opens on the checked item, ArrowUp on the last", () => {
    render(<ThemeSwitcher />);
    fireEvent.keyDown(button(), { key: "ArrowDown" });
    expect(document.activeElement).toBe(item("নেভি"));
    fireEvent.keyDown(item("নেভি"), { key: "Escape" });
    fireEvent.keyDown(button(), { key: "ArrowUp" });
    expect(document.activeElement).toBe(item("কাগজ"));
  });

  test("clicking the button again closes the menu", () => {
    openWithClick();
    fireEvent.click(button());
    expect(menu()).toBeNull();
  });
});

describe("keyboard in the menu", () => {
  test("arrow keys wrap, Home and End jump", () => {
    openWithClick();
    const key = (k: string) => fireEvent.keyDown(document.activeElement!, { key: k });
    key("ArrowDown");
    expect(document.activeElement).toBe(item("কালো"));
    key("ArrowDown");
    key("ArrowDown");
    expect(document.activeElement).toBe(item("নেভি"));
    key("ArrowUp");
    expect(document.activeElement).toBe(item("কাগজ"));
    key("Home");
    expect(document.activeElement).toBe(item("নেভি"));
    key("End");
    expect(document.activeElement).toBe(item("কাগজ"));
  });

  test("Escape closes and returns focus to the button", () => {
    openWithClick();
    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    expect(menu()).toBeNull();
    expect(document.activeElement).toBe(button());
  });

  test("Tab closes and hands focus back to the button", () => {
    openWithClick();
    fireEvent.keyDown(document.activeElement!, { key: "Tab" });
    expect(menu()).toBeNull();
    expect(document.activeElement).toBe(button());
  });
});

describe("selecting", () => {
  // Enter and Space on a native <button> fire click, which is what selects.
  test("applies, saves, closes and returns focus", () => {
    openWithClick();
    fireEvent.click(item("কাগজ"));
    expect(html.getAttribute("data-theme")).toBe("paper");
    expect(localStorage.getItem("es-theme")).toBe("paper");
    expect(menu()).toBeNull();
    expect(document.activeElement).toBe(button());
    fireEvent.click(button());
    expect(checked()).toEqual([item("কাগজ")]);
  });

  test("navy removes the attribute and is saved", () => {
    html.setAttribute("data-theme", "black");
    openWithClick();
    fireEvent.click(item("নেভি"));
    expect(html.hasAttribute("data-theme")).toBe(false);
    expect(localStorage.getItem("es-theme")).toBe("navy");
  });

  test("still applies the theme when localStorage throws", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    openWithClick();
    fireEvent.click(item("কালো"));
    expect(html.getAttribute("data-theme")).toBe("black");
    fireEvent.click(button());
    expect(checked()).toEqual([item("কালো")]);
  });
});

test("outside click closes the menu and leaves focus where the user clicked", () => {
  render(
    <>
      <ThemeSwitcher />
      <input aria-label="outside" />
    </>,
  );
  fireEvent.click(button());
  const outside = screen.getByLabelText("outside");
  outside.focus();
  fireEvent.pointerDown(outside);
  expect(menu()).toBeNull();
  expect(document.activeElement).toBe(outside);
});

test("follows a theme change made in another tab", () => {
  openWithClick();
  fireEvent(window, new StorageEvent("storage", { key: "es-theme", newValue: "paper" }));
  expect(html.getAttribute("data-theme")).toBe("paper");
  expect(checked()).toEqual([item("কাগজ")]);
});
