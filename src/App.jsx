import { useState } from 'react';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';


// TODO: Will remove it for the user files
const ITEMS = [
  { id: 1, file: "crop_001.jpg" },
  { id: 2, file: "crop_002.jpg" },
  { id: 3, file: "crop_003.jpg" },
];


function App() {
  const [idx, setIdx] = useState(0);
  const item = ITEMS[idx];

  const goPrev = () => setIdx(Math.max(0, idx - 1));
  const goNext = () => setIdx(Math.min(ITEMS.length - 1, idx + 1));

  return (
    <Stack spacing={2}
      direction="row" mt={4}
      alignItems="stretch"
      sx={{ height: "80vh", p: 2 }}
    >
      <Button variant="contained" onClick={goPrev} disabled={idx === 0}>
        Prev
      </Button>

      <Stack  // column stack for the middle section -> Image + Filename + Flag
        spacing = {1}
        alignItems="center"
        sx={{ flex: 1 }}
      >
        <Stack 
          alignItems="center"
          justifyContent="center"
          sx={{ 
            width: "100%", 
            maxWidth: 480,
            aspectRatio: "1/1",
            bgcolor: "grey.800",
            borderRadius: 3
          }}
        >
          <Typography sx={{ color: "grey.400", fontFamily: "monospace" }}>
            {item.file}
          </Typography>

        </Stack>

        <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
          {item.file} . ({idx + 1} of {ITEMS.length})
        </Typography>

      </Stack>

      <Button variant="contained" onClick={goNext} disabled={idx === ITEMS.length - 1}>
        Next
      </Button>
    </Stack>
  )
}

export default App
