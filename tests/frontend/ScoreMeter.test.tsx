import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ScoreMeter } from "@/components/ScoreMeter";

describe("ScoreMeter", () => {
  it("exposes the score and the threshold to assistive technology", () => {
    render(<ScoreMeter score={0.9} threshold={0.45} status="match" />);

    const meter = screen.getByRole("meter");
    expect(meter).toHaveAttribute("aria-valuenow", "0.9");
    expect(meter).toHaveAttribute("aria-valuetext", "0.90 against a threshold of 0.45");
  });

  it("places the threshold notch at its share of the track", () => {
    const { container } = render(<ScoreMeter score={0.2} threshold={0.45} status="unknown" />);

    const notch = container.querySelector("[data-part='threshold']") as HTMLElement;
    expect(notch.style.left).toBe("45%");
  });

  it("keeps the fill inside the track for out-of-range scores", () => {
    const { container } = render(<ScoreMeter score={-0.2} threshold={0.45} status="unknown" />);

    const fill = container.querySelector("[data-part='fill']") as HTMLElement;
    expect(fill.style.width).toBe("0%");
  });

  it("names the status in text so color is never the only signal", () => {
    render(<ScoreMeter score={0.5} threshold={0.45} status="uncertain" />);

    expect(screen.getByText(/above the threshold/i)).toBeInTheDocument();
  });

  it("says when the score is below the threshold", () => {
    render(<ScoreMeter score={0.14} threshold={0.45} status="unknown" />);

    expect(screen.getByText(/below the threshold/i)).toBeInTheDocument();
  });
});
