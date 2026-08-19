// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

const setLocation = vi.fn();

vi.mock("wouter", () => ({ useLocation: () => ["/rota-inexistente", setLocation] }));

import NotFound from "./NotFound";

describe("NotFound", () => {
  it("apresenta a mensagem em português brasileiro e permite voltar ao início", () => {
    render(<NotFound />);
    expect(screen.getByRole("heading", { name: "Página não encontrada" })).toBeTruthy();
    expect(screen.getByText("A página solicitada não existe, foi movida ou não está disponível.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Voltar ao início" }));
    expect(setLocation).toHaveBeenCalledWith("/");
  });
});
