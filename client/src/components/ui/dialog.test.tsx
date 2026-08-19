// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "./dialog";

describe("Dialog", () => {
  it("expõe o controle de fechamento em português e com foco por teclado", () => {
    render(<Dialog><DialogTrigger>Abrir diálogo</DialogTrigger><DialogContent><DialogTitle>Confirmação</DialogTitle><DialogDescription>Conteúdo de teste.</DialogDescription></DialogContent></Dialog>);
    fireEvent.click(screen.getByRole("button", { name: "Abrir diálogo" }));
    const closeButton = screen.getByRole("button", { name: "Fechar" });
    closeButton.focus();

    expect(document.activeElement).toBe(closeButton);
    expect(closeButton.className).toContain("focus:ring-2");
  });
});
