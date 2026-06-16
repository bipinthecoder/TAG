import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import JSZip from "jszip";

// ── Export helpers ────────────────────────────────────────────────────────────

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
    if (lbl) rows.push(`${item.file},${lbl}`);
  }
  const csvContent = rows.join('\n');
  const zip = new JSZip();
  zip.file(`${group.name.replace(/\s+/g, '_')}_labels.csv`, csvContent);
  const blob = await zip.generateAsync({ type: 'blob' });
  downloadBlob(blob, zipName(group.name));
}

async function exportFolder(group, items) {
  const zip = new JSZip();
  for (const item of items) {
    const lbl = item.labels[group.id];
    if (!lbl || !item.url) continue;
    try {
      const blob = await fetch(item.url).then(r => r.blob());
      const safeLabel = lbl.replace(/[<>:"/\\|?*]/g, '_');
      zip.folder(safeLabel).file(item.file, blob);
    } catch (e) {
      console.error(`Failed to add ${item.file}:`, e);
    }
  }
  const blob = await zip.generateAsync({ type: 'blob' });
  downloadBlob(blob, zipName(group.name));
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
    <Stack sx={{ height: 3, bgcolor: 'grey.900', borderRadius: 1, overflow: 'hidden' }}>
      <Stack sx={{ height: '100%', width: `${pct}%`, bgcolor: color, borderRadius: 1,
        transition: 'width 0.3s ease' }} />
    </Stack>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function StatsPanel({ items, groups, groupColors }) {
  const totalLabelled = items.filter(it =>
    groups.length > 0 && groups.every(g => it.labels[g.id])
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
        borderColor: 'grey.900',
        '&::-webkit-scrollbar': { width: 3 },
        '&::-webkit-scrollbar-thumb': { bgcolor: 'grey.800', borderRadius: 2 },
      }}
    >
      <Stack sx={{ p: 2, gap: 2.5 }}>

        {/* ── Overview ── */}
        <Stack gap={1}>
          <Typography variant="overline" sx={{ color: 'grey.600', fontSize: 10, lineHeight: 1 }}>
            Overview
          </Typography>
          <StatRow label="Total images" value={items.length} />
          <StatRow label="Fully labelled" value={totalLabelled} color="#5BC8AF" />
          <StatRow label="Unlabelled" value={items.length - totalLabelled} />
          <StatRow label="Flagged" value={totalFlagged} color="#E07A7A" />
        </Stack>

        {/* ── Per-group ── */}
        {groups.map((group, gi) => {
          const color = groupColors[gi % groupColors.length];
          const assigned = items.filter(it => it.labels[group.id]).length;
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
              <Stack direction="row" alignItems="center" gap={1}>
                <Stack sx={{ width: 8, height: 8, borderRadius: '2px', bgcolor: color, flexShrink: 0 }} />
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
              <Stack gap={0.5}>
                <StatRow label="Assigned" value={assigned} />
                <StatRow label="Remaining" value={items.length - assigned} />
              </Stack>

              {/* Label distribution */}
              <Stack gap={0.5}>
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
                <Button size="small" variant="outlined" onClick={() => exportFolder(group, items)}
                  sx={{ flex: 1, fontSize: 11, py: 0.5, textTransform: 'none',
                    borderColor: 'grey.800', color: 'grey.500',
                    '&:hover': { borderColor: 'grey.600', color: 'grey.200', bgcolor: 'transparent' } }}>
                  Folder
                </Button>
                <Button size="small" variant="outlined" onClick={() => exportCSV(group, items)}
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
    </Stack>
  );
}
