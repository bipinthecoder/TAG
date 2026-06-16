import { useState, useEffect, useRef } from 'react';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import CssBaseline from "@mui/material/CssBaseline";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Divider from "@mui/material/Divider";
import FlagIcon from "@mui/icons-material/Flag";
import FileUploadIcon from "@mui/icons-material/FileUpload";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/).filter(l => l.trim());
  const result = [];
  // Always skip first line as header regardless of its content
  for (let i = 1; i < lines.length; i++) {
    const comma = lines[i].indexOf(',');
    if (comma === -1) continue;
    const filename = lines[i].slice(0, comma).trim();
    const label = lines[i].slice(comma + 1).trim();
    if (filename && label) result.push({ filename, label });
  }
  return result;
}

function CsvPreview({ rows }) {
  if (!rows || !rows.length) return null;
  const preview = rows.slice(0, 5);
  return (
    <Stack sx={{ bgcolor: 'rgba(0,0,0,0.25)', borderRadius: 1, p: 1, gap: 0.4 }}>
      {preview.map((row, i) => (
        <Stack key={i} direction="row" gap={1} sx={{ minWidth: 0 }}>
          <Typography variant="caption" sx={{
            fontFamily: 'monospace', color: 'grey.500', fontSize: 11,
            flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {row.filename}
          </Typography>
          <Typography variant="caption" sx={{ color: 'grey.700', flexShrink: 0, fontSize: 11 }}>→</Typography>
          <Typography variant="caption" sx={{
            fontFamily: 'monospace', color: 'grey.400', fontSize: 11,
            flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {row.label}
          </Typography>
        </Stack>
      ))}
      {rows.length > 5 && (
        <Typography variant="caption" sx={{ color: 'grey.700', fontSize: 10, mt: 0.25 }}>
          +{(rows.length - 5).toLocaleString()} more rows
        </Typography>
      )}
    </Stack>
  );
}

import Paddle from "./components/Paddle";
import LabelGroupPanel from './components/LabelGroupPanel';
import ImportDialog from './components/ImportDialog';
import ZoomOverlay from './components/ZoomOverlay';
import StatsPanel from './components/StatsPanel';
import { ThemeProvider, theme, GROUP_COLORS } from './components/theme';

function App() {
  const [idx, setIdx] = useState(0);
  const [items, setItems] = useState([]);
  const [groups, setGroups] = useState([]);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [autoConfirmSuggested, setAutoConfirmSuggested] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupCSV, setNewGroupCSV] = useState(null);
  const newGroupCSVRef = useRef(null);

  const handleGroupCSVChange = (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    file.text().then(text => {
      const rows = parseCSV(text);
      const labels = [...new Set(rows.map(r => r.label))];
      setNewGroupCSV({ filename: file.name, labels, rows });
    });
  };

  // Auto-open import on first load
  useEffect(() => { setImportOpen(true); }, []);

  // Close zoom when navigating to a different image
  useEffect(() => { setZoomed(false); }, [idx]);

  // ESC to close zoom
  useEffect(() => {
    if (!zoomed) return;
    const onKey = (e) => { if (e.key === 'Escape') setZoomed(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zoomed]);

  const handleImport = ({ items: newItems, groups: newGroups }) => {
    setItems(newItems);
    setGroups(newGroups);
    setIdx(0);
  };

  const item = items[idx];

  const labelledCount = items.filter(it =>
    groups.length > 0 && groups.every(g => it.labels[g.id])
  ).length;
  const flaggedCount = items.filter(it => it.flagged).length;

  const promoteSuggested = (prevItems, targetIdx) => {
    return prevItems.map((it, i) => {
      if (i !== targetIdx) return it;
      const suggested = it.suggestedLabels ?? {};
      const newLabels = { ...it.labels };
      for (const gid of Object.keys(suggested)) {
        if (!newLabels[gid] && suggested[gid]) newLabels[gid] = suggested[gid];
      }
      return { ...it, labels: newLabels };
    });
  };

  const goPrev = () => {
    if (autoConfirmSuggested) setItems(prev => promoteSuggested(prev, idx));
    setIdx(Math.max(0, idx - 1));
  };
  const goNext = () => {
    if (autoConfirmSuggested) setItems(prev => promoteSuggested(prev, idx));
    setIdx(Math.min(items.length - 1, idx + 1));
  };

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

    if (autoAdvance && groups.length > 0) {
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
    setItems(items.map(it => ({
      ...it,
      labels: it.labels[groupId] === label ? { ...it.labels, [groupId]: null } : it.labels,
      suggestedLabels: (it.suggestedLabels ?? {})[groupId] === label
        ? { ...(it.suggestedLabels ?? {}), [groupId]: null }
        : (it.suggestedLabels ?? {}),
    })));
  };

  const deleteGroup = (groupId) => {
    setGroups(prev => prev.filter(g => g.id !== groupId));
    setItems(prev => prev.map(it => {
      const labels = { ...it.labels };
      const suggestedLabels = { ...(it.suggestedLabels ?? {}) };
      delete labels[groupId];
      delete suggestedLabels[groupId];
      return { ...it, labels, suggestedLabels };
    }));
  };

  const addGroup = () => {
    const name = newGroupName.trim();
    if (!name) return;
    const gid = crypto.randomUUID();
    const csvLabels = newGroupCSV?.labels ?? [];
    setGroups(prev => [...prev, { id: gid, name, labels: csvLabels }]);
    if (newGroupCSV?.rows.length) {
      const labelMap = new Map(newGroupCSV.rows.map(r => [r.filename, r.label]));
      setItems(prev => prev.map(it => {
        const lbl = labelMap.get(it.file);
        if (!lbl || !csvLabels.includes(lbl)) return it;
        return { ...it, suggestedLabels: { ...(it.suggestedLabels ?? {}), [gid]: lbl } };
      }));
    }
    setNewGroupName("");
    setNewGroupCSV(null);
    setGroupDialogOpen(false);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      <ImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={handleImport}
      />

      {items.length === 0 ? (
        <Stack sx={{ minHeight: "100vh", alignItems: "center", justifyContent: "center", gap: 2 }}>
          <Typography variant="h6" sx={{ color: "grey.500" }}>No dataset loaded</Typography>
          <Typography variant="body2" sx={{ color: "grey.700" }}>
            Select an image folder to start labelling
          </Typography>
          <Button
            variant="contained"
            startIcon={<FileUploadIcon />}
            onClick={() => setImportOpen(true)}
            sx={{ bgcolor: '#5BC8AF', color: '#000', '&:hover': { bgcolor: '#4ab89f' } }}
          >
            Import Dataset
          </Button>
        </Stack>
      ) : (
        <Stack direction="row" sx={{ minHeight: "100vh" }}>
          <StatsPanel items={items} groups={groups} groupColors={GROUP_COLORS} />
          <Stack sx={{ flex: 1, minWidth: 0, p: 2, gap: 2 }}>

          {/* Header */}
          <Stack direction="row" alignItems="center">
            <Stack direction="row" alignItems="center" gap={1.5} sx={{ flex: 1 }}>
              <Typography variant="body1" sx={{ fontWeight: 700 }}>
                Crop review
              </Typography>
              <Typography variant="body1" sx={{ color: "grey.500" }}>
                {labelledCount}/{items.length} labelled
                {flaggedCount > 0 && (
                  <Typography component="span" variant="body1" sx={{ color: "#E07A7A", ml: 1 }}>
                    · {flaggedCount} flagged
                  </Typography>
                )}
              </Typography>
            </Stack>
            <Stack direction="row" alignItems="flex-start" gap={1}>
              <Stack>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={autoAdvance}
                      onChange={e => setAutoAdvance(e.target.checked)}
                      size="small"
                      sx={{ color: "grey.600", "&.Mui-checked": { color: "#5BC8AF" } }}
                    />
                  }
                  label={
                    <Typography variant="caption" sx={{ color: "grey.500" }}>
                      Auto-advance when all set
                    </Typography>
                  }
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={autoConfirmSuggested}
                      onChange={e => setAutoConfirmSuggested(e.target.checked)}
                      size="small"
                      sx={{ color: "grey.600", "&.Mui-checked": { color: "#5BC8AF" } }}
                    />
                  }
                  label={
                    <Typography variant="caption" sx={{ color: "grey.500" }}>
                      Confirm suggestions on navigate
                    </Typography>
                  }
                />
              </Stack>
              <Button
                size="small"
                startIcon={<FileUploadIcon sx={{ fontSize: 14 }} />}
                onClick={() => setImportOpen(true)}
                sx={{ color: "grey.600", textTransform: "none", fontSize: 12,
                  '&:hover': { color: 'grey.300' } }}
              >
                Import
              </Button>
            </Stack>
          </Stack>

          {/* Progress bar – 40-item window */}
          {(() => {
            const WIN = 40;
            const winStart = Math.floor(idx / WIN) * WIN;
            const winItems = items.slice(winStart, winStart + WIN);
            return (
              <Stack gap="3px">
                <Stack direction="row" gap="3px">
                  {winItems.map((it, wi) => {
                    const i = winStart + wi;
                    const labelled = groups.length > 0 && groups.every(g => it.labels[g.id]);
                    const bg = i === idx ? "#fff" : it.flagged ? "#E07A7A" : labelled ? "#5BC8AF" : "#2a2f38";
                    return (
                      <Stack
                        key={it.id}
                        onClick={() => setIdx(i)}
                        sx={{ flex: 1, height: 5, borderRadius: 1, bgcolor: bg,
                          cursor: "pointer", opacity: i === idx ? 1 : 0.75 }}
                      />
                    );
                  })}
                </Stack>
                <Typography variant="caption" sx={{ color: "grey.700", alignSelf: "flex-end", fontSize: 10 }}>
                  {winStart + 1}–{Math.min(winStart + WIN, items.length)} of {items.length}
                </Typography>
              </Stack>
            );
          })()}

          {/* Image row */}
          <Stack direction="row" spacing={2} sx={{ alignItems: "stretch", justifyContent: "center" }}>
            <Paddle direction="prev" onClick={goPrev} disabled={idx === 0} />

            <Stack spacing={1} sx={{ alignItems: "center", width: "100%", maxWidth: 480 }}>
              <Stack sx={{ position: "relative", width: "100%", aspectRatio: "1/1", overflow: "hidden", flexShrink: 0 }}>
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
                    overflow: "hidden",
                  }}
                >
                  {item.url ? (
                    <img
                      src={item.url}
                      alt={item.file}
                      onClick={() => setZoomed(true)} // Adding a zoom functionality for easy labelling
                      style={{ width: "100%", height: "100%", objectFit: "contain", cursor: "zoom-in" }}
                    />
                  ) : (
                    <Typography sx={{ color: "grey.400", fontFamily: "monospace" }}>
                      {item.file}
                    </Typography>
                  )}
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
              suggestedLabel={item.suggestedLabels?.[group.id]}
              onSelectLabel={(label) => setLabel(group.id, label)}
              onAddLabel={(label) => addLabelToGroup(group.id, label)}
              onRemoveLabel={(label) => removeLabelFromGroup(group.id, label)}
              onDeleteGroup={() => deleteGroup(group.id)}
            />
          ))}

          <Button
            onClick={() => setGroupDialogOpen(true)}
            sx={{ color: "grey.600", textTransform: "none", alignSelf: "center" }}
          >
            + Add group
          </Button>

          <Dialog open={groupDialogOpen} onClose={() => { setGroupDialogOpen(false); setNewGroupName(""); setNewGroupCSV(null); }} maxWidth="xs" fullWidth>
            <DialogTitle sx={{ pb: 1 }}>New group</DialogTitle>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
              <TextField
                autoFocus
                size="small"
                label="Group name"
                fullWidth
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addGroup(); }}
              />

              <Divider sx={{ borderColor: 'grey.800' }} />

              <input ref={newGroupCSVRef} type="file" accept=".csv"
                style={{ display: 'none' }} onChange={handleGroupCSVChange} />

              <Stack gap={1}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Stack gap={0.25}>
                    <Typography variant="overline" sx={{ color: 'grey.600', fontSize: 10, lineHeight: 1 }}>
                      Label CSV
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'grey.700', lineHeight: 1 }}>
                      optional · format: filename, label
                    </Typography>
                  </Stack>
                  <Button
                    size="small"
                    startIcon={<FileUploadIcon sx={{ fontSize: 13 }} />}
                    onClick={() => newGroupCSVRef.current?.click()}
                    sx={{ color: 'grey.500', textTransform: 'none', fontSize: 12,
                      '&:hover': { color: 'grey.300', bgcolor: 'transparent' } }}
                  >
                    {newGroupCSV ? 'Change' : 'Upload CSV'}
                  </Button>
                </Stack>

                {newGroupCSV && (
                  <Stack gap={1}>
                    <Stack direction="row" alignItems="center" gap={0.75}>
                      <CheckCircleIcon sx={{ fontSize: 13, color: '#5BC8AF' }} />
                      <Typography variant="caption" sx={{ color: '#5BC8AF', fontWeight: 600, flexShrink: 0 }}>
                        {newGroupCSV.rows.length.toLocaleString()} rows
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'grey.600', fontFamily: 'monospace',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                        · {newGroupCSV.filename}
                      </Typography>
                    </Stack>
                    <CsvPreview rows={newGroupCSV.rows} />
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 0.5 }}>
                      {newGroupCSV.labels.map(l => (
                        <Chip key={l} label={l} size="small" sx={{
                          bgcolor: 'rgba(255,255,255,0.05)', color: 'grey.300', fontSize: 11,
                          maxWidth: '100%', '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' },
                        }} />
                      ))}
                    </Box>
                  </Stack>
                )}
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => { setGroupDialogOpen(false); setNewGroupName(""); setNewGroupCSV(null); }}
                sx={{ color: 'grey.600' }}>
                Cancel
              </Button>
              <Button onClick={addGroup} variant="contained" disabled={!newGroupName.trim()}
                sx={{ bgcolor: '#5BC8AF', color: '#000', '&:hover': { bgcolor: '#4ab89f' },
                  '&.Mui-disabled': { bgcolor: 'rgba(255,255,255,0.08)', color: 'grey.600' } }}>
                Add group
              </Button>
            </DialogActions>
          </Dialog>

        </Stack>
        </Stack>
      )}

      {zoomed && item?.url && (
        <ZoomOverlay url={item.url} filename={item.file} onClose={() => setZoomed(false)} />
      )}
    </ThemeProvider>
  );
}

export default App;
