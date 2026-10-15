import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SearchBar from "../components/SearchBar";

describe("SearchBar", () => {
  it("renders search input and category filter dropdown", () => {
    const onSearchChange = vi.fn();
    const onCategoryChange = vi.fn();

    render(
      <SearchBar
        search=""
        category=""
        onSearchChange={onSearchChange}
        onCategoryChange={onCategoryChange}
      />
    );

    const input = screen.getByPlaceholderText(/search products/i);
    expect(input).toBeInTheDocument();

    const select = screen.getByRole("combobox", { name: /filter by category/i });
    expect(select).toBeInTheDocument();
  });

  it("calls onSearchChange when user types in search input", () => {
    const onSearchChange = vi.fn();
    const onCategoryChange = vi.fn();

    render(
      <SearchBar
        search=""
        category=""
        onSearchChange={onSearchChange}
        onCategoryChange={onCategoryChange}
      />
    );

    const input = screen.getByPlaceholderText(/search products/i);
    fireEvent.change(input, { target: { value: "oscilloscope" } });

    expect(onSearchChange).toHaveBeenCalledWith("oscilloscope");
  });
});
