import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import { useState } from "react";
import JSZip from "jszip";
import { loadBlob } from "../persistence";
import { version } from "../../package.json";

// ── Shared logic ──────────────────────────────────────────────────────────────

function isGroupExcluded(item, groupId, allGroups) {
  for (const g of allGroups) {
    if (g.id === groupId) continue;
    const lbl = item.labels[g.id];
    if (!lbl) continue;
    if ((g.exclusions?.[lbl] ?? []).includes(groupId)) return true;
  }
  return false;
}

// ── Export helpers ────────────────────────────────────────────────────────────

/**
 * Counts what an export will contain, using the same rules as exportCSV /
 * exportFolder: labelled + not flagged go to label rows; flagged images go to
 * the 'flagged' folder (folder export only).
 */
function exportSummary(group, items, type) {
  const counts = new Map();
  let flagged = 0;
  for (const item of items) {
    const lbl = item.labels[group.id];
    if (lbl && !item.flagged) counts.set(lbl, (counts.get(lbl) ?? 0) + 1);
    else if (item.flagged && type === 'folder') flagged++;
  }
  const rows = [...counts]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => a.label.localeCompare(b.label));
  const total = rows.reduce((s, r) => s + r.count, 0) + flagged;
  return { total, rows, flagged };
}

function zipName(groupName) {
  const safe = groupName.replace(/\s+/g, '_').replace(/[^A-Za-z0-9_-]/g, '');
  return `TAG-Export-${safe}-${Date.now()}.zip`;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function exportCSV(group, items) {
  const rows = ['filename,label'];
  for (const item of items) {
    const lbl = item.labels[group.id];
    if (lbl && !item.flagged) rows.push(`${item.file},${lbl}`);
  }
  const csvContent = rows.join('\n');
  const zip = new JSZip();
  zip.file(`${group.name.replace(/\s+/g, '_')}_labels.csv`, csvContent);
  const blob = await zip.generateAsync({ type: 'blob' });
  downloadBlob(blob, zipName(group.name));
}

async function exportFolder(group, items) {
  const zip = new JSZip();
  const used = new Set();   // zip paths already taken, to avoid overwriting same-named files
  const missing = [];

  // Add under folder/name, appending _2, _3... if the name is already taken
  const addUnique = (folder, name, blob) => {
    const dot = name.lastIndexOf('.');
    const stem = dot > 0 ? name.slice(0, dot) : name;
    const ext  = dot > 0 ? name.slice(dot) : '';
    let candidate = name;
    for (let n = 2; used.has(`${folder}/${candidate}`); n++) candidate = `${stem}_${n}${ext}`;
    used.add(`${folder}/${candidate}`);
    zip.folder(folder).file(candidate, blob);
  };

  for (const item of items) {
    const lbl = item.labels[group.id];
    const wanted = item.flagged || lbl;
    if (!wanted) continue;
    try {
      // In-memory URL if available, otherwise fall back to the IndexedDB cache
      const blob = item.url
        ? await fetch(item.url).then(r => r.blob())
        : await loadBlob(item.key ?? item.file);
      if (!blob) { missing.push(item.file); continue; }
      if (item.flagged) {
        addUnique('flagged', item.file, blob);
      } else {
        addUnique(lbl.replace(/[<>:"/\\|?*]/g, '_'), item.file, blob);
      }
    } catch (e) {
      console.error(`Failed to add ${item.file}:`, e);
      missing.push(item.file);
    }
  }

  // Never silently drop images: list any that could not be exported
  if (missing.length) {
    zip.file('MISSING_IMAGES.txt',
      `These ${missing.length} labelled images could not be exported (image data not available). ` +
      `Re-import the original folder and export again.\n\n${missing.join('\n')}`);
  }
  const blob = await zip.generateAsync({ type: 'blob' });
  downloadBlob(blob, zipName(group.name));
  if (missing.length) {
    window.alert(`${missing.length} labelled image(s) could not be exported because their image data is unavailable. They are listed in MISSING_IMAGES.txt inside the zip. Re-import the original folder and export again.`);
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatRow({ label, value, color }) {
  return (
    <Stack direction="row" alignItems="center">
      <Typography variant="caption" sx={{ flex: 1, color: 'grey.600', fontSize: 11 }}>
        {label}
      </Typography>
      <Typography variant="caption" sx={{ color: color ?? 'grey.400', fontWeight: 600, fontSize: 12 }}>
        {value.toLocaleString()}
      </Typography>
    </Stack>
  );
}

function MiniBar({ pct, color }) {
  return (
    <Stack sx={{ height: 3, bgcolor: '#008080', borderRadius: 1, overflow: 'hidden' }}>
      <Stack sx={{ height: '100%', width: `${pct}%`, bgcolor: color, borderRadius: 1,
        transition: 'width 0.3s ease' }} />
    </Stack>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function StatsPanel({ items, groups, groupColors }) {
  const [pending, setPending] = useState(null);  // { type: 'folder' | 'csv', group }

  const totalLabelled = items.filter(it =>
    groups.length > 0 && groups.every(g => it.labels[g.id] || isGroupExcluded(it, g.id, groups))
  ).length;
  const totalFlagged = items.filter(it => it.flagged).length;

  return (
    <Stack
      sx={{
        width: 240,
        flexShrink: 0,
        height: '100vh',
        position: 'sticky',
        top: 0,
        overflowY: 'auto',
        borderRight: '1px solid',
        borderColor: '#008080',
        '&::-webkit-scrollbar': { width: 3 },
        '&::-webkit-scrollbar-thumb': { bgcolor: 'grey.800', borderRadius: 2 },
      }}
    >
      <Stack sx={{ p: 2, gap: 2.5 }}>

        {/* ── Overview ── */}
        <Stack gap={2}>
          <Typography variant="overline"
            sx={{ flex: 1, color: 'grey.300', fontSize: 10, letterSpacing: 1.2, lineHeight: 1 }}>
            Overview
          </Typography>
          <StatRow label="Total images" value={items.length} />
          <StatRow label="Fully labelled" value={totalLabelled} color="#5BC8AF" />
          <StatRow label="Unlabelled" value={items.length - totalLabelled} />
          <StatRow label="Flagged" value={totalFlagged} color="warning.main" />
        </Stack>

        {/* ── Per-group ── */}
        {groups.map((group, gi) => {
          const color = groupColors[gi % groupColors.length];
          const assigned = items.filter(it => it.labels[group.id] || isGroupExcluded(it, group.id, groups)).length;
          const pct = items.length ? Math.round((assigned / items.length) * 100) : 0;

          const distribution = [...group.labels]
            .sort((a, b) => a.localeCompare(b))
            .map(label => ({
              label,
              count: items.filter(it => it.labels[group.id] === label).length,
            }));

          return (
            <Stack key={group.id} gap={1.5}>
              <Divider sx={{ borderColor: 'grey.900' }} />

              {/* Group title + % */}
              <Stack direction="row" alignItems="center" gap={2}>
                <Stack sx={{ width: 8, height: 8, borderRadius: '2px', bgcolor: color, flexShrink: 0 }} />
                <Typography>&nbsp;</Typography>
                <Typography variant="overline"
                  sx={{ flex: 1, color: 'grey.300', fontSize: 10, letterSpacing: 1.2, lineHeight: 1 }}>
                  {group.name}
                </Typography>
                <Typography variant="caption" sx={{ color: 'grey.600', fontSize: 10 }}>
                  {pct}%
                </Typography>
              </Stack>

              <MiniBar pct={pct} color={color} />

              {/* Counts */}
              <Stack gap={1}>
                <StatRow label="Assigned" value={assigned} />
                <StatRow label="Remaining" value={items.length - assigned} />
              </Stack>

              {/* Label distribution */}
              <Stack gap={2}>
                {distribution.map(({ label, count }) => (
                  <Stack key={label} direction="row" alignItems="center" gap={1}>
                    <Typography variant="caption" sx={{
                      flex: 1, color: 'grey.600', fontSize: 11,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {label}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'grey.400', fontSize: 11, flexShrink: 0 }}>
                      {count.toLocaleString()}
                    </Typography>
                  </Stack>
                ))}
              </Stack>

              {/* Export buttons */}
              <Stack direction="row" gap={1}>
                <Button size="small" variant="outlined" onClick={() => setPending({ type: 'folder', group })}
                  sx={{ flex: 1, fontSize: 11, py: 0.5, textTransform: 'none',
                    borderColor: 'grey.800', color: 'grey.500',
                    '&:hover': { borderColor: 'grey.600', color: 'grey.200', bgcolor: 'transparent' } }}>
                  Folder
                </Button>
                <Button size="small" variant="outlined" onClick={() => setPending({ type: 'csv', group })}
                  sx={{ flex: 1, fontSize: 11, py: 0.5, textTransform: 'none',
                    borderColor: 'grey.800', color: 'grey.500',
                    '&:hover': { borderColor: 'grey.600', color: 'grey.200', bgcolor: 'transparent' } }}>
                  CSV
                </Button>
              </Stack>
            </Stack>
          );
        })}

      </Stack>

      {/* ── Version (from package.json) ── */}
      <Typography variant="caption"
        sx={{ mt: 'auto', px: 2, pb: 1.5, color: 'grey.700', fontSize: 10, letterSpacing: 0.5 }}>
        Version {version}
      </Typography>

      {/* ── Export confirmation ── */}
      <Dialog open={!!pending} onClose={() => setPending(null)} maxWidth="xs" fullWidth>
        {pending && (() => {
          const { total, rows, flagged } = exportSummary(pending.group, items, pending.type);
          return (
            <>
              <DialogTitle>
                Export {pending.type === 'folder' ? 'folders' : 'CSV'}: {pending.group.name}
              </DialogTitle>
              <DialogContent dividers>
                <Typography variant="body2" sx={{ mb: 1.5 }}>
                  <strong>{total.toLocaleString()}</strong> image{total === 1 ? '' : 's'} will be exported
                  {pending.type === 'csv' ? ' as CSV rows' : ''}.
                </Typography>
                <Stack gap={0.5}>
                  {rows.map(({ label, count }) => (
                    <Stack key={label} direction="row">
                      <Typography variant="body2" sx={{ flex: 1 }}>{label}</Typography>
                      <Typography variant="body2">{count.toLocaleString()}</Typography>
                    </Stack>
                  ))}
                  {pending.type === 'folder' && flagged > 0 && (
                    <Stack direction="row">
                      <Typography variant="body2" sx={{ flex: 1 }}>flagged</Typography>
                      <Typography variant="body2">{flagged.toLocaleString()}</Typography>
                    </Stack>
                  )}
                </Stack>
                {total === 0 && (
                  <Typography variant="body2" color="warning.main" sx={{ mt: 1.5 }}>
                    Nothing to export for this group yet.
                  </Typography>
                )}
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setPending(null)}>Cancel</Button>
                <Button
                  variant="contained"
                  disabled={total === 0}
                  onClick={() => {
                    const { type, group } = pending;
                    setPending(null);
                    (type === 'folder' ? exportFolder : exportCSV)(group, items);
                  }}
                >
                  Continue
                </Button>
              </DialogActions>
            </>
          );
        })()}
      </Dialog>
    </Stack>
  );
}
