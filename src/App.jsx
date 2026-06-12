import { useState } from 'react';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Paper from "@mui/material/Paper";
import Chip from "@mui/material/Chip";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider, createTheme } from "@mui/material/styles";


// Theme for the page

const theme = createTheme({
  palette: {
    mode: "dark",
    background: { default: "#15181C", paper: "#1E232A" },
    warning: { main: "#E76F51" } // This will be avilable as warning everywhere in App.jsx
  },
});


const GROUPS = [
  { id: "g1", name: "Semantic", labels: ["Smoking Litter", "Drinks Litter", "Food Litter", "Refuse", "Dog Litter"] },
  { id: "g2", name: "Material", labels: ["Plastic", "Metal", "Paper", "Glass", "Wood"] },
];

const INITIAL_ITEMS = [
  { id: 1, file: "crop_001.jpg", labels: {}, flagged: false },
  { id: 2, file: "crop_002.jpg", labels: {}, flagged: false },
  { id: 3, file: "crop_003.jpg", labels: {}, flagged: false },
];


function App() {
  const [idx, setIdx] = useState(0);
  const [items, setItems] = useState(INITIAL_ITEMS);

  const item = items[idx];

  const goPrev = () => setIdx(Math.max(0, idx - 1));
  const goNext = () => setIdx(Math.min(items.length - 1, idx + 1));

  // Set label function for the current crop
  const setLabel = (groupId, label) => {
    setItems(
      items.map((it, i) => {
        return i === idx 
        ?{
           ...it,
          labels: {
            ...it.labels,
            [groupId]: it.labels[groupId] == label ? null: label, // If user clicks the same label again, we remove the label (toggle behavior)
          }}
        : it
      })
    );
  };



return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {/* Page is now a COLUMN: main row on top, label panels below */}
      <Stack sx={{ minHeight: "100vh", p: 2, gap: 2 }}>

        {/* Main row: paddles stretch to match the image column's height */}
        <Stack direction="row" spacing={2} sx={{ alignItems: "stretch", justifyContent: "center" }}>
          <Button variant="outlined" onClick={goPrev} disabled={idx === 0} sx={{ width: 120 }}>
            ‹ Prev
          </Button>

          <Stack spacing={1} sx={{ alignItems: "center", width: "100%", maxWidth: 480 }}>
            <Stack
              sx={{
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
                aspectRatio: "1/1",
                bgcolor: "background.paper",
                borderRadius: 3,
                border: 3,
                borderColor: "warning.main",
              }}
            >
              <Typography sx={{ color: "grey.400", fontFamily: "monospace" }}>
                {item.file}
              </Typography>
            </Stack>
            <Typography variant="body2" sx={{ fontFamily: "monospace", color: "grey.500" }}>
              {item.file} · ({idx + 1} of {items.length})
            </Typography>
          </Stack>

          <Button variant="outlined" onClick={goNext} disabled={idx === items.length - 1} sx={{ width: 120 }}>
            Next ›
          </Button>
        </Stack>

        {/* Label panels */}
        {GROUPS.map((group) => (
          <Paper key={group.id} sx={{ p: 2, maxWidth: 760, width: "100%", mx: "auto" }}>
            <Typography variant="overline" sx={{ color: "grey.400" }}>
              {group.name}
            </Typography>
            <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1, mt: 1 }}>
              {group.labels.map((label) => (
                <Chip
                  key={label}
                  label={label}
                  clickable
                  color={item.labels[group.id] === label ? "success" : "default"}
                  onClick={() => setLabel(group.id, label)}
                />
              ))}
            </Stack>
          </Paper>
        ))}
      </Stack>
    </ThemeProvider>
  );
}

export default App
