import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { EnrollNameForm } from "@/components/EnrollNameForm";

describe("EnrollNameForm", () => {
  it("keeps the submit button disabled until the name and the consent are given", async () => {
    const user = userEvent.setup();
    render(<EnrollNameForm submitLabel="Enroll voice" onSubmit={vi.fn()} />);
    const submit = screen.getByRole("button", { name: "Enroll voice" });

    expect(submit).toBeDisabled();
    await user.type(screen.getByLabelText("Name"), "Daniel");
    expect(submit).toBeDisabled();
    await user.click(screen.getByRole("checkbox"));
    expect(submit).toBeEnabled();
  });

  it("does not accept a blank name even with consent", async () => {
    const user = userEvent.setup();
    render(<EnrollNameForm submitLabel="Enroll voice" onSubmit={vi.fn()} />);

    await user.type(screen.getByLabelText("Name"), "   ");
    await user.click(screen.getByRole("checkbox"));

    expect(screen.getByRole("button", { name: "Enroll voice" })).toBeDisabled();
  });

  it("submits the trimmed name", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<EnrollNameForm submitLabel="Enroll voice" onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("Name"), "  Daniel  ");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Enroll voice" }));

    expect(onSubmit).toHaveBeenCalledWith("Daniel");
  });

  it("states what consent means", () => {
    render(<EnrollNameForm submitLabel="Enroll voice" onSubmit={vi.fn()} />);

    expect(screen.getByRole("checkbox", { name: /owner of this voice agreed/i })).toBeInTheDocument();
  });

  it("stays disabled while a request is in flight", async () => {
    const user = userEvent.setup();
    render(<EnrollNameForm submitLabel="Enroll voice" onSubmit={vi.fn()} busy />);

    await user.type(screen.getByLabelText("Name"), "Daniel");
    await user.click(screen.getByRole("checkbox"));

    expect(screen.getByRole("button", { name: /Enroll voice/ })).toBeDisabled();
  });
});
