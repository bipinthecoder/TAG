import { useState } from "react";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";

export default function LabelGroupPanel({ group, color, selectedLabel, onSelectLabel, onAddLabel, onRemoveLabel }) {
    const [editOpen, setEditOpen] = useState(false);
    const [newLabel, setNewLabel] = useState("");

    const handleAdd = () => {
        const trimmed = newLabel.trim();
        if (!trimmed) return;
        onAddLabel(trimmed);
        setNewLabel("");
    };

    return (
        <Paper sx={{ p: 2, maxWidth: 760, width: "100%", mx: "auto" }}>
            {/* Header row */}
            <Stack direction="row" sx={{ alignItems: "center", gap: 1, mb: 1.5 }}>
                <Stack sx={{ width: 10, height: 10, borderRadius: "3px", bgcolor: color, flexShrink: 0 }} />
                <Typography variant="overline" sx={{ color: "grey.300", flex: 1, letterSpacing: 1.5 }}>
                    {group.name}
                </Typography>
                <Button
                    size="small"
                    onClick={() => setEditOpen(true)}
                    sx={{ color: "grey.500", minWidth: 0, px: 1, fontSize: 12, textTransform: "none" }}
                >
                    Edit
                </Button>
            </Stack>

            {/* Numbered label chips */}
            <Stack direction="row" flexWrap="wrap" gap={1}>
                {group.labels.map((label, i) => {
                    const selected = selectedLabel === label;
                    return (
                        <Stack
                            key={label}
                            direction="row"
                            alignItems="center"
                            onClick={() => onSelectLabel(label)}
                            sx={{
                                cursor: "pointer",
                                borderRadius: "999px",
                                border: "1px solid",
                                borderColor: selected ? color : "grey.800",
                                bgcolor: selected ? color : "transparent",
                                overflow: "hidden",
                                transition: "border-color 0.15s",
                                "&:hover": { borderColor: color },
                            }}
                        >
                            <Typography
                                variant="caption"
                                sx={{
                                    px: 1,
                                    py: 0.4,
                                    bgcolor: selected ? "rgba(0,0,0,0.25)" : "#1a1f27",
                                    color: selected ? "rgba(255,255,255,0.85)" : "grey.600",
                                    fontFamily: "monospace",
                                    lineHeight: 1.6,
                                    minWidth: 20,
                                    textAlign: "center",
                                }}
                            >
                                {i + 1}
                            </Typography>
                            <Typography
                                variant="caption"
                                sx={{
                                    px: 1.5,
                                    py: 0.4,
                                    color: selected ? "#000" : "grey.300",
                                    lineHeight: 1.6,
                                    fontWeight: selected ? 600 : 400,
                                }}
                            >
                                {label}
                            </Typography>
                        </Stack>
                    );
                })}
            </Stack>

            {/* Edit dialog */}
            <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ pb: 1 }}>Edit "{group.name}" labels</DialogTitle>
                <DialogContent>
                    <Stack gap={0.5} sx={{ mt: 0.5 }}>
                        {group.labels.map((label) => (
                            <Stack key={label} direction="row" alignItems="center" gap={1}
                                sx={{ py: 0.5, borderBottom: "1px solid", borderColor: "grey.800" }}
                            >
                                <Typography sx={{ flex: 1, fontSize: 14 }}>{label}</Typography>
                                <IconButton size="small" onClick={() => onRemoveLabel(label)} sx={{ color: "grey.600" }}>
                                    <CloseIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                            </Stack>
                        ))}
                    </Stack>
                    <Stack direction="row" gap={1} sx={{ mt: 2 }}>
                        <TextField
                            size="small"
                            placeholder="New label…"
                            value={newLabel}
                            onChange={(e) => setNewLabel(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
                            sx={{ flex: 1 }}
                            autoFocus
                        />
                        <Button variant="outlined" onClick={handleAdd} sx={{ borderColor: color, color }}>
                            Add
                        </Button>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditOpen(false)}>Done</Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
}
