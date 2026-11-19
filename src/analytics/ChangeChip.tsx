import Chip from "@mui/material/Chip";
import { formatChange } from "./range";

/** The percent change, green up and red down; nothing when unknown. */
export function ChangeChip({ change }: { change: number | null }) {
  const text = formatChange(change);
  if (text === null || change === null) return null;
  return (
    <Chip
      size="small"
      label={text}
      color={change < 0 ? "error" : change > 0 ? "success" : "default"}
      variant="outlined"
      sx={{ fontWeight: 600 }}
    />
  );
}
