import { useState } from 'react';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CssBaseline from "@mui/material/CssBaseline";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import FlagIcon from "@mui/icons-material/Flag";

import Paddle from "./components/Paddle";
import LabelGroupPanel from './components/LabelGroupPanel';
import { ThemeProvider, theme, GROUP_COLORS } from './components/theme';

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
  const [groups, setGroups] = useState(GROUPS);
  const [autoAdvance, setAutoAdvance] = useState(true);

  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

  const item = items[idx];

  const labelledCount = items.filter(it => groups.every(g => it.labels[g.id])).length;
  const flaggedCount = items.filter(it => it.flagged).length;

  const goPrev = () => setIdx(Math.max(0, idx - 1));
  const goNext = () => setIdx(Math.min(items.length - 1, idx + 1));

  const setLabel = (groupId, label) => {
    const newItems = items.map((it, i) => {
      if (i !== idx) return it;
      return {
        ...it,
        labels: {
          ...it.labels,
          [groupId]: it.labels[groupId] === label ? null : label,
        },
      };
    });
    setItems(newItems);

    if (autoAdvance) {
      const updated = newItems[idx];
      if (groups.every(g => updated.labels[g.id]) && idx < items.length - 1) {
        setIdx(idx + 1);
      }
    }
  };

  const flagItem = () => {
    setItems(items.map((it, i) => i === idx ? { ...it, flagged: !it.flagged } : it));
  };

  const addLabelToGroup = (groupId, label) => {
    setGroups(groups.map(g =>
      g.id === groupId && !g.labels.includes(label)
        ? { ...g, labels: [...g.labels, label] }
        : g
    ));
  };

  const removeLabelFromGroup = (groupId, label) => {
    setGroups(groups.map(g =>
      g.id === groupId ? { ...g, labels: g.labels.filter(l => l !== label) } : g
    ));
    setItems(items.map(it =>
      it.labels[groupId] === label ? { ...it, labels: { ...it.labels, [groupId]: null } } : it
    ));
  };

  const addGroup = () => {
    const name = newGroupName.trim();
    if (!name) return;
    setGroups([...groups, { id: crypto.randomUUID(), name, labels: [] }]);
    setNewGroupName("");
    setGroupDialogOpen(false);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Stack sx={{ minHeight: "100vh", p: 2, gap: 2 }}>

        {/* Header */}
        <Stack direction="row" alignItems="center">
          <Stack direction="row" alignItems="center" gap={1.5} sx={{ flex: 1 }}>
            <Typography variant="body1" sx={{ fontWeight: 700 }}>
              Crop review
            </Typography>
            <Typography variant="body2" sx={{ color: "grey.500" }}>&nbsp;</Typography>
            <Typography variant="body2" sx={{ color: "grey.500" }}>&nbsp;</Typography>
            <Typography variant="body1" sx={{ color: "grey.500" }}>
              {labelledCount}/{items.length} labelled
              {flaggedCount > 0 && (
                <Typography component="span" variant="body1" sx={{ color: "#E07A7A", ml: 1 }}>
                  · {flaggedCount} flagged
                </Typography>
              )}
            </Typography>
          </Stack>
          <FormControlLabel
            control={
              <Checkbox
                checked={autoAdvance}
                onChange={e => setAutoAdvance(e.target.checked)}
                size="small"
                sx={{ color: "grey.600", "&.Mui-checked": { color: "#5BC8AF" } }}
              />
            }
            label={<Typography variant="caption" sx={{ color: "grey.500" }}>Auto-advance when both set</Typography>}
          />
        </Stack>

        {/* Progress bar */}
        <Stack direction="row" gap="3px">
          {items.map((it, i) => {
            const labelled = groups.every(g => it.labels[g.id]);
            const bg = i === idx ? "#fff" : it.flagged ? "#E07A7A" : labelled ? "#5BC8AF" : "#2a2f38";
            return (
              <Stack
                key={it.id}
                onClick={() => setIdx(i)}
                sx={{ flex: 1, height: 5, borderRadius: 1, bgcolor: bg, cursor: "pointer", opacity: i === idx ? 1 : 0.75 }}
              />
            );
          })}
        </Stack>

        {/* Image row */}
        <Stack direction="row" spacing={2} sx={{ alignItems: "stretch", justifyContent: "center" }}>
          <Paddle direction="prev" onClick={goPrev} disabled={idx === 0} />

          <Stack spacing={1} sx={{ alignItems: "center", width: "100%", maxWidth: 480 }}>
            <Stack sx={{ position: "relative", width: "100%", aspectRatio: "1/1" }}>
              <Stack
                sx={{
                  alignItems: "center",
                  justifyContent: "center",
                  width: "100%",
                  height: "100%",
                  bgcolor: "background.paper",
                  borderRadius: 3,
                  border: 3,
                  borderColor: item.flagged ? "#E07A7A" : "warning.main",
                }}
              >
                <Typography sx={{ color: "grey.400", fontFamily: "monospace" }}>
                  {item.file}
                </Typography>
              </Stack>
              {item.flagged && (
                <Stack
                  direction="row"
                  alignItems="center"
                  gap={0.5}
                  sx={{
                    position: "absolute",
                    top: 12,
                    right: 12,
                    bgcolor: "#E07A7A",
                    color: "#000",
                    px: 1.5,
                    py: 0.5,
                    borderRadius: 1,
                  }}
                >
                  <FlagIcon sx={{ fontSize: 13 }} />
                  <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: 1 }}>FLAGGED</Typography>
                </Stack>
              )}
            </Stack>
            <Typography variant="body2" sx={{ fontFamily: "monospace", color: "grey.500" }}>
              {item.file} · ({idx + 1} of {items.length})
            </Typography>
          </Stack>

          <Paddle direction="next" onClick={goNext} disabled={idx === items.length - 1} />
        </Stack>

        {/* Flag button */}
        <Button
          onClick={flagItem}
          startIcon={<FlagIcon />}
          variant={item.flagged ? "contained" : "outlined"}
          sx={{
            maxWidth: 480,
            mx: "auto",
            width: "100%",
            borderColor: "#E07A7A",
            color: item.flagged ? "#000" : "#E07A7A",
            bgcolor: item.flagged ? "#E07A7A" : "transparent",
            "&:hover": { bgcolor: "#E07A7A", color: "#000", borderColor: "#E07A7A" },
          }}
        >
          Flagged — not sure
        </Button>

        {/* Label panels */}
        {groups.map((group, gi) => (
          <LabelGroupPanel
            key={group.id}
            group={group}
            color={GROUP_COLORS[gi % GROUP_COLORS.length]}
            selectedLabel={item.labels[group.id]}
            onSelectLabel={(label) => setLabel(group.id, label)}
            onAddLabel={(label) => addLabelToGroup(group.id, label)}
            onRemoveLabel={(label) => removeLabelFromGroup(group.id, label)}
          />
        ))}

        <Button
          onClick={() => setGroupDialogOpen(true)}
          sx={{ color: "grey.600", textTransform: "none", alignSelf: "center" }}
        >
          + Add group
        </Button>

        <Dialog open={groupDialogOpen} onClose={() => setGroupDialogOpen(false)}>
          <DialogTitle>New group</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Group name"
              fullWidth
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addGroup(); }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setGroupDialogOpen(false)}>Cancel</Button>
            <Button onClick={addGroup} variant="contained">Add</Button>
          </DialogActions>
        </Dialog>

      </Stack>
    </ThemeProvider>
  );
}

export default App;
