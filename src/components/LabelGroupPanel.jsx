import { useState } from "react";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Popover from "@mui/material/Popover";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";

export default function LabelGroupPanel({
    group, color, selectedLabel, suggestedLabel,
    allGroups, exclusions, onSetExclusion,
    onSelectLabel, onAddLabel, onRemoveLabel, onDeleteGroup,
}) {
    const [editOpen, setEditOpen] = useState(false);
    const [newLabel, setNewLabel] = useState("");
    const [dropdownAnchor, setDropdownAnchor] = useState(null);
    const [dropdownLabel, setDropdownLabel] = useState(null);
    const [hoveredLabel, setHoveredLabel] = useState(null);

    const otherGroups = (allGroups ?? []).filter(g => g.id !== group.id);

    const handleAdd = () => {
        const trimmed = newLabel.trim();
        if (!trimmed) return;
        onAddLabel(trimmed);
        setNewLabel("");
    };

    const openDropdown = (e, label) => {
        e.stopPropagation();
        setDropdownAnchor(e.currentTarget);
        setDropdownLabel(label);
    };

    const closeDropdown = () => {
        setDropdownAnchor(null);
        setDropdownLabel(null);
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

            {/* Numbered label chips — 5 per row */}
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 1 }}>
                {[...group.labels].sort((a, b) => a.localeCompare(b)).map((label, i) => {
                    const confirmed = selectedLabel === label;
                    const suggested = !confirmed && suggestedLabel === label;
                    const hasExclusions = otherGroups.length > 0 && (exclusions[label] ?? []).length > 0;
                    const arrowVisible = hoveredLabel === label || hasExclusions;
                    return (
                        <Tooltip key={label}
                            title={confirmed ? label : suggested ? `${label} (suggested)` : label}
                            placement="top" arrow disableInteractive>
                            <Stack
                                direction="row"
                                alignItems="center"
                                onMouseEnter={() => setHoveredLabel(label)}
                                onMouseLeave={() => setHoveredLabel(null)}
                                sx={{
                                    cursor: "pointer",
                                    borderRadius: "999px",
                                    border: "1px solid",
                                    borderStyle: suggested ? "dashed" : "solid",
                                    borderColor: confirmed ? color : suggested ? color : "grey.800",
                                    bgcolor: confirmed ? color : "transparent",
                                    overflow: "hidden",
                                    minWidth: 0,
                                    transition: "border-color 0.15s, background-color 0.15s",
                                    "&:hover": { borderColor: color },
                                }}
                            >
                                {/* Number badge */}
                                <Typography
                                    variant="caption"
                                    onClick={() => onSelectLabel(label)}
                                    sx={{
                                        px: 1, py: 0.4, flexShrink: 0,
                                        bgcolor: confirmed ? "rgba(0,0,0,0.25)" : suggested ? "rgba(255,255,255,0.04)" : "#1a1f27",
                                        color: confirmed ? "rgba(255,255,255,0.85)" : suggested ? color : "grey.600",
                                        fontFamily: "monospace", lineHeight: 1.6, minWidth: 20, textAlign: "center",
                                    }}
                                >
                                    {i + 1}
                                </Typography>
                                {/* Label text */}
                                <Typography
                                    variant="caption"
                                    onClick={() => onSelectLabel(label)}
                                    sx={{
                                        px: 1, py: 0.4, flex: 1,
                                        color: confirmed ? "#000" : suggested ? "grey.200" : "grey.300",
                                        lineHeight: 1.6,
                                        fontWeight: confirmed ? 600 : suggested ? 500 : 400,
                                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                    }}
                                >
                                    {label}
                                </Typography>
                                {/* Exclusion dropdown arrow — only when other groups exist */}
                                {otherGroups.length > 0 && (
                                    <Stack
                                        alignItems="center"
                                        justifyContent="center"
                                        onClick={(e) => openDropdown(e, label)}
                                        sx={{
                                            px: 0.5, flexShrink: 0,
                                            opacity: arrowVisible ? 1 : 0,
                                            transition: "opacity 0.15s",
                                            color: hasExclusions
                                                ? (confirmed ? "rgba(0,0,0,0.6)" : color)
                                                : (confirmed ? "rgba(0,0,0,0.4)" : "grey.600"),
                                            "&:hover": { color: confirmed ? "rgba(0,0,0,0.9)" : "#fff" },
                                        }}
                                    >
                                        <KeyboardArrowDownIcon sx={{ fontSize: 13 }} />
                                    </Stack>
                                )}
                            </Stack>
                        </Tooltip>
                    );
                })}
            </Box>

            {/* Exclusion popover */}
            <Popover
                open={Boolean(dropdownAnchor)}
                anchorEl={dropdownAnchor}
                onClose={closeDropdown}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
                transformOrigin={{ vertical: "top", horizontal: "center" }}
                PaperProps={{
                    sx: { bgcolor: "#1a1f27", border: "1px solid", borderColor: "grey.800", boxShadow: 6 },
                }}
            >
                <Stack sx={{ p: 1.5, gap: 0.25, minWidth: 200 }}>
                    <Typography variant="caption" sx={{ color: "grey.600", fontSize: 11, pb: 0.75 }}>
                        Require labelling when "{dropdownLabel}" is selected:
                    </Typography>
                    {dropdownLabel && otherGroups.map(og => {
                        const excluded = (exclusions[dropdownLabel] ?? []).includes(og.id);
                        return (
                            <FormControlLabel
                                key={og.id}
                                control={
                                    <Checkbox
                                        checked={!excluded}
                                        onChange={() => onSetExclusion(dropdownLabel, og.id, !excluded)}
                                        size="small"
                                        sx={{ color: "grey.700", "&.Mui-checked": { color } }}
                                    />
                                }
                                label={
                                    <Typography variant="caption" sx={{ color: "grey.300", fontSize: 12 }}>
                                        {og.name}
                                    </Typography>
                                }
                                sx={{ m: 0 }}
                            />
                        );
                    })}
                </Stack>
            </Popover>

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
                <DialogActions sx={{ justifyContent: "space-between" }}>
                    <Button
                        onClick={() => { onDeleteGroup(); setEditOpen(false); }}
                        sx={{ color: "#E07A7A", textTransform: "none" }}
                    >
                        Delete group
                    </Button>
                    <Button onClick={() => setEditOpen(false)}>Done</Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
}
