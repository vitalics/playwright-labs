import React from "react";

export interface ThemeContextValue {
  theme: string;
}

export const ThemeContext = React.createContext<ThemeContextValue>({
  theme: "light",
});

interface ThemedButtonProps {
  label: string;
}

export class ThemedButton extends React.Component<ThemedButtonProps> {
  static contextType = ThemeContext;
  declare context: React.ContextType<typeof ThemeContext>;

  render() {
    const theme = this.context?.theme ?? "light";
    return (
      <button className={`themed-btn theme-${theme}`}>{this.props.label}</button>
    );
  }
}
