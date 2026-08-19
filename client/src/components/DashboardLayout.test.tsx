// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import DashboardLayout from "./DashboardLayout";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

describe("DashboardLayout", () => {
  it("mantém o controle de navegação alcançável por teclado e com foco visível", () => {
    render(<DashboardLayout><button>Conteúdo principal</button></DashboardLayout>);
    const toggle = screen.getByRole("button", { name: "Alternar navegação" });
    toggle.focus();

    expect(document.activeElement).toBe(toggle);
    expect(toggle.className).toContain("focus-visible");
  });
});
