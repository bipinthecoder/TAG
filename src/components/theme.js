export { ThemeProvider } from "@mui/material/styles";
import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    mode: "dark",
    background: { default: "#15181C", paper: "#1E232A" },
    warning: { main: "#E76F51" },
  },
});

export const GROUP_COLORS = ["#5BC8AF", "#E8B45A", "#9D8CFF", "#E07A9E", "#6FB1E8"];
