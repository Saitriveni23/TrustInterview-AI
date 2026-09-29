import { render, screen } from "@testing-library/react";
import App from "./App";

jest.mock("./firebase", () => ({ auth: { currentUser: null }, googleProvider: {} }));
jest.mock("./AuthContext", () => ({
  useAuth: () => ({ loading: false, profile: null, login: jest.fn(), logout: jest.fn(), error: "" }),
}));

test("renders the Firebase-backed RVCE candidate login", () => {
  window.history.pushState({}, "", "/login");
  render(<App />);
  expect(screen.getByRole("heading", { name: /rvce candidate access/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /continue with google/i })).toBeInTheDocument();
});
