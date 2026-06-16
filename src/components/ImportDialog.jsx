import { useState, useRef } from "react";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import IconButton from "@mui/material/IconButton";
import Divider from "@mui/material/Divider";
import Chip from "@mui/material/Chip";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import CloseIcon from "@mui/icons-material/Close";
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

const IMAGE_RE = /\.(jpe?g|png|gif|webp|bmp|tiff?)$/i;

function CsvPreview({ rows }) {
  if (!rows.length) return null;
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

function LabelGrid({ labels }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 0.5 }}>
      {labels.map(l => (
        <Chip
          key={l}
          label={l}
          size="small"
          sx={{
            bgcolor: 'rgba(255,255,255,0.05)',
            color: 'grey.300',
            fontSize: 11,
            maxWidth: '100%',
            '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' },
          }}
        />
      ))}
    </Box>
  );
}

export default function ImportDialog({ open, onClose, onImport }) {
  const [imageFiles, setImageFiles] = useState([]);
  const [folderMode, setFolderMode] = useState(null);
  const [subfolderLabels, setSubfolderLabels] = useState([]);
  const [folderGroupName, setFolderGroupName] = useState('');
  const [csvEntries, setCsvEntries] = useState([]);

  const folderRef = useRef(null);
  const csvRef = useRef(null);
  const entryCSVRefs = useRef({});

  const reset = () => {
    setImageFiles([]);
    setFolderMode(null);
    setSubfolderLabels([]);
    setFolderGroupName('');
    setCsvEntries([]);
  };

  const handleFolderChange = (e) => {
    const imgs = Array.from(e.target.files).filter(f => IMAGE_RE.test(f.name));
    e.target.value = '';
    if (!imgs.length) return;

    const isStructured = imgs.some(f => f.webkitRelativePath.split('/').length >= 3);

    if (isStructured) {
      const subs = [...new Set(
        imgs.flatMap(f => {
          const p = f.webkitRelativePath.split('/');
          return p.length >= 3 ? [p[1]] : [];
        })
      )];
      setFolderMode('structured');
      setSubfolderLabels(subs);
      setImageFiles(imgs.map(f => {
        const p = f.webkitRelativePath.split('/');
        return { file: f, subfolder: p.length >= 3 ? p[1] : null };
      }));
    } else {
      setFolderMode('flat');
      setSubfolderLabels([]);
      setImageFiles(imgs.map(f => ({ file: f, subfolder: null })));
    }
  };

  const handleCSVChange = (e) => {
    const files = Array.from(e.target.files);
    e.target.value = '';
    Promise.all(
      files.map(file =>
        file.text().then(text => {
          const rows = parseCSV(text);
          const labels = [...new Set(rows.map(r => r.label))];
          return { id: crypto.randomUUID(), file, groupName: '', labels, rows };
        })
      )
    ).then(entries => setCsvEntries(prev => [...prev, ...entries]));
  };

  const handleEntryCSVChange = (entryId, e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    file.text().then(text => {
      const rows = parseCSV(text);
      const labels = [...new Set(rows.map(r => r.label))];
      setCsvEntries(prev => prev.map(c =>
        c.id === entryId ? { ...c, file, labels, rows } : c
      ));
    });
  };

  const needsFolderGroup = folderMode === 'structured' && !folderGroupName.trim();
  const needsCSVGroup = csvEntries.some(e => !e.groupName.trim());
  const canImport = imageFiles.length > 0 && !needsFolderGroup && !needsCSVGroup;

  const handleImport = () => {
    if (!canImport) return;

    const items = imageFiles.map((img, i) => ({
      id: i + 1,
      file: img.file.name,
      url: URL.createObjectURL(img.file),
      labels: {},
      suggestedLabels: {},  // pre-imports go here; user must confirm
      flagged: false,
      _sub: img.subfolder,
    }));

    const groups = [];

    if (folderMode === 'structured') {
      const gid = crypto.randomUUID();
      groups.push({ id: gid, name: folderGroupName.trim(), labels: subfolderLabels });
      items.forEach(it => { if (it._sub) it.suggestedLabels[gid] = it._sub; });
    }

    for (const csv of csvEntries) {
      const gid = crypto.randomUUID();
      groups.push({ id: gid, name: csv.groupName.trim(), labels: csv.labels });
      const labelMap = new Map(csv.rows.map(r => [r.filename, r.label]));
      items.forEach(it => {
        const lbl = labelMap.get(it.file);
        if (lbl && csv.labels.includes(lbl)) it.suggestedLabels[gid] = lbl;
      });
    }

    items.forEach(it => delete it._sub);
    onImport({ items, groups });
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>Import Dataset</DialogTitle>

      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: '8px !important' }}>

        {/* ── IMAGE FOLDER ── */}
        <Stack gap={1.5}>
          <Typography variant="overline" sx={{ color: 'grey.600', lineHeight: 1, fontSize: 10 }}>
            Image Folder
          </Typography>

          <input ref={folderRef} type="file" webkitdirectory="" directory=""
            style={{ display: 'none' }} onChange={handleFolderChange} />

          <Stack direction="row" alignItems="center" gap={1.5}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<FolderOpenIcon />}
              onClick={() => folderRef.current?.click()}
              sx={{ flexShrink: 0, borderColor: 'grey.700', color: 'grey.300',
                '&:hover': { borderColor: 'grey.500', bgcolor: 'transparent' } }}
            >
              {imageFiles.length > 0 ? 'Change folder' : 'Select folder'}
            </Button>

            {imageFiles.length > 0 && (
              <Stack direction="row" alignItems="center" gap={0.75}>
                <CheckCircleIcon sx={{ fontSize: 14, color: '#5BC8AF' }} />
                <Typography variant="body2" sx={{ color: '#5BC8AF', fontWeight: 600 }}>
                  {imageFiles.length.toLocaleString()} images
                </Typography>
                <Typography variant="caption" sx={{ color: 'grey.600' }}>
                  · {folderMode === 'structured' ? 'structured' : 'flat'}
                </Typography>
              </Stack>
            )}
          </Stack>

          {folderMode === 'structured' && (
            <Stack gap={2}>
              <LabelGrid labels={subfolderLabels} />
              <TextField
                size="small"
                required
                label="Group name for these labels"
                placeholder="e.g. Material"
                value={folderGroupName}
                onChange={e => setFolderGroupName(e.target.value)}
              />
            </Stack>
          )}
        </Stack>

        <Divider sx={{ borderColor: 'grey.800' }} />

        {/* ── CSV FILES ── */}
        <Stack gap={1.5}>
          {/* Section header */}
          <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
            <Stack gap={0.5}>
              <Typography variant="overline" sx={{ color: 'grey.600', lineHeight: 1, fontSize: 10 }}>
                Label CSV Files
              </Typography>
              <Typography variant="caption" sx={{ color: 'grey.700', lineHeight: 1 }}>
                optional · first row is skipped as header · columns: filename, label
              </Typography>
            </Stack>
            <input ref={csvRef} type="file" accept=".csv" multiple
              style={{ display: 'none' }} onChange={handleCSVChange} />
            <Button
              variant="text"
              size="small"
              startIcon={<UploadFileIcon sx={{ fontSize: 14 }} />}
              onClick={() => csvRef.current?.click()}
              sx={{ color: 'grey.500', textTransform: 'none', flexShrink: 0,
                '&:hover': { color: 'grey.300', bgcolor: 'transparent' } }}
            >
              Add CSV
            </Button>
          </Stack>

          {/* CSV entries */}
          {csvEntries.map(entry => (
            <Stack key={entry.id} gap={1.5} sx={{ p: 1.5, borderRadius: 2,
              border: '1px solid', borderColor: 'grey.800' }}>

              {/* File row */}
              <Stack direction="row" alignItems="center" gap={1}>
                <Typography variant="caption" sx={{ flex: 1, fontFamily: 'monospace',
                  color: 'grey.500', fontSize: 11,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {entry.file.name}
                </Typography>
                <Typography variant="caption" sx={{ color: 'grey.700', flexShrink: 0 }}>
                  {entry.rows.length} rows
                </Typography>
                {/* Re-import this entry */}
                <input
                  type="file" accept=".csv" style={{ display: 'none' }}
                  ref={el => { entryCSVRefs.current[entry.id] = el; }}
                  onChange={e => handleEntryCSVChange(entry.id, e)}
                />
                <Button size="small" onClick={() => entryCSVRefs.current[entry.id]?.click()}
                  sx={{ color: 'grey.600', textTransform: 'none', fontSize: 11, minWidth: 0, px: 0.75,
                    '&:hover': { color: 'grey.300', bgcolor: 'transparent' } }}>
                  Re-import
                </Button>
                <IconButton size="small"
                  onClick={() => setCsvEntries(p => p.filter(e => e.id !== entry.id))}
                  sx={{ color: 'grey.700', p: 0.25 }}>
                  <CloseIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Stack>

              {/* 5-row preview */}
              <CsvPreview rows={entry.rows} />

              <TextField
                size="small"
                required
                label="Group name"
                placeholder="e.g. Semantic"
                value={entry.groupName}
                onChange={e => setCsvEntries(p =>
                  p.map(c => c.id === entry.id ? { ...c, groupName: e.target.value } : c)
                )}
              />

              <LabelGrid labels={entry.labels} />
            </Stack>
          ))}
        </Stack>

      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ color: 'grey.600' }}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleImport}
          disabled={!canImport}
          sx={{ bgcolor: '#5BC8AF', color: '#000', '&:hover': { bgcolor: '#4ab89f' },
            '&.Mui-disabled': { bgcolor: 'rgba(255,255,255,0.08)', color: 'grey.600' } }}
        >
          Import{imageFiles.length > 0 ? ` ${imageFiles.length.toLocaleString()} images` : ''}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
