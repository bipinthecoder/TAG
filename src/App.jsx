import {useState} from 'react';
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
      <Stack spacing={2} direction="row" mt={4}>
        <Button variant = "contained" onClick = {goPrev} disabled={idx === 0}>
           Prev
        </Button>

        <Typography variant="h4">{item.file}({idx + 1} of {ITEMS.length})</Typography>

        <Button variant = "contained" onClick = {goNext} disabled={idx === ITEMS.length - 1}>
           Next
        </Button>
      </Stack>
  )
}

export default App
