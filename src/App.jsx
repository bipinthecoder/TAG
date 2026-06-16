import { useState, useEffect, useRef, useMemo } from 'react';
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

function matchesFilter(item, filter, groups) {
  if (!filter) return true;
  if (filter.type === 'flagged') return item.flagged;
  if (filter.type === 'unlabelled') return groups.length > 0 && groups.some(g => !item.labels[g.id]);
  if (filter.type === 'label') return item.labels[filter.groupId] === filter.label;
  return true;
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

  const [activeFilter, setActiveFilter] = useState(null);

  const filteredIndices = useMemo(
    () => items.map((_, i) => i).filter(i => matchesFilter(items[i], activeFilter, groups)),
    [items, activeFilter, groups]
  );

  const applyFilter = (filter) => {
    setActiveFilter(filter);
    if (filter) {
      const first = items.findIndex(it => matchesFilter(it, filter, groups));
      if (first !== -1 && first !== idx) setIdx(first);
    }
  };

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
    setActiveFilter(null);
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

  const filteredPos = filteredIndices.indexOf(idx);

  const goPrev = () => {
    if (autoConfirmSuggested) setItems(prev => promoteSuggested(prev, idx));
    if (activeFilter) {
      if (filteredPos > 0) setIdx(filteredIndices[filteredPos - 1]);
    } else {
      setIdx(Math.max(0, idx - 1));
    }
  };
  const goNext = () => {
    if (autoConfirmSuggested) setItems(prev => promoteSuggested(prev, idx));
    if (activeFilter) {
      if (filteredPos < filteredIndices.length - 1) setIdx(filteredIndices[filteredPos + 1]);
    } else {
      setIdx(Math.min(items.length - 1, idx + 1));
    }
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
      if (groups.every(g => updated.labels[g.id])) {
        const indices = activeFilter
          ? newItems.map((_, i) => i).filter(i => matchesFilter(newItems[i], activeFilter, groups))
          : newItems.map((_, i) => i);
        const pos = indices.indexOf(idx);
        if (pos < indices.length - 1) setIdx(indices[pos + 1]);
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

          {/* Filter bar */}
          <Stack direction="row" flexWrap="wrap" gap={0.75} alignItems="center">
            {[
              { label: 'All', filter: null },
              { label: 'Unlabelled', filter: { type: 'unlabelled' } },
              { label: 'Flagged', filter: { type: 'flagged' }, color: '#E07A7A' },
            ].map(({ label, filter, color }) => {
              const active = filter === null ? !activeFilter : activeFilter?.type === filter?.type;
              const ac = color ?? '#5BC8AF';
              return (
                <Chip key={label} label={label} size="small" onClick={() => applyFilter(filter)}
                  sx={{
                    height: 22, fontSize: 11, borderRadius: '999px',
                    bgcolor: active ? ac : 'transparent',
                    color: active ? '#000' : 'grey.500',
                    border: '1px solid', borderColor: active ? ac : 'grey.800',
                    '& .MuiChip-label': { px: 1 },
                    '&:hover': { borderColor: ac, color: active ? '#000' : 'grey.300', bgcolor: active ? ac : 'transparent' },
                  }}
                />
              );
            })}

            {groups.map((group, gi) => {
              const groupColor = GROUP_COLORS[gi % GROUP_COLORS.length];
              return [
                <Stack key={`${group.id}-div`}
                  sx={{ width: 1, height: 14, bgcolor: 'grey.800', borderRadius: 1, mx: 0.25, alignSelf: 'center' }} />,
                <Typography key={`${group.id}-name`} variant="caption"
                  sx={{ color: 'grey.600', fontSize: 11, alignSelf: 'center', flexShrink: 0 }}>
                  {group.name}:
                </Typography>,
                ...[...group.labels].sort((a, b) => a.localeCompare(b)).map(label => {
                  const active = activeFilter?.type === 'label' &&
                    activeFilter.groupId === group.id && activeFilter.label === label;
                  return (
                    <Chip key={`${group.id}:${label}`} label={label} size="small"
                      onClick={() => applyFilter({ type: 'label', groupId: group.id, label })}
                      sx={{
                        height: 22, fontSize: 11, borderRadius: '999px',
                        bgcolor: active ? groupColor : 'transparent',
                        color: active ? '#000' : 'grey.500',
                        border: '1px solid', borderColor: active ? groupColor : 'grey.800',
                        '& .MuiChip-label': { px: 1 },
                        '&:hover': { borderColor: groupColor, color: active ? '#000' : 'grey.300', bgcolor: active ? groupColor : 'transparent' },
                      }}
                    />
                  );
                }),
              ];
            })}
          </Stack>

          {/* Progress bar – 40-item window within filtered set */}
          {(() => {
            const WIN = 40;
            const displayPos = filteredPos === -1 ? 0 : filteredPos;
            const winStart = Math.floor(displayPos / WIN) * WIN;
            const winSlice = filteredIndices.slice(winStart, winStart + WIN);
            return (
              <Stack gap="3px">
                <Stack direction="row" gap="3px">
                  {winSlice.map(globalI => {
                    const it = items[globalI];
                    const labelled = groups.length > 0 && groups.every(g => it.labels[g.id]);
                    const bg = globalI === idx ? "#fff" : it.flagged ? "#E07A7A" : labelled ? "#5BC8AF" : "#2a2f38";
                    return (
                      <Stack key={it.id} onClick={() => setIdx(globalI)}
                        sx={{ flex: 1, height: 5, borderRadius: 1, bgcolor: bg,
                          cursor: "pointer", opacity: globalI === idx ? 1 : 0.75 }}
                      />
                    );
                  })}
                </Stack>
                <Typography variant="caption" sx={{ color: "grey.700", alignSelf: "flex-end", fontSize: 10 }}>
                  {filteredIndices.length === 0 ? '0 results' : `${winStart + 1}–${Math.min(winStart + WIN, filteredIndices.length)} of ${filteredIndices.length}${activeFilter ? ' filtered' : ''}`}
                </Typography>
              </Stack>
            );
          })()}

          {/* Image row */}
          {filteredIndices.length === 0 ? (
            <Stack sx={{ py: 6, alignItems: 'center', gap: 1 }}>
              <Typography sx={{ color: 'grey.600' }}>No items match this filter</Typography>
              <Button onClick={() => applyFilter(null)}
                sx={{ color: 'grey.400', textTransform: 'none', fontSize: 13 }}>
                Clear filter
              </Button>
            </Stack>
          ) : null}

          {filteredIndices.length > 0 && <Stack direction="row" spacing={2} sx={{ alignItems: "stretch", justifyContent: "center" }}>
            <Paddle direction="prev" onClick={goPrev}
              disabled={activeFilter ? filteredPos <= 0 : idx === 0} />

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
                {item.file} · ({activeFilter ? `${filteredPos + 1} of ${filteredIndices.length} filtered` : `${idx + 1} of ${items.length}`})
              </Typography>
            </Stack>

            <Paddle direction="next" onClick={goNext}
              disabled={activeFilter ? filteredPos >= filteredIndices.length - 1 : idx === items.length - 1} />
          </Stack>}

          {/* Flag button + labels — hidden when filter yields no results */}
          {filteredIndices.length > 0 && <Button
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
          </Button>}

          {filteredIndices.length > 0 && <>{/* Label panels */}
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

          </>}

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
