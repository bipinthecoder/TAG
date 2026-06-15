import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

export default function Paddle({ direction, onClick, disabled }) {
    const Icon = direction === "prev" ? ChevronLeftIcon : ChevronRightIcon;
    return (
        <Button
            onClick={onClick}
            disabled={disabled}
            aria-label={direction === "prev" ? "Previous item" : "Next item"}
            sx={{
                width: 110,
                flexDirection: "column",
                gap: 1,
                borderRadius: 4,
                bgcolor: "background.paper",
                border: 1,
                borderColor: "grey.800",
                color: "grey.100",
                "&:hover": { bgcolor: "#262C35" },
                "&.Mui-disabled": { color: "grey.800" },
             }}
        >
            <Icon sx={{ fontSize: 56 }} />
            <Typography variant="caption" sx={{ fontFamily: "monospace", color: "grey.500" }}>
                {direction === "prev" ? "PREV ←" : "NEXT →"}
            </Typography>
        </Button>
    );
}